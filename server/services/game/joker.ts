import { eq } from "drizzle-orm";
import { teams, teamMembers, teamRiders, users } from "@shared/schema";
import { db } from "../../db";
import { storage } from "../../storage";
import { FEATURES } from "../features";
import { getEditingWindow } from "./editingWindow";
import { normalizeTeamType, toDbTeamType } from "./normalize";
import { UserFacingError } from "./errors";

export type UseJokerResult = {
  success: true;
  nextRaceId: number;
  teamType: string;
};

export async function useJokerCardForTeam(
  userId: string,
  teamId: number,
): Promise<UseJokerResult> {
  const team = await storage.getTeam(teamId);
  if (!team) {
    throw new UserFacingError("Team not found", 404);
  }

  if (team.userId !== userId) {
    throw new UserFacingError("Not authorized to reset this team", 403);
  }

  if (team.teamType === "junior" && !FEATURES.JUNIOR_TEAM_ENABLED) {
    throw new UserFacingError("Junior team is disabled", 404);
  }

  const editingWindow = await getEditingWindow(team.seasonId);
  if (!editingWindow.editingOpen || !editingWindow.nextRace) {
    throw new UserFacingError(
      "Joker can only be used between settlement and the next lock.",
      400,
    );
  }

  const user = await storage.getUser(userId);
  if (!user) {
    throw new UserFacingError("User not found", 404);
  }

  if (!editingWindow.hasSettledRounds) {
    throw new UserFacingError(
      "Joker can only be used after a round has settled.",
      400,
    );
  }

  if (user.jokerCardUsed) {
    throw new UserFacingError("Joker card already used", 400);
  }

  const nextRaceId = editingWindow.nextRace.id;
  const teamType = team.teamType;

  // Wrap roster clearing and user update in a single transaction
  // to prevent data loss if either operation fails
  await db.transaction(async (tx) => {
    // Clear team members (starters and bench)
    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));

    // Clear team-rider associations
    await tx.delete(teamRiders).where(eq(teamRiders.teamId, teamId));

    // Reset team swaps (joker grants unlimited changes)
    // Keep team record, name, and accumulated points
    await tx
      .update(teams)
      .set({
        swapsUsed: 0,
        swapsRemaining: 0, // Will be ignored during joker window
        currentRaceId: nextRaceId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));

    // Mark joker as used
    await tx
      .update(users)
      .set({
        jokerCardUsed: true,
        jokerActiveRaceId: nextRaceId,
        jokerActiveTeamType: teamType,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  return {
    success: true,
    nextRaceId,
    teamType,
  };
}

export async function useJokerCardForUser(
  userId: string,
  teamTypeInput: string,
  seasonId?: number,
): Promise<UseJokerResult> {
  const teamType = normalizeTeamType(teamTypeInput);
  const dbTeamType = toDbTeamType(teamType);
  const team = await storage.getUserTeam(userId, dbTeamType, seasonId);

  if (!team) {
    throw new UserFacingError("Team not found", 404);
  }

  return useJokerCardForTeam(userId, team.id);
}
