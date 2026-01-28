import { Response } from "express";
import { storage } from "../storage";
import { FEATURES } from "../services/features";
import { getEditingWindow } from "../services/game/editingWindow";
import { getActiveSeasonId } from "../services/game/seasons";
import { getTeamPerformance } from "../services/game/teamPerformance";
import { countTransfers } from "../services/game/transfers";
import { useJokerCardForTeam } from "../services/game/joker";

/**
 * Check if a team name is available
 */
export async function checkTeamNameAvailability(req: any, res: Response) {
  try {
    const { name } = req.query;
    const excludeTeamId = req.query.excludeTeamId ? Number(req.query.excludeTeamId) : undefined;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "Team name is required" });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return res.json({ available: false, reason: "Team name must be at least 3 characters" });
    }

    if (trimmedName.length > 50) {
      return res.json({ available: false, reason: "Team name must be 50 characters or less" });
    }

    const isAvailable = await storage.isTeamNameAvailable(trimmedName, excludeTeamId);

    if (isAvailable) {
      return res.json({ available: true });
    } else {
      return res.json({ available: false, reason: "This team name is already taken" });
    }
  } catch (error) {
    console.error("Error checking team name availability:", error);
    res.status(500).json({ message: "Failed to check team name availability" });
  }
}

/**
 * Get a user's team
 */
export async function getUserTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const teamType = req.query.teamType === "junior" ? "junior" : "elite";
    if (teamType === "junior" && !FEATURES.JUNIOR_TEAM_ENABLED) {
      return res.status(404).json({ message: "Junior team is disabled" });
    }
    const team = await storage.getUserTeam(userId, teamType);
    res.json(team || null);
  } catch (error) {
    console.error("Error fetching user team:", error);
    res.status(500).json({ message: "Failed to fetch user team" });
  }
}

/**
 * Get a user's team performance for the active season.
 */
export async function getUserTeamPerformance(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const teamType = req.query.teamType === "junior" ? "junior" : "elite";
    const performance = await getTeamPerformance(userId, teamType);
    res.json(performance);
  } catch (error) {
    console.error("Error fetching user team performance:", error);
    res.status(500).json({ message: "Failed to fetch team performance" });
  }
}

/**
 * Create a new team
 */
