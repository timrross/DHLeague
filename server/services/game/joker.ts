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

  const deleted = await storage.deleteTeam(teamId);
  if (!deleted) {
    throw new UserFacingError("Failed to delete team", 500);
  }

  await storage.updateUser(userId, {
    jokerCardUsed: true,
    jokerActiveRaceId: editingWindow.nextRace.id,
    jokerActiveTeamType: team.teamType,
  });

  return {
    success: true,
    nextRaceId: editingWindow.nextRace.id,
    teamType: team.teamType,
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
