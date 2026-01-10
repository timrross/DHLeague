import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Get all races
 */
export async function getAllRaces(_req: Request, res: Response) {
  try {
    const { races } = await storage.getRaceStatusBuckets();
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

    const race = await storage.getRaceWithStatus(raceId);
    if (!race) {
      return res.status(404).json({ message: "Race not found" });
    }

    res.json(race);
  } catch (error) {
    console.error("Error fetching race:", error);
    res.status(500).json({ message: "Failed to fetch race" });
  }
}

export async function getNextRace(_req: Request, res: Response) {
  try {
    const { nextRace } = await storage.getRaceStatusBuckets();

    if (!nextRace) {
      return res.status(404).json({ message: "No upcoming races" });
    }

    res.json(nextRace);
  } catch (error) {
    console.error("Error fetching next race:", error);
    res.status(500).json({ message: "Failed to fetch next race" });
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
