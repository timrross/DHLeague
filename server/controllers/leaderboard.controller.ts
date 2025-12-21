import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Get the leaderboard data
 */
export async function getLeaderboard(_req: Request, res: Response) {
  try {
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
}