export async function createTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const {
      name,
      riderIds,
      useJokerCard = false,
      teamType,
      benchRiderId,
    } = req.body;
    const normalizedTeamType = teamType === "junior" ? "junior" : "elite";
    if (normalizedTeamType === "junior" && !FEATURES.JUNIOR_TEAM_ENABLED) {
      return res.status(404).json({ message: "Junior team is disabled" });
    }

    if (!name || !riderIds || !Array.isArray(riderIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    let parsedBenchRiderId: number | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body, "benchRiderId")) {
      if (benchRiderId === null) {
        parsedBenchRiderId = null;
      } else {
        const parsed = Number(benchRiderId);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ message: "Invalid bench rider ID" });
        }
        parsedBenchRiderId = parsed;
      }
    }

    const seasonId = await getActiveSeasonId();
    const editingWindow = await getEditingWindow(seasonId);
    if (!editingWindow.editingOpen || !editingWindow.nextRace) {
      return res.status(400).json({
        message: "Team is locked for the upcoming race.",
      });
    }

    if (useJokerCard) {
      return res.status(400).json({
        message: "Use the joker card endpoint before rebuilding your team.",
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user.jokerActiveRaceId &&
      user.jokerActiveRaceId !== editingWindow.nextRace.id
    ) {
      await storage.updateUser(userId, {
        jokerActiveRaceId: null,
        jokerActiveTeamType: null,
      });
    }

    // Check if user already has a team
    const existingTeam = await storage.getUserTeam(userId, normalizedTeamType);
    if (existingTeam) {
      return res.status(400).json({
        message: `You already have a ${normalizedTeamType} team. Update your existing team instead.`,
      });
    }

    // Create the team
    const budgetCap = normalizedTeamType === "junior" ? 500000 : 2000000;
    const teamData = {
      name,
      userId,
      teamType: normalizedTeamType,
      seasonId,
      budgetCap,
      swapsUsed: 0,
      swapsRemaining: 2,
      currentRaceId: editingWindow.nextRace.id,
      isLocked: false,
      totalPoints: 0
    };

    const team = await storage.createTeam(
      teamData,
      riderIds,
      parsedBenchRiderId ?? null,
    );

    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ 
      message: "Failed to create team",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update an existing team
 */
export async function updateTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const teamId = Number(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    // Check if team exists and belongs to the user
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this team" });
    }

    if (team.teamType === "junior" && !FEATURES.JUNIOR_TEAM_ENABLED) {
      return res.status(404).json({ message: "Junior team is disabled" });
    }

    const editingWindow = await getEditingWindow(team.seasonId);
    if (!editingWindow.editingOpen || !editingWindow.nextRace) {
      return res.status(400).json({
        message: "Team is locked for the upcoming race.",
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user.jokerActiveRaceId &&
      user.jokerActiveRaceId !== editingWindow.nextRace.id
    ) {
      await storage.updateUser(userId, {
        jokerActiveRaceId: null,
        jokerActiveTeamType: null,
      });
    }

    const jokerActive =
      user.jokerActiveRaceId === editingWindow.nextRace.id &&
      user.jokerActiveTeamType === team.teamType;

    const { name, riderIds, benchRiderId } = req.body;
    if (!name || !riderIds || !Array.isArray(riderIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    let parsedBenchRiderId: number | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body, "benchRiderId")) {
      if (benchRiderId === null) {
        parsedBenchRiderId = null;
      } else {
        const parsed = Number(benchRiderId);
        if (Number.isNaN(parsed)) {
          return res.status(400).json({ message: "Invalid bench rider ID" });
        }
        parsedBenchRiderId = parsed;
      }
    }

    const existingRoster = await storage.getTeamWithRiders(teamId);
    if (!existingRoster) {
      return res.status(404).json({ message: "Team not found" });
    }

    const transferWindowRaceId = editingWindow.nextRace.id;
    const windowChanged = team.currentRaceId !== transferWindowRaceId;
    const priorTransfersUsed = windowChanged ? 0 : team.swapsUsed ?? 0;

    const transferCount = countTransfers(
      {
        starters: existingRoster.riders.map((rider) => rider.id),
        benchId: existingRoster.benchRider?.id ?? null,
      },
      {
        starters: riderIds,
        benchId: parsedBenchRiderId ?? null,
      },
    );

    const enforceTransfers = editingWindow.hasSettledRounds && !jokerActive;
    if (enforceTransfers && priorTransfersUsed + transferCount > 2) {
      return res.status(400).json({
        message: "No transfers remaining for this round.",
      });
    }

    const nextTransfersUsed = enforceTransfers
      ? priorTransfersUsed + transferCount
      : 0;
    const nextTransfersRemaining = enforceTransfers
      ? Math.max(0, 2 - nextTransfersUsed)
      : 2;

    // Update the team
    const updatedTeam = await storage.updateTeam(
      teamId,
      {
        name,
        swapsUsed: nextTransfersUsed,
        swapsRemaining: nextTransfersRemaining,
        currentRaceId: transferWindowRaceId,
      },
      riderIds,
      parsedBenchRiderId,
    );
    res.json(updatedTeam);
  } catch (error) {
    console.error("Error updating team:", error);
    res.status(500).json({
      message: "Failed to update team",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Use joker card to reset an existing team
 */
export async function useJokerCard(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const teamId = Number(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    const result = await useJokerCardForTeam(userId, teamId);
    res.json(result);
  } catch (error) {
    console.error("Error using joker card:", error);
    res.status(500).json({
      message: "Failed to use joker card",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete a team
 */
export async function deleteTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const teamId = Number(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    // Check if team exists and belongs to the user
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this team" });
    }

    // Delete the team
    const deleted = await storage.deleteTeam(teamId);
    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete team" });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({
      message: "Failed to delete team",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Swap a rider in a team
 *
 * @deprecated This endpoint is intentionally disabled. The game uses a transfer-based
 * system where users can make up to 2 transfers per round before the race locks.
 * Mid-race swaps are not supported. Use PUT /api/game/teams/:seasonId/:teamType
 * to update your roster before the lock deadline.
 */
export async function swapTeamRider(req: any, res: Response) {
  const userId = req.oidc?.user?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  return res.status(400).json({
    message: "Swaps are not supported. Use transfers before lock.",
  });
}
