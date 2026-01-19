import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  raceResultSets,
  raceResultImports,
  raceResults,
  raceScores,
  raceSnapshots,
  races,
} from "@shared/schema";
import { GAME_VERSION, type ResultStatus } from "./config";
import { hashPayload } from "./hashing";
import { scoreTeamSnapshot } from "./scoring/scoreTeamSnapshot";
import { UserFacingError } from "./errors";
import { getMissingFinalResultSets, resolveDisciplineCode } from "./resultImports";
import { shouldRequireJuniorResults } from "./juniorRequirements";
import { applyRiderCostUpdates } from "./costUpdates";
import { now as clockNow } from "../../utils/clock";

export type SettleRaceOptions = {
  force?: boolean;
  allowProvisional?: boolean;
};

const buildResultsPayload = (
  raceId: number,
  results: Array<{
    uciId: string;
    status: ResultStatus;
    position: number | null;
    qualificationPosition: number | null;
  }>,
) => ({
  gameVersion: GAME_VERSION,
  raceId,
  results,
});

export async function settleRace(
  raceId: number,
  options: SettleRaceOptions = {},
) {
  const { force = false, allowProvisional = false } = options;

  return await db.transaction(async (tx) => {
    const [race] = await tx.select().from(races).where(eq(races.id, raceId));

    if (!race) {
      throw new UserFacingError(`Race ${raceId} not found`, 404);
    }

    const discipline = resolveDisciplineCode(race.discipline, "DHI");
    const importRows = await tx
      .select()
      .from(raceResultImports)
      .where(
        and(
          eq(raceResultImports.raceId, raceId),
          eq(raceResultImports.discipline, discipline),
        ),
      );
    const includeJunior = await shouldRequireJuniorResults({
      raceId,
      seasonId: race.seasonId,
    });
    const missingFinalSets = getMissingFinalResultSets(importRows, {
      includeJunior,
    });
    if (missingFinalSets.length > 0) {
      throw new UserFacingError(
        `Race ${raceId} is missing final results for: ${missingFinalSets
          .map((set) => set.label)
          .join(", ")}`,
        400,
      );
    }

    const status = race.gameStatus;
    const canSettle =
      status === "final" ||
      status === "settled" ||
      (allowProvisional && status === "provisional");

    if (!canSettle) {
      throw new UserFacingError(
        `Race ${raceId} status "${status}" is not ready to settle`,
        400,
      );
    }

    const resultRows = await tx
      .select()
      .from(raceResults)
      .where(eq(raceResults.raceId, raceId));
    if (resultRows.length === 0) {
      throw new UserFacingError(
        `Race ${raceId} has no results loaded. Import results before settling.`,
        400,
      );
    }

    const sortedResults = [...resultRows]
      .map((row) => ({
        uciId: row.uciId,
        status: row.status as ResultStatus,
        position: row.position ?? null,
        qualificationPosition: row.qualificationPosition ?? null,
      }))
      .sort((a, b) => a.uciId.localeCompare(b.uciId));

    const resultsHash = hashPayload(buildResultsPayload(raceId, sortedResults));
    const now = clockNow();

    await tx
      .insert(raceResultSets)
      .values({
        raceId,
        resultsHash,
        isFinal: status === "final" || status === "settled",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: raceResultSets.raceId,
        set: {
          resultsHash,
          isFinal: status === "final" || status === "settled",
          updatedAt: now,
        },
      });

    const resultsByUciId = new Map(
      resultRows.map((row) => [row.uciId, {
        uciId: row.uciId,
        status: row.status as ResultStatus,
        position: row.position ?? null,
        qualificationPosition: row.qualificationPosition ?? null,
      }]),
    );

    const snapshots = await tx
      .select()
      .from(raceSnapshots)
      .where(eq(raceSnapshots.raceId, raceId));
    if (snapshots.length === 0) {
      throw new UserFacingError(
        `Race ${raceId} has no team snapshots. Lock the race before settling.`,
        400,
      );
    }

    const existingScores = await tx
      .select()
      .from(raceScores)
      .where(eq(raceScores.raceId, raceId));
    const scoresByKey = new Map(
      existingScores.map((score) => [`${score.userId}:${score.teamType}`, score]),
    );

    let updatedScores = 0;

    for (const snapshot of snapshots) {
      const starters =
        (snapshot.startersJson as Array<{
          uciId: string;
          gender: "male" | "female";
          costAtLock?: number | null;
        }>) ?? [];
      const bench =
        (snapshot.benchJson as {
          uciId: string;
          gender: "male" | "female";
          costAtLock?: number | null;
        } | null) ?? null;

      const scored = scoreTeamSnapshot({ starters, bench }, resultsByUciId);

      const key = `${snapshot.userId}:${snapshot.teamType}`;
      const existing = scoresByKey.get(key);

      if (
        existing &&
        !force &&
        existing.snapshotHashUsed === snapshot.snapshotHash &&
        existing.resultsHashUsed === resultsHash
      ) {
        continue;
      }

      const values = {
        raceId,
        userId: snapshot.userId,
        teamType: snapshot.teamType,
        totalPoints: scored.totalPoints,
        breakdownJson: scored.breakdown,
        snapshotHashUsed: snapshot.snapshotHash,
        resultsHashUsed: resultsHash,
        settledAt: now,
      };

      if (existing) {
        await tx
          .update(raceScores)
          .set(values)
          .where(
            and(
              eq(raceScores.raceId, raceId),
              eq(raceScores.userId, snapshot.userId),
              eq(raceScores.teamType, snapshot.teamType),
            ),
          );
      } else {
        await tx.insert(raceScores).values(values);
      }
      updatedScores += 1;
    }

    if (status === "final" || status === "settled") {
      await applyRiderCostUpdates(
        tx,
        raceId,
        resultsHash,
        resultRows.map((row) => ({
          uciId: row.uciId,
          status: row.status as ResultStatus,
          position: row.position ?? null,
        })),
        { force },
      );
    }

    await tx
      .update(races)
      .set({ gameStatus: "settled", needsResettle: false })
      .where(eq(races.id, raceId));

    return { raceId, resultsHash, updatedScores };
  });
}
