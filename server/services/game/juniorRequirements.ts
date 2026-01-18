import { and, eq } from "drizzle-orm";
import { raceSnapshots, teams } from "@shared/schema";
import { db } from "../../db";
import { FEATURES } from "../features";

type JuniorRequirementInput = {
  seasonId?: number;
  raceId?: number;
};

export async function shouldRequireJuniorResults(
  input: JuniorRequirementInput,
): Promise<boolean> {
  if (!FEATURES.JUNIOR_TEAM_ENABLED) {
    return false;
  }

  if (input.raceId !== undefined) {
    const snapshot = await db
      .select({ id: raceSnapshots.id })
      .from(raceSnapshots)
      .where(
        and(
          eq(raceSnapshots.raceId, input.raceId),
          eq(raceSnapshots.teamType, "JUNIOR"),
        ),
      )
      .limit(1);
    if (snapshot.length > 0) {
      return true;
    }
  }

  if (input.seasonId !== undefined) {
    const team = await db
      .select({ id: teams.id })
      .from(teams)
      .where(
        and(
          eq(teams.seasonId, input.seasonId),
          eq(teams.teamType, "junior"),
        ),
      )
      .limit(1);
    if (team.length > 0) {
      return true;
    }
  }

  return false;
}
