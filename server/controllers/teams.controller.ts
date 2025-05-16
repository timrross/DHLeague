import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Get a user's team
 */
export async function getUserTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const team = await storage.getUserTeam(userId);
    res.json(team || null);
  } catch (error) {
    console.error("Error fetching user team:", error);
    res.status(500).json({ message: "Failed to fetch user team" });
  }
}

/**
 * Create a new team
 */
export async function createTeam(req: any, res: Response) {
  try {
    // User ID is attached to the request by the auth middleware
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { name, riderIds, useJokerCard = false } = req.body;

    if (!name || !riderIds || !Array.isArray(riderIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Check if user already has a team
    const existingTeam = await storage.getUserTeam(userId);
    if (existingTeam && !useJokerCard) {
      return res.status(400).json({ 
        message: "You already have a team. Use the joker card to create a new team or update your existing team instead." 
      });
    }

    // Create the team
    const teamData = {
      name,
      userId,
      jokerCardUsed: useJokerCard,
      swapsUsed: 0,
      isLocked: false,
      totalPoints: 0
    };

    const team = await storage.createTeam(teamData, riderIds);

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
    const userId = req.user?.claims?.sub;
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

    const { name, riderIds } = req.body;
    if (!name || !riderIds || !Array.isArray(riderIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Update the team
    const updatedTeam = await storage.updateTeam(teamId, { name }, riderIds);
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
    const userId = req.user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
    const addedRider = await storage.getRider(addedRiderId);
    if (!addedRider) {
      return res.status(404).json({ message: "Added rider not found" });
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

    if (removingMale && !addingMale) {
      // Removing male, adding female - check if this would leave fewer than 2 male riders
      if (currentMaleCount - 1 < 2) {
        return res.status(400).json({ message: "Team must have at least 2 male riders" });
      }
      // Also check if this would exceed 4 female riders
      if (currentFemaleCount + 1 > 4) {
        return res.status(400).json({ message: "Team can have a maximum of 4 female riders" });
      }
    } else if (!removingMale && addingMale) {
      // Removing female, adding male - check if this would leave fewer than 2 female riders
      if (currentFemaleCount - 1 < 2) {
        return res.status(400).json({ message: "Team must have at least 2 female riders" });
      }
      // Also check if this would exceed 4 male riders
      if (currentMaleCount + 1 > 4) {
        return res.status(400).json({ message: "Team can have a maximum of 4 male riders" });
      }
    }

    // Check budget
    const newTotalCost = team.totalCost - removedRider.cost + addedRider.cost;
    if (newTotalCost > 2000000) {
      return res.status(400).json({ message: "Swap would exceed the budget of $2,000,000" });
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