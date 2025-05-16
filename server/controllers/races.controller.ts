import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Helper function to determine race status based on dates
 */
export function calculateRaceStatus(
  startDate: Date,
  endDate: Date
): "upcoming" | "ongoing" | "completed" {
  const now = new Date();
  
  if (now < startDate) {
    return "upcoming";
  } else if (now >= startDate && now <= endDate) {
    return "ongoing";
  } else {
    return "completed";
  }
}

/**
 * Helper function to get races with calculated statuses - exported so other routes can use it
 */
export async function getRacesWithStatuses() {
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

/**
 * Get all races
 */
export async function getAllRaces(req: Request, res: Response) {
  try {
    const races = await getRacesWithStatuses();
    res.json(races);
  } catch (error) {
    console.error("Error fetching races:", error);
    res.status(500).json({ message: "Failed to fetch races" });
  }
}

/**
 * Get race by ID
 */
export async function getRaceById(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    // Calculate status based on date
    const startDate = new Date(race.startDate);
    const endDate = new Date(race.endDate);
    race.status = calculateRaceStatus(startDate, endDate);

    // If it's the next upcoming race, mark it as 'next'
    const races = await getRacesWithStatuses();
    const nextRace = races.find(r => r.status === "next");
    if (nextRace && nextRace.id === race.id) {
      race.status = "next";
    }

    res.json(race);
  } catch (error) {
    console.error("Error fetching race:", error);
    res.status(500).json({ message: "Failed to fetch race" });
  }
}

/**
 * Get race results by race ID
 */
export async function getRaceResults(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const race = await storage.getRaceWithResults(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(race.results);
  } catch (error) {
    console.error("Error fetching race results:", error);
    res.status(500).json({ message: "Failed to fetch race results" });
  }
}

/**
 * Create a new race
 */
export async function createRace(req: Request, res: Response) {
  try {
    const race = await storage.createRace(req.body);
    res.status(201).json(race);
  } catch (error) {
    console.error("Error creating race:", error);
    res.status(500).json({ 
      message: "Failed to create race",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update an existing race
 */
export async function updateRace(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    const updatedRace = await storage.updateRace(raceId, req.body);
    if (!updatedRace) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(updatedRace);
  } catch (error) {
    console.error("Error updating race:", error);
    res.status(500).json({
      message: "Failed to update race",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Add a result to a race
 */
export async function addRaceResult(req: Request, res: Response) {
  try {
    const raceId = Number(req.params.id);
    if (isNaN(raceId)) {
      return res.status(400).json({ message: "Invalid race ID" });
    }

    // Make sure the race exists
    const race = await storage.getRace(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    // Create the result with the race ID
    const resultData = {
      ...req.body,
      raceId,
    };

    const result = await storage.addResult(resultData);
    
    // Update team points after adding a result
    await storage.updateTeamPoints();
    
    res.status(201).json(result);
  } catch (error) {
    console.error("Error adding race result:", error);
    res.status(500).json({
      message: "Failed to add race result",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}