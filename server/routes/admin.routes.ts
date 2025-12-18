import { Router } from "express";
import { requireAuth } from "../auth";
import { isAdmin } from "../middleware/auth.middleware";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUsersWithTeams,
  importRidersFromUci,
  importRacesFromUci,
  updateTeamPoints,
  bulkUpsertRiders,
  bulkUpsertRaces,
  streamDatarideRiderSync,
  clearAllRiders
} from "../controllers/admin.controller";

const router = Router();

// Admin-only routes for user management
router.get("/users", requireAuth, isAdmin, getAllUsers);
router.put("/users/:id", requireAuth, isAdmin, updateUser);
router.delete("/users/:id", requireAuth, isAdmin, deleteUser);
router.get("/users-with-teams", requireAuth, isAdmin, getUsersWithTeams);

// Admin-only routes for UCI data import
router.post("/import-riders", requireAuth, isAdmin, importRidersFromUci);
router.post("/import-races", requireAuth, isAdmin, importRacesFromUci);
router.post("/update-team-points", requireAuth, isAdmin, updateTeamPoints);
router.post("/seed/riders", requireAuth, isAdmin, bulkUpsertRiders);
router.post("/seed/races", requireAuth, isAdmin, bulkUpsertRaces);
router.get("/dataride/riders/stream", requireAuth, isAdmin, streamDatarideRiderSync);
router.delete("/riders", requireAuth, isAdmin, clearAllRiders);

export default router;
