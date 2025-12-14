import { Router } from "express";
import { requireAuth } from "../auth";
import { isAdmin } from "../middleware/auth.middleware";
import {
  getAllRaces,
  getNextRace,
  getRaceById,
  getRaceResults,
  createRace,
  updateRace,
  addRaceResult
} from "../controllers/races.controller";

const router = Router();

// Public race routes
router.get("/", getAllRaces);
router.get("/next", getNextRace);
router.get("/:id", getRaceById);
router.get("/:id/results", getRaceResults);

// Admin-only race routes
router.post("/", requireAuth, isAdmin, createRace);
router.put("/:id", requireAuth, isAdmin, updateRace);
router.post("/:id/results", requireAuth, isAdmin, addRaceResult);

export default router;
