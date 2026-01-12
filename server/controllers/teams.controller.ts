import { Response } from "express";
import { storage } from "../storage";
import { riderDataClient } from "../services/riderDataClient";
import { getActiveSeasonId } from "../services/game/seasons";
import { getTeamPerformance } from "../services/game/teamPerformance";

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

    // Check if user already has a team
    const existingTeam = await storage.getUserTeam(userId, normalizedTeamType);
    if (existingTeam && !useJokerCard) {
      return res.status(400).json({ 
        message: `You already have a ${normalizedTeamType} team. Update your existing team instead.` 
      });
    }

    if (existingTeam) {
      if (existingTeam.isLocked) {
        return res.status(400).json({
          message:
            "Team is locked for the upcoming race. Use the swap feature instead.",
        });
      }

      const updatedTeam = await storage.updateTeam(
        existingTeam.id,
        { name },
        riderIds,
        parsedBenchRiderId,
      );

      if (useJokerCard) {
        await storage.updateUser(userId, { jokerCardUsed: true });
      }

      return res.status(200).json(updatedTeam);
    }

    // Create the team
    const seasonId = await getActiveSeasonId();
    const budgetCap = normalizedTeamType === "junior" ? 500000 : 2000000;
    const teamData = {
      name,
      userId,
      teamType: normalizedTeamType,
      seasonId,
      budgetCap,
      swapsUsed: 0,
      isLocked: false,
      totalPoints: 0
    };

    const team = await storage.createTeam(
      teamData,
      riderIds,
      parsedBenchRiderId ?? null,
    );

    // If using joker card, update the user record
    if (useJokerCard) {
      await storage.updateUser(userId, { jokerCardUsed: true });
    }

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

    // Check if team is locked
    if (team.isLocked) {
      return res.status(400).json({ 
        message: "Team is locked for the upcoming race. Use the swap feature instead." 
      });
    }

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

    // Update the team
    const updatedTeam = await storage.updateTeam(
      teamId,
      { name },
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
 */
export async function swapTeamRider(req: any, res: Response) {
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
    const team = await storage.getTeamWithRiders(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this team" });
    }

    // Check if team is locked - we allow swaps when locked
    if (!team.isLocked) {
      return res.status(400).json({ 
        message: "Team is not locked. Update your team directly instead of using the swap feature." 
      });
    }

    // Check swaps remaining
    const currentSwapsUsed = team.swapsUsed || 0;
    if (currentSwapsUsed >= 2) {
      return res.status(400).json({ message: "No swaps remaining for this race" });
    }

    const { removedRiderId, addedRiderId } = req.body;
    if (!removedRiderId || !addedRiderId) {
      return res.status(400).json({ message: "Both removedRiderId and addedRiderId are required" });
    }

    // Check if removed rider is on the team
    if (!team.riders.some(r => r.id === removedRiderId)) {
      return res.status(400).json({ message: "Cannot remove a rider that is not on the team" });
    }

    // Get the rider being added
    const addedRider = await riderDataClient.getRider(addedRiderId);
    if (!addedRider) {
      return res.status(404).json({ message: "Added rider not found" });
    }

    const teamType = team.teamType === "junior" ? "junior" : "elite";
    if (addedRider.category !== teamType) {
      return res.status(400).json({
        message:
          teamType === "junior"
            ? "You can only add junior riders to your junior team"
            : "You can only add elite riders to your elite team",
      });
    }

    // Check if added rider is already on the team
    if (team.riders.some(r => r.id === addedRiderId)) {
      return res.status(400).json({ message: "Cannot add a rider that is already on the team" });
    }

    // Check team composition rules
    const removedRider = team.riders.find(r => r.id === removedRiderId);
    if (!removedRider) {
      return res.status(400).json({ message: "Removed rider not found on team" });
    }

    // Check gender balance
    const removingMale = removedRider.gender === "male";
    const addingMale = addedRider.gender === "male";
    const currentMaleCount = team.riders.filter(r => r.gender === "male").length;
    const currentFemaleCount = team.riders.filter(r => r.gender === "female").length;

    const newMaleCount =
      currentMaleCount - (removingMale ? 1 : 0) + (addingMale ? 1 : 0);
    const newFemaleCount =
      currentFemaleCount - (removingMale ? 0 : 1) + (addingMale ? 0 : 1);

    if (newMaleCount !== 4 || newFemaleCount !== 2) {
      return res
        .status(400)
        .json({ message: "Team must have exactly 4 male and 2 female riders" });
    }

    // Check budget
    const newTotalCost = team.totalCost - removedRider.cost + addedRider.cost;
    const budgetCap = team.budgetCap ?? 2000000;
    if (newTotalCost > budgetCap) {
      return res
        .status(400)
        .json({ message: `Swap would exceed the budget of ${budgetCap}` });
    }

    // Prepare new rider IDs list
    const newRiderIds = team.riders.map(r => r.id === removedRiderId ? addedRiderId : r.id);

    // Update the team with the new rider and increment swaps used
    const currentSwaps = team.swapsUsed || 0;
    const updatedTeam = await storage.updateTeam(
      teamId, 
      { swapsUsed: currentSwaps + 1 }, 
      newRiderIds
    );

    res.json(updatedTeam);
  } catch (error) {
    console.error("Error swapping team rider:", error);
    res.status(500).json({
      message: "Failed to swap team rider",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
