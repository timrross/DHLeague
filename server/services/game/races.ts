import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { raceResults, races } from "@shared/schema";
import type { ResultStatus } from "./config";

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
  let query = db.select().from(races);

  if (seasonId !== undefined) {
    query = query.where(eq(races.seasonId, seasonId));
  }

  return await query.orderBy(asc(races.startDate));
}

export async function upsertRaceResults(input: UpsertRaceResultsInput) {
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [race] = await tx
      .select()
      .from(races)
      .where(eq(races.id, input.raceId));

    if (!race) {
      throw new Error(`Race ${input.raceId} not found`);
    }

    for (const result of input.results) {
      const rawStatus = String(result.status ?? "").toUpperCase();
      const status = (["FIN", "DNF", "DNS", "DSQ"].includes(rawStatus)
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
