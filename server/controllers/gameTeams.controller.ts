import { Response } from "express";
import { TeamRosterValidationError, getUserTeamsForSeason, upsertTeamRoster } from "../services/game/teams";
import { UserFacingError } from "../services/game/errors";

export async function getUserTeamsBySeason(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const seasonId = Number(req.params.seasonId);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }

    const teams = await getUserTeamsForSeason(userId, seasonId);
    res.json(teams);
  } catch (error) {
    console.error("Error fetching user teams for season:", error);
    res.status(500).json({ message: "Failed to fetch teams" });
  }
}

export async function upsertUserTeam(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const seasonId = Number(req.params.seasonId);
    if (Number.isNaN(seasonId)) {
      return res.status(400).json({ message: "Invalid season ID" });
    }

    const teamType = String(req.params.teamType || "");
    if (!/^(elite|junior)$/i.test(teamType)) {
      return res.status(400).json({ message: "Invalid team type" });
    }
    const { starters, bench = null, name } = req.body ?? {};

    if (!Array.isArray(starters)) {
      return res.status(400).json({ message: "starters must be an array" });
    }

    const roster = await upsertTeamRoster(userId, seasonId, teamType, {
      starters,
      bench,
      name,
    });

    res.status(200).json(roster);
  } catch (error) {
    if (error instanceof TeamRosterValidationError) {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    if (error instanceof UserFacingError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error upserting team roster:", error);
    res.status(500).json({ message: "Failed to update team" });
  }
}
