import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Get leaderboard
router.get("/", async (req: Request, res: Response) => {
  try {
    // Update team points first to ensure leaderboard is accurate
    await storage.updateTeamPoints();
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

export default router;
