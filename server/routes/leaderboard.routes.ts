import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboard.controller";

const router = Router();

// Leaderboard routes
router.get("/", getLeaderboard);

export default router;