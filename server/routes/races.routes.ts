import { Router } from "express";
import { requireAuth } from "../auth";
import { isAdmin } from "../middleware/auth.middleware";
import {
  getAllRaces,
  getNextRace,
  getRaceById,
  getRaceResults,
  createRace,
  updateRace
} from "../controllers/races.controller";
import { getRaceLeaderboard, deleteRaceAdmin } from "../controllers/gameRaces.controller";

const router = Router();

// Public race routes
router.get("/", getAllRaces);
router.get("/next", getNextRace);
router.get("/:id", getRaceById);
router.get("/:id/results", getRaceResults);
router.get("/:id/leaderboard", getRaceLeaderboard);

// Admin-only race routes
router.post("/", requireAuth, isAdmin, createRace);
router.put("/:id", requireAuth, isAdmin, updateRace);
router.delete("/:id", requireAuth, isAdmin, deleteRaceAdmin);

export default router;
