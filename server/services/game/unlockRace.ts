import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  raceResultSets,
  raceScores,
  raceSnapshots,
  races,
} from "@shared/schema";

export type UnlockRaceOptions = {
  force?: boolean;
};

export type UnlockRaceResult = {
  raceId: number;
  previousStatus: string;
  removedSnapshots: number;
  removedScores: number;
  removedResultSets: number;
};

export async function unlockRace(
  raceId: number,
  options: UnlockRaceOptions = {},
): Promise<UnlockRaceResult> {
  const { force = false } = options;

  return await db.transaction(async (tx) => {
    const [race] = await tx.select().from(races).where(eq(races.id, raceId));
    if (!race) {
      throw new Error(`Race ${raceId} not found`);
    }

    const previousStatus = race.gameStatus;
    const needsForce = ["provisional", "final", "settled"].includes(
      previousStatus,
    );

    if (needsForce && !force) {
      throw new Error(
        `Race ${raceId} is ${previousStatus}; use force to unlock`,
      );
    }

    const removedSnapshots = (
      await tx
        .delete(raceSnapshots)
        .where(eq(raceSnapshots.raceId, raceId))
        .returning({ id: raceSnapshots.id })
    ).length;

    let removedScores = 0;
    let removedResultSets = 0;

    if (needsForce) {
      removedScores = (
        await tx
          .delete(raceScores)
          .where(eq(raceScores.raceId, raceId))
          .returning({ id: raceScores.id })
      ).length;
      removedResultSets = (
        await tx
          .delete(raceResultSets)
          .where(eq(raceResultSets.raceId, raceId))
          .returning({ raceId: raceResultSets.raceId })
      ).length;
    }

    await tx
      .update(races)
      .set({ gameStatus: "scheduled", needsResettle: false })
      .where(eq(races.id, raceId));

    return {
      raceId,
      previousStatus,
      removedSnapshots,
      removedScores,
      removedResultSets,
    };
  });
}
