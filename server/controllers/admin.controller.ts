import { Request, Response } from "express";
import { storage } from "../storage";
import { uciApiService } from "../services/uciApi";

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