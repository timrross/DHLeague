import { Router } from "express";
import { isAuthenticated } from "../oidcAuth";
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
router.post("/", isAuthenticated, isAdmin, createRace);
router.put("/:id", isAuthenticated, isAdmin, updateRace);
router.post("/:id/results", isAuthenticated, isAdmin, addRaceResult);

export default router;