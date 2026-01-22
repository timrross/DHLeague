import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  raceResults,
  races,
  raceSnapshots,
  raceResultImports,
  raceResultSets,
  raceScores,
  riderCostUpdates,
  teamSwaps,
} from "@shared/schema";
import type { ResultStatus } from "./config";
import { assertRaceReadyForResults } from "./raceResultsValidation";
import { now as clockNow } from "../../utils/clock";

export type RaceResultInput = {
  uciId: string;
  status: ResultStatus;
  position?: number | null;
  qualificationPosition?: number | null;
};

export type UpsertRaceResultsInput = {
  raceId: number;
  results: RaceResultInput[];
  isFinal?: boolean;
};

export async function listRaces(seasonId?: number) {
  const baseQuery = db.select().from(races);

  if (seasonId !== undefined) {
    return await baseQuery
      .where(eq(races.seasonId, seasonId))
      .orderBy(asc(races.startDate));
  }

  return await baseQuery.orderBy(asc(races.startDate));
}

export async function upsertRaceResults(input: UpsertRaceResultsInput) {
  const now = clockNow();

  return await db.transaction(async (tx) => {
    const [race] = await tx
      .select()
      .from(races)
      .where(eq(races.id, input.raceId));

    if (!race) {
      throw new Error(`Race ${input.raceId} not found`);
    }
    assertRaceReadyForResults(race);

    for (const result of input.results) {
      const rawStatus = String(result.status ?? "").toUpperCase();
      const status = (["FIN", "DNF", "DNS", "DNQ", "DSQ"].includes(rawStatus)
        ? rawStatus
        : "DNS") as ResultStatus;
      await tx
        .insert(raceResults)
        .values({
          raceId: input.raceId,
          uciId: result.uciId,
          status,
          position: result.position ?? null,
          qualificationPosition: result.qualificationPosition ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [raceResults.raceId, raceResults.uciId],
          set: {
            status,
            position: result.position ?? null,
            qualificationPosition: result.qualificationPosition ?? null,
            updatedAt: now,
          },
        });
    }

    const nextStatus = input.isFinal ? "final" : "provisional";
    await tx
      .update(races)
      .set({
        gameStatus: nextStatus,
        needsResettle: race.gameStatus === "settled" ? true : race.needsResettle,
      })
      .where(eq(races.id, input.raceId));

    return { raceId: input.raceId, updated: input.results.length };
  });
}

export async function deleteRace(raceId: number) {
  return await db.transaction(async (tx) => {
    const [race] = await tx
      .select()
      .from(races)
      .where(eq(races.id, raceId));

    if (!race) {
      throw new Error(`Race ${raceId} not found`);
    }

    // Delete all dependent records first (order matters for foreign keys)
    await tx.delete(raceSnapshots).where(eq(raceSnapshots.raceId, raceId));
    await tx.delete(raceResults).where(eq(raceResults.raceId, raceId));
    await tx.delete(raceResultImports).where(eq(raceResultImports.raceId, raceId));
    await tx.delete(raceResultSets).where(eq(raceResultSets.raceId, raceId));
    await tx.delete(raceScores).where(eq(raceScores.raceId, raceId));
    await tx.delete(riderCostUpdates).where(eq(riderCostUpdates.raceId, raceId));
    await tx.delete(teamSwaps).where(eq(teamSwaps.raceId, raceId));

    // Now delete the race
    await tx.delete(races).where(eq(races.id, raceId));

    return { deleted: true, raceId, name: race.name };
  });
}
