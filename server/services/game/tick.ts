import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import { races } from "@shared/schema";
import { lockRace } from "./lockRace";
import { settleRace } from "./settleRace";
import { now as clockNow } from "../../utils/clock";

export type GameTickOptions = {
  allowProvisional?: boolean;
  forceLock?: boolean;
  forceSettle?: boolean;
};

export type GameTickOutcome = {
  now: Date;
  locked: Array<{
    raceId: number;
    lockedTeams: number;
    skippedTeams: number;
    lockAt: Date;
  }>;
  settled: Array<{
    raceId: number;
    resultsHash: string;
    updatedScores: number;
  }>;
  errors: Array<{
    raceId: number;
    stage: "lock" | "settle";
    message: string;
  }>;
};

export async function runGameTick(
  options: GameTickOptions = {},
): Promise<GameTickOutcome> {
  const now = clockNow();
  const locked: GameTickOutcome["locked"] = [];
  const settled: GameTickOutcome["settled"] = [];
  const errors: GameTickOutcome["errors"] = [];

  const lockCandidates = await db
    .select()
    .from(races)
    .where(and(eq(races.gameStatus, "scheduled"), lte(races.lockAt, now)));

  for (const race of lockCandidates) {
    try {
      const result = await lockRace(race.id, { force: options.forceLock });
      if (result.lockedTeams > 0 || result.skippedTeams > 0) {
        locked.push(result);
      }
    } catch (error) {
      errors.push({
        raceId: race.id,
        stage: "lock",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const statusFilter = options.allowProvisional
    ? ["final", "settled", "provisional"]
    : ["final", "settled"];
  const settleCandidates = await db
    .select()
    .from(races)
    .where(inArray(races.gameStatus, statusFilter));

  const settleTargets = settleCandidates.filter(
    (race) =>
      race.gameStatus === "final" ||
      race.needsResettle ||
      (options.allowProvisional && race.gameStatus === "provisional"),
  );

  for (const race of settleTargets) {
    try {
      const result = await settleRace(race.id, {
        force: options.forceSettle,
        allowProvisional: options.allowProvisional,
      });
      settled.push(result);
    } catch (error) {
      errors.push({
        raceId: race.id,
        stage: "settle",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { now, locked, settled, errors };
}
