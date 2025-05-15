import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { z } from "zod";
import { insertRaceSchema, insertResultSchema } from "@shared/schema";
import { isAdmin } from "../middleware/auth.middleware";

const router = Router();

// Helper function to determine race status based on dates
function calculateRaceStatus(
  startDate: Date,
  endDate: Date,
): "upcoming" | "next" | "ongoing" | "completed" {
  const now = new Date();

  // If the race is already over
  if (now > endDate) {
    return "completed";
  }

  // If the race is currently happening
  if (now >= startDate && now <= endDate) {
    return "ongoing";
  }

  // Find the next race (the closest upcoming race)
  const isNext = (() => {
    const upcoming = new Date(startDate);
    const msUntilStart = upcoming.getTime() - now.getTime();
    return msUntilStart > 0 && msUntilStart < 7 * 24 * 60 * 60 * 1000; // Next 7 days
  })();

  // Otherwise, it's an upcoming race
  return isNext ? "next" : "upcoming";
}

// Get all races
router.get("/", async (req: Request, res: Response) => {
  try {
    const races = await storage.getRaces();
    
    // Update race status based on current date
    const updatedRaces = races.map(race => {
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);
      const status = calculateRaceStatus(startDate, endDate);
      
      return {
        ...race,
        status
      };
    });
    
    res.json(updatedRaces);
  } catch (error) {
    console.error("Error fetching races:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get race by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    const startDate = new Date(race.startDate);
    const endDate = new Date(race.endDate);
    const status = calculateRaceStatus(startDate, endDate);

    res.json({
      ...race,
      status
    });
  } catch (error) {
    console.error("Error fetching race:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get race with results
router.get("/:id/results", async (req: Request, res: Response) => {
  try {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const raceWithResults = await storage.getRaceWithResults(raceId);
    if (!raceWithResults) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(raceWithResults);
  } catch (error) {
    console.error("Error fetching race with results:", error);
    res.status(500).json({ message: "Failed to fetch race results" });
  }
});

// Create a new race (admin only)
router.post("/", isAuthenticated, isAdmin, async (req: any, res: Response) => {
  try {
    const validatedData = insertRaceSchema.parse(req.body);
    const race = await storage.createRace(validatedData);
    res.status(201).json(race);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid race data", errors: error.errors });
    }
    console.error("Error creating race:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update race (admin only)
router.patch("/:id", isAuthenticated, isAdmin, async (req: any, res: Response) => {
  try {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    const updatedRace = await storage.updateRace(raceId, req.body);
    res.json(updatedRace);
  } catch (error) {
    console.error("Error updating race:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add race results (admin only)
router.post("/:id/results", isAuthenticated, isAdmin, async (req: any, res: Response) => {
  try {
    const raceId = parseInt(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    // Validate result data
    const validatedData = insertResultSchema.parse({
      ...req.body,
      raceId
    });

    const result = await storage.addResult(validatedData);
    
    // Update team points after adding results
    await storage.updateTeamPoints();
    
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid result data", errors: error.errors });
    }
    console.error("Error adding race result:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;