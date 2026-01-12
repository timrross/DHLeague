import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  raceResultSets,
  raceResults,
  raceScores,
  raceSnapshots,
  races,
} from "@shared/schema";
import { GAME_VERSION, type ResultStatus } from "./config";
import { hashPayload } from "./hashing";
import { scoreTeamSnapshot } from "./scoring/scoreTeamSnapshot";

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
      throw new Error(`Race ${raceId} not found`);
    }

    const status = race.gameStatus;
    const canSettle =
      status === "final" ||
      status === "settled" ||
      (allowProvisional && status === "provisional");

    if (!canSettle) {
      throw new Error(`Race ${raceId} status ${status} is not ready to settle`);
    }

    const resultRows = await tx
      .select()
      .from(raceResults)
      .where(eq(raceResults.raceId, raceId));

    const sortedResults = [...resultRows]
      .map((row) => ({
        uciId: row.uciId,
        status: row.status as ResultStatus,
        position: row.position ?? null,
        qualificationPosition: row.qualificationPosition ?? null,
      }))
      .sort((a, b) => a.uciId.localeCompare(b.uciId));

    const resultsHash = hashPayload(buildResultsPayload(raceId, sortedResults));
    const now = new Date();

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

    const existingScores = await tx
      .select()
      .from(raceScores)
      .where(eq(raceScores.raceId, raceId));
    const scoresByKey = new Map(
      existingScores.map((score) => [`${score.userId}:${score.teamType}`, score]),
    );

    let updatedScores = 0;

    for (const snapshot of snapshots) {
      const starters = (snapshot.startersJson as Array<{ uciId: string; gender: "male" | "female" }>) ?? [];
      const bench = (snapshot.benchJson as { uciId: string; gender: "male" | "female" } | null) ?? null;

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

    await tx
      .update(races)
      .set({ gameStatus: "settled", needsResettle: false })
      .where(eq(races.id, raceId));

    return { raceId, resultsHash, updatedScores };
  });
}
