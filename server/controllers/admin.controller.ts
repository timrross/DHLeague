import { Request, Response } from "express";
import { storage } from "../storage";
import { uciApiService } from "../services/uciApi";
import { rankingUciApiService } from "../services/rankingUciApi";
import { generateRiderId } from "@shared/utils";
import { type Rider } from "@shared/schema";
import { upsertRaces, upsertRiders } from "../scripts/seed-utils";

/**
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

/**
 * Update a user (admin only)
 */
export async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const updatedUser = await storage.updateUser(userId, req.body);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      message: "Failed to update user",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const deleted = await storage.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      message: "Failed to delete user",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get users with their teams (admin only)
 */
export async function getUsersWithTeams(req: Request, res: Response) {
  try {
    const usersWithTeams = await storage.getUsersWithTeams();
    res.json(usersWithTeams);
  } catch (error) {
    console.error("Error fetching users with teams:", error);
    res.status(500).json({ message: "Failed to fetch users with teams" });
  }
}

/**
 * Import riders from UCI API (admin only)
 */
export async function importRidersFromUci(req: Request, res: Response) {
  try {
    // This could be a long operation, so we'll implement a simple timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), 60000); // 1 minute timeout
    });

    const importPromise = async () => {
      // Clear existing riders first if requested
      if (req.query.clearExisting === 'true') {
        await storage.deleteAllRiders();
      }

      // Get riders from UCI API
      const uciRiders = await uciApiService.getMTBDownhillRiders();
      const mappedRiders = await uciApiService.mapRiderData(uciRiders);

      // Save riders to database
      const savedRiders = [];
      for (const rider of mappedRiders) {
        savedRiders.push(await storage.createRider(rider));
      }

      // Now update rider genders from UCI rankings
      try {
        // Create a map of existing riders for gender updates
        const existingRidersMap = new Map<string, Rider>(
          savedRiders.map((rider: Rider) => [
            generateRiderId(`${rider.lastName} ${rider.firstName}`),
            rider
          ])
        );

        // Get updates from UCI rankings
        const updates = await rankingUciApiService.getRiderUpdates(existingRidersMap);

        // Apply the updates
        const results = await Promise.all(
          updates.map(async (riderData) => {
            try {
              const updatedRider = await storage.updateRider(riderData.id, riderData);
              return { success: true, riderId: updatedRider?.riderId };
            } catch (error) {
              return { success: false, riderId: riderData.id, error };
            }
          })
        );

        // Count successes and failures
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`Updated ${succeeded} riders with gender data, ${failed} failures`);
      } catch (error) {
        console.error('Error updating rider genders:', error);
        // Don't throw here, as we still want to return the imported riders
      }

      return savedRiders;
    };

    // Race the import operation against the timeout
    const riders = await Promise.race([importPromise(), timeoutPromise]);
    res.json(riders);
  } catch (error) {
    console.error("Error importing riders:", error);
    res.status(500).json({
      message: "Failed to import riders",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Import races from UCI API (admin only)
 */
export async function importRacesFromUci(req: Request, res: Response) {
  try {
    // Get upcoming races from UCI API
    const uciRaces = await uciApiService.getUpcomingMTBEvents();
    const mappedRaces = uciApiService.mapRaceData(uciRaces);

    // Save races to database
    const savedRaces = [];
    for (const race of mappedRaces) {
      savedRaces.push(await storage.createRace(race));
    }

    res.json(savedRaces);
  } catch (error) {
    console.error("Error importing races:", error);
    res.status(500).json({
      message: "Failed to import races",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Bulk upload or update riders from an array payload (admin only)
 */
export async function bulkUpsertRiders(req: Request, res: Response) {
  try {
    const riders = Array.isArray(req.body) ? req.body : req.body?.riders;

    if (!Array.isArray(riders)) {
      return res.status(400).json({ message: "Request body must be an array or { riders: [] }" });
    }

    await upsertRiders(riders);
    res.status(200).json({ message: "Riders synced", count: riders.length });
  } catch (error) {
    console.error("Error bulk upserting riders:", error);
    res.status(500).json({
      message: "Failed to sync riders",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Bulk upload or update races from an array payload (admin only)
 */
export async function bulkUpsertRaces(req: Request, res: Response) {
  try {
    const races = Array.isArray(req.body) ? req.body : req.body?.races;

    if (!Array.isArray(races)) {
      return res.status(400).json({ message: "Request body must be an array or { races: [] }" });
    }

    await upsertRaces(races);
    res.status(200).json({ message: "Races synced", count: races.length });
  } catch (error) {
    console.error("Error bulk upserting races:", error);
    res.status(500).json({
      message: "Failed to sync races",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
