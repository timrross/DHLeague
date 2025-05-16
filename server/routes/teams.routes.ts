import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { z } from "zod";
import {
  insertTeamSchema,
  teams,
  teamRiders,
  teamSwaps,
  users,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Team routes
router.get("/user", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.getUserTeam(userId);

    if (!team) {
      return res.status(404).json({ message: "No team found for user" });
    }

    // Import the getRacesWithStatuses function from races.routes.ts
    const { getRacesWithStatuses } = await import('./races.routes');
    
    // Get all races with calculated statuses
    const races = await getRacesWithStatuses();
    
    // Filter for upcoming races (including 'next')
    const upcomingRaces = races.filter(
      race => race.status === "upcoming" || race.status === "next"
    );
    
    if (upcomingRaces.length > 0) {
      // Sort by start date to find the next race chronologically
      upcomingRaces.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      // The next race is the first upcoming one
      const nextRace = upcomingRaces[0];
      
      // Calculate lock date (1 day before race)
      const oneDay = 24 * 60 * 60 * 1000;
      const lockDate = new Date(
        new Date(nextRace.startDate).getTime() - oneDay
      );
      
      const now = new Date();
      
      // Check if now is past the lock date
      if (now >= lockDate) {
        // Team should be locked if we're past lock date
        if (!team.isLocked) {
          // Lock the team for this race
          await storage.updateTeam(team.id, {
            isLocked: true,
            lockedAt: now,
            currentRaceId: nextRace.id,
            swapsUsed: 0, // Reset swap count for new race
          });
          
          // Get the updated team
          const updatedTeam = await storage.getUserTeam(userId);
          return res.json(updatedTeam);
        }
      } else {
        // If we're not past the lock date but the team is locked, unlock it
        if (team.isLocked) {
          await storage.updateTeam(team.id, {
            isLocked: false,
            lockedAt: null,
            swapsRemaining: 2
          });
          
          // Get the updated team
          const updatedTeam = await storage.getUserTeam(userId);
          return res.json(updatedTeam);
        }
      }
    }

    res.json(team);
  } catch (error) {
    console.error("Error fetching user team:", error);
    res.status(500).json({ message: "Failed to fetch team" });
  }
});

// Team rider swap endpoint - only allowed when team is locked, limited to 2 swaps per race
router.post(
  "/:id/swap",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);

      // Validate request body
      if (!req.body.removedRiderId || !req.body.addedRiderId) {
        return res.status(400).json({
          message: "Both removedRiderId and addedRiderId are required",
        });
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

      // Import the getRacesWithStatuses function
      const { getRacesWithStatuses } = await import('./races.routes');
      
      // Get all races with calculated statuses
      const races = await getRacesWithStatuses();
      
      // Check if team is locked (required for swaps)
      if (!team.isLocked) {
        return res.status(400).json({
          message:
            "Team is not locked. Swaps are only allowed during the locked period (1 day before race).",
        });
      }
      
      // Find the current race
      const currentRace = races.find(race => race.id === team.currentRaceId);
      
      // Verify the race is currently ongoing
      if (!currentRace || currentRace.status !== "ongoing") {
        return res.status(400).json({
          message: "Race is not currently ongoing. Swaps are only allowed during ongoing races.",
        });
      }

      // Check remaining swaps
      const swapsRemaining = team.swapsRemaining ?? 0;
      if (swapsRemaining <= 0) {
        return res.status(400).json({
          message:
            "No swaps remaining for this race. Each team is limited to 2 swaps per race.",
        });
      }

      // Check if the removed rider is on the team
      const isRiderOnTeam = team.riders.some((r) => r.id === removedRiderId);
      if (!isRiderOnTeam) {
        return res
          .status(400)
          .json({ message: "Selected rider is not on your team" });
      }

      // Get added rider
      const addedRider = await storage.getRider(addedRiderId);
      if (!addedRider) {
        return res.status(404).json({ message: "Replacement rider not found" });
      }

      // Check if added rider is already on team
      const isAddedRiderOnTeam = team.riders.some((r) => r.id === addedRiderId);
      if (isAddedRiderOnTeam) {
        return res
          .status(400)
          .json({ message: "Replacement rider is already on your team" });
      }

      // Get removed rider (already verified to be on team)
      const removedRider = team.riders.find((r) => r.id === removedRiderId);

      // Check gender balance
      const maleRiders = team.riders.filter((r) => r.gender === "male");
      const femaleRiders = team.riders.filter((r) => r.gender === "female");

      const isRemovingMale = removedRider?.gender === "male";
      const isAddingMale = addedRider.gender === "male";

      if (isRemovingMale && !isAddingMale && femaleRiders.length >= 4) {
        return res.status(400).json({
          message: "Cannot add more female riders. Maximum 4 allowed.",
        });
      }

      if (!isRemovingMale && isAddingMale && maleRiders.length >= 4) {
        return res.status(400).json({
          message: "Cannot add more male riders. Maximum 4 allowed.",
        });
      }

      // Check budget
      const currentCost = team.riders.reduce((total, r) => total + r.cost, 0);
      const newCost = currentCost - (removedRider?.cost || 0) + addedRider.cost;

      if (newCost > 2000000) {
        return res.status(400).json({
          message: "Swap exceeds budget limit of $2,000,000",
        });
      }

      // Create a new array of riderIds with the swap applied
      const updatedRiderIds = team.riders
        .filter((r) => r.id !== removedRiderId)
        .map((r) => r.id);
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
          updatedRiderIds,
        );
      });

      // Get updated team
      const updatedTeam = await storage.getTeamWithRiders(teamId);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error swapping rider:", error);
      res.status(500).json({
        message: "Failed to swap rider",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

router.post(
  "/api/teams",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.claims.sub;

      // Validate team data
      const teamDataResult = insertTeamSchema.safeParse({
        ...req.body,
        userId,
        swapsRemaining: 2, // Initialize with 2 swaps per race
      });

      if (!teamDataResult.success) {
        return res.status(400).json({
          message: "Invalid team data",
          errors: teamDataResult.error.errors,
        });
      }

      // Validate riders array
      const riderIdsSchema = z.array(z.number()).length(6);
      const riderIdsResult = riderIdsSchema.safeParse(req.body.riderIds);

      if (!riderIdsResult.success) {
        return res.status(400).json({
          message: "Invalid rider selection",
          errors: riderIdsResult.error.errors,
        });
      }

      // Check if team name is already taken
      try {
        const [teamWithSameName] = await db
          .select()
          .from(teams)
          .where(eq(teams.name, teamDataResult.data.name));
        if (teamWithSameName) {
          return res.status(400).json({
            message:
              "Team name is already taken. Please choose a different name.",
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
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));

          if (user && user.jokerCardUsed) {
            return res.status(400).json({
              message: "You have already used your joker card for this season.",
            });
          }

          // User is using their joker card - delete existing team and mark joker as used
          await db.transaction(async (tx) => {
            // Delete old team data
            await tx
              .delete(teamRiders)
              .where(eq(teamRiders.teamId, existingTeam.id));
            await tx.delete(teams).where(eq(teams.id, existingTeam.id));

            // Mark joker card as used
            await tx
              .update(users)
              .set({ jokerCardUsed: true, updatedAt: new Date() })
              .where(eq(users.id, userId));
          });

          // Continue to create new team
        } else {
          return res.status(400).json({
            message:
              "You already have a team. Each user can only have one team. You can use your joker card to reset your team if you haven't used it yet.",
          });
        }
      }

      // Create team
      const team = await storage.createTeam(
        teamDataResult.data,
        riderIdsResult.data,
      );
      
      // Import the getRacesWithStatuses function to check race status
      const { getRacesWithStatuses } = await import('./races.routes');
      
      // Get all races with calculated statuses
      const races = await getRacesWithStatuses();
      
      // Check if there's a race that should trigger team locking
      const upcomingRaces = races.filter(
        race => race.status === "upcoming" || race.status === "next"
      );
      
      if (upcomingRaces.length > 0) {
        // Sort by start date to find the next race chronologically
        upcomingRaces.sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        
        // The next race is the first upcoming one
        const nextRace = upcomingRaces[0];
        
        // Calculate lock date (1 day before race)
        const oneDay = 24 * 60 * 60 * 1000;
        const lockDate = new Date(
          new Date(nextRace.startDate).getTime() - oneDay
        );
        
        const now = new Date();
        
        // Check if now is past the lock date and lock the team if needed
        if (now >= lockDate) {
          await storage.updateTeam(team.id, {
            isLocked: true,
            lockedAt: now,
            currentRaceId: nextRace.id,
            swapsUsed: 0
          });
          
          // Get the updated team with lock status
          const updatedTeam = await storage.getTeamWithRiders(team.id);
          return res.status(201).json(updatedTeam);
        }
      }
      
      res.status(201).json(team);
    } catch (error: any) {
      console.error("Error creating team:", error);
      // Handle specific database constraint errors
      if (error.message?.includes("unique constraint")) {
        if (error.message.includes("unique_team_name")) {
          return res.status(400).json({
            message:
              "Team name is already taken. Please choose a different name.",
          });
        }
        if (error.message.includes("unique_user_id")) {
          return res.status(400).json({
            message:
              "You already have a team. Each user can only have one team.",
          });
        }
      }

      res
        .status(error.message?.includes("Team ") ? 400 : 500)
        .json({ message: error.message || "Failed to create team" });
    }
  },
);

router.put("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const teamId = parseInt(req.params.id);

    // Check if team exists and belongs to user
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update team name if provided
    const teamData: { name?: string } = {};
    if (req.body.name) {
      teamData.name = req.body.name;
    }

    // Update team riders if provided
    const riderIds = req.body.riderIds ? [...req.body.riderIds] : undefined;

    // Update team
    const updatedTeam = await storage.updateTeam(teamId, teamData, riderIds);

    if (!updatedTeam) {
      return res.status(500).json({ message: "Failed to update team" });
    }

    res.json(updatedTeam);
  } catch (error: any) {
    console.error("Error updating team:", error);
    res
      .status(error.message.includes("Team ") ? 400 : 500)
      .json({ message: error.message || "Failed to update team" });
  }
});

router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const teamId = parseInt(req.params.id);

    // Check if team exists and belongs to user
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete team
    const deleted = await storage.deleteTeam(teamId);

    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete team" });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting team:", error);
    res.status(500).json({ message: "Failed to delete team" });
  }
});

export default router;
