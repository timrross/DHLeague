import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { isAdmin } from "../middleware/auth.middleware";
import { storage } from "../storage";
import { z } from "zod";
import { insertRaceSchema, insertResultSchema } from "@shared/schema";

const router = Router();

// Helper function to get races with calculated statuses
async function getRacesWithStatuses() {
  try {
    // Get all races
    const allRaces = await storage.getRaces();

    // Calculate status for each race based on dates
    allRaces.forEach((race) => {
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);

      // Calculate base status based on dates
      race.status = calculateRaceStatus(startDate, endDate);
    });

    // Find the next upcoming race (the closest in the future)
    const upcomingRaces = allRaces.filter((race) => race.status === "upcoming");

    if (upcomingRaces.length > 0) {
      // Sort by start date (ascending)
      upcomingRaces.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      // Mark the first upcoming race as 'next'
      upcomingRaces[0].status = "next";
    }

    return allRaces;
  } catch (error) {
    console.error("Error calculating race statuses:", error);
    return [];
  }
}

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

  // For races in the future, we'll just return "upcoming"
  // The actual "next" race will be determined in updateRaceStatuses()
  // by finding the closest upcoming race
  return "upcoming";
}

// Race routes
router.get("/", async (req: Request, res: Response) => {
  try {
    // Get races with calculated statuses
    const races = await getRacesWithStatuses();
    res.json(races);
  } catch (error) {
    console.error("Error fetching races:", error);
    res.status(500).json({ message: "Failed to fetch races" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }
    
    // Calculate the status for this race
    const startDate = new Date(race.startDate);
    const endDate = new Date(race.endDate);
    race.status = calculateRaceStatus(startDate, endDate);
    
    // Get all races to check if this is the next race
    const allRaces = await getRacesWithStatuses();
    const nextRace = allRaces.find(r => r.status === "next");
    
    // If this race is the next chronological race, mark it as "next"
    if (nextRace && nextRace.id === race.id) {
      race.status = "next";
    }
    
    res.json(race);
  } catch (error) {
    console.error("Error fetching race:", error);
    res.status(500).json({ message: "Failed to fetch race" });
  }
});

router.get("/:id/results", async (req: Request, res: Response) => {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }
    
    // Get races with calculated statuses
    await getRacesWithStatuses();

    const raceWithResults = await storage.getRaceWithResults(raceId);
    if (!raceWithResults) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(raceWithResults);
  } catch (error) {
    console.error("Error fetching race results:", error);
    res.status(500).json({ message: "Failed to fetch race results" });
  }
});

router.post(
  "/api/races",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      // Create a copy of the race data and remove any status
      // as status will be automatically determined by dates
      const raceData = { ...req.body };
      delete raceData.status;

      const newRace = await storage.createRace(raceData);

      // Update race statuses after creating a new race
      await updateRaceStatuses();

      // Get the updated race with the correct status
      const updatedRace = await storage.getRace(newRace.id);

      res.status(201).json(updatedRace || newRace);
    } catch (error) {
      console.error("Error creating race:", error);
      res.status(500).json({
        message: "Failed to create race",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

router.put(
  "/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: "Invalid race ID" });
      }

      // Create a copy of the race data and remove any status
      // as status will be automatically determined by dates
      const raceData = { ...req.body };
      delete raceData.status;

      // Check if there's at least one valid property to update
      const hasValidFields = Object.values(raceData).some(
        (val) => val !== undefined && val !== null && val !== "",
      );

      if (!hasValidFields) {
        return res.status(400).json({
          message: "No valid fields provided for update",
          error: "At least one field must have a value",
        });
      }

      try {
        const updatedRace = await storage.updateRace(raceId, raceData);

        if (!updatedRace) {
          return res.status(404).json({ message: "Race not found" });
        }

        // Update race statuses after updating the race
        await updateRaceStatuses();

        // Get the race again with its calculated status
        const raceWithStatus = await storage.getRace(raceId);

        res.json(raceWithStatus);
      } catch (error: any) {
        if (error.message && error.message.includes("No values to set")) {
          return res.status(400).json({
            message: "No valid fields provided for update",
            error: error.message,
          });
        }
        throw error; // Let the outer catch handle other errors
      }
    } catch (error) {
      console.error("Error updating race:", error);
      res.status(500).json({
        message: "Failed to update race",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

router.post(
  "/:id/results",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      // Check if user is an admin
      const userId = req.user.claims.sub;
      if (userId !== "42624609") {
        return res
          .status(403)
          .json({ message: "Unauthorized. Admin access required." });
      }

      const raceId = Number(req.params.id);
      if (isNaN(raceId)) {
        return res.status(400).json({ message: "Invalid race ID" });
      }

      const resultData = req.body;
      resultData.raceId = raceId;

      const newResult = await storage.addResult(resultData);

      // Update team points after adding a result
      await storage.updateTeamPoints();

      res.status(201).json(newResult);
    } catch (error) {
      console.error("Error adding race result:", error);
      res.status(500).json({
        message: "Failed to add race result",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

export default router;
