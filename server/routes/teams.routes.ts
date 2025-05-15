import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { z } from "zod";
import { insertTeamSchema, teams, teamRiders, teamSwaps, users } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Get user's team
router.get("/user", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.getUserTeam(userId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Check if team should be locked (1 day before race)
    const races = await storage.getRaces();
    const nextRace = races.find((race) => race.status === 'next');
    
    if (nextRace) {
      const oneDay = 24 * 60 * 60 * 1000;
      const lockDate = new Date(new Date(nextRace.startDate).getTime() - oneDay);
      
      // If we're past the lock date and the team is not already marked as locked
      if (new Date() >= lockDate && !team.isLocked) {
        // Lock the team for this race
        await storage.updateTeam(team.id, { 
          isLocked: true, 
          lockedAt: new Date(),
          currentRaceId: nextRace.id,
          swapsRemaining: 2 // Reset swap count for new race
        });
        
        // Get the updated team
        const updatedTeam = await storage.getUserTeam(userId);
        return res.json(updatedTeam);
      }
    }
    
    res.json(team);
  } catch (error) {
    console.error("Error fetching user team:", error);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});

// Team rider swap endpoint - only allowed when team is locked, limited to 2 swaps per race
router.post("/:id/swap", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const teamId = parseInt(req.params.id);
    
    // Validate request body
    if (!req.body.removedRiderId || !req.body.addedRiderId) {
      return res.status(400).json({ message: "Both removedRiderId and addedRiderId are required" });
    }
    
    const removedRiderId = parseInt(req.body.removedRiderId);
    const addedRiderId = parseInt(req.body.addedRiderId);
    
    // Get team and check ownership
    const team = await storage.getTeamWithRiders(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    if (team.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Check if team is locked (required for swaps)
    if (!team.isLocked) {
      return res.status(400).json({ 
        message: "Team is not locked. Swaps are only allowed during the locked period (1 day before race)." 
      });
    }
    
    // Check remaining swaps
    const swapsRemaining = team.swapsRemaining ?? 0;
    if (swapsRemaining <= 0) {
      return res.status(400).json({ 
        message: "No swaps remaining for this race. Each team is limited to 2 swaps per race." 
      });
    }
    
    // Check if the removed rider is on the team
    const removedRider = team.riders.find(r => r.id === removedRiderId);
    if (!removedRider) {
      return res.status(400).json({ message: "Rider to remove is not on your team" });
    }
    
    // Check if the added rider is already on the team
    const isAlreadyOnTeam = team.riders.some(r => r.id === addedRiderId);
    if (isAlreadyOnTeam) {
      return res.status(400).json({ message: "Rider to add is already on your team" });
    }
    
    // Get the rider to add
    const addedRider = await storage.getRider(addedRiderId);
    if (!addedRider) {
      return res.status(404).json({ message: "Rider to add not found" });
    }
    
    // Check gender balance
    const isRemovingMale = removedRider.gender === "male";
    const isAddingMale = addedRider.gender === "male";
    
    const maleRiders = team.riders.filter(r => r.gender === "male");
    const femaleRiders = team.riders.filter(r => r.gender === "female");
    
    if (isRemovingMale && !isAddingMale && femaleRiders.length >= 4) {
      return res.status(400).json({ 
        message: "Cannot add more female riders. Maximum 4 female riders allowed." 
      });
    }
    
    if (!isRemovingMale && isAddingMale && maleRiders.length >= 4) {
      return res.status(400).json({ 
        message: "Cannot add more male riders. Maximum 4 allowed." 
      });
    }
    
    // Check budget
    const currentCost = team.riders.reduce((total, r) => total + r.cost, 0);
    const newCost = currentCost - (removedRider?.cost || 0) + addedRider.cost;
    
    if (newCost > 2000000) {
      return res.status(400).json({ 
        message: "Swap exceeds budget limit of $2,000,000" 
      });
    }
    
    // Create a new array of riderIds with the swap applied
    const updatedRiderIds = team.riders
      .filter(r => r.id !== removedRiderId)
      .map(r => r.id);
    updatedRiderIds.push(addedRiderId);
    
    // Create a record of the swap
    const swapData = {
      teamId: team.id,
      raceId: team.currentRaceId || 0,
      removedRiderId,
      addedRiderId,
    };
    
    // Record the swap and update the team
    await db.transaction(async (tx) => {
      // Insert the swap record
      await tx.insert(teamSwaps).values(swapData);
      
      // Update the team with new riders and decrement remaining swaps
      await storage.updateTeam(
        team.id, 
        { swapsRemaining: swapsRemaining - 1 }, 
        updatedRiderIds
      );
    });
    
    // Get updated team
    const updatedTeam = await storage.getTeamWithRiders(teamId);
    res.json(updatedTeam);
  } catch (error) {
    console.error("Error swapping rider:", error);
    res.status(500).json({ 
      message: "Failed to swap rider",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Create team endpoint
router.post("/", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate team data
    const teamDataResult = insertTeamSchema.safeParse({
      ...req.body,
      userId,
      swapsRemaining: 2 // Initialize with 2 swaps per race
    });
    
    if (!teamDataResult.success) {
      return res.status(400).json({ 
        message: "Invalid team data", 
        errors: teamDataResult.error.errors 
      });
    }
    
    // Validate riders array
    const riderIdsSchema = z.array(z.number()).length(6);
    const riderIdsResult = riderIdsSchema.safeParse(req.body.riderIds);
    
    if (!riderIdsResult.success) {
      return res.status(400).json({ 
        message: "Invalid rider selection", 
        errors: riderIdsResult.error.errors 
      });
    }
    
    // Check if team name is already taken
    try {
      const [teamWithSameName] = await db.select().from(teams).where(eq(teams.name, teamDataResult.data.name));
      if (teamWithSameName) {
        return res.status(400).json({ 
          message: "Team name is already taken. Please choose a different name." 
        });
      }
    } catch (error) {
      console.error("Error checking team name uniqueness:", error);
      // Continue if there's an error checking the name
    }
    
    // Check if user already has a team
    const existingTeam = await storage.getUserTeam(userId);
    if (existingTeam) {
      // If user already has a team, check if this is a joker card usage
      if (req.body.useJokerCard === true) {
        // Check if user has already used their joker card
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        
        if (user && user.jokerCardUsed) {
          return res.status(400).json({ 
            message: "You have already used your joker card for this season." 
          });
        }
        
        // User is using their joker card - delete existing team and mark joker as used
        await db.transaction(async (tx) => {
          // Delete old team data
          await tx.delete(teamRiders).where(eq(teamRiders.teamId, existingTeam.id));
          await tx.delete(teams).where(eq(teams.id, existingTeam.id));
          
          // Mark joker card as used
          await tx.update(users)
            .set({ jokerCardUsed: true, updatedAt: new Date() })
            .where(eq(users.id, userId));
        });
        
        // Continue to create new team
      } else {
        return res.status(400).json({ 
          message: "You already have a team. Each user can only have one team. You can use your joker card to reset your team if you haven't used it yet." 
        });
      }
    }
    
    // Create team
    const team = await storage.createTeam(teamDataResult.data, riderIdsResult.data);
    res.status(201).json(team);
  } catch (error: any) {
    console.error("Error creating team:", error);
    // Handle specific database constraint errors
    if (error.message?.includes('unique constraint')) {
      if (error.message.includes('unique_team_name')) {
        return res.status(400).json({ 
          message: "Team name is already taken. Please choose a different name." 
        });
      }
      if (error.message.includes('unique_user_id')) {
        return res.status(400).json({ 
          message: "You already have a team. Each user can only have one team." 
        });
      }
    }
    
    res.status(error.message?.includes('Team ') ? 400 : 500)
      .json({ message: error.message || "Failed to create team" });
  }
});

// Update team
router.patch("/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    // Check if team exists and belongs to user
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    if (team.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // If team is locked, don't allow updates
    if (team.isLocked) {
      return res.status(400).json({ 
        message: "Team is locked for the upcoming race. Use rider swaps instead." 
      });
    }
    
    // Validate and update team
    const { name, riderIds } = req.body;
    
    // Check if team name is already taken by another team
    if (name && name !== team.name) {
      try {
        const [existingTeamWithName] = await db
          .select()
          .from(teams)
          .where(eq(teams.name, name));
        
        if (existingTeamWithName && existingTeamWithName.id !== teamId) {
          return res.status(400).json({ 
            message: "Team name is already taken. Please choose a different name." 
          });
        }
      } catch (error) {
        console.error("Error checking team name:", error);
        // Continue if there's an error checking the name
      }
    }
    
    // Update team
    const updatedTeam = await storage.updateTeam(
      teamId, 
      { name: name || team.name }, 
      riderIds
    );
    
    res.json(updatedTeam);
  } catch (error: any) {
    console.error("Error updating team:", error);
    
    // Handle specific errors
    if (error.message && error.message.includes('unique constraint')) {
      return res.status(400).json({ message: "Team name is already taken" });
    }
    
    res.status(500).json({ message: "Failed to update team" });
  }
});

// Get team by id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }
    
    const team = await storage.getTeamWithRiders(teamId);
    
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});

export default router;