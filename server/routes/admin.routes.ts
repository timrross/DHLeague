import { Router } from "express";
import { isAuthenticated } from "../oidcAuth";
import { isAdmin } from "../middleware/auth.middleware";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUsersWithTeams,
  importRidersFromUci,
  importRacesFromUci,
  bulkUpsertRiders,
  bulkUpsertRaces
} from "../controllers/admin.controller";

const router = Router();

// Admin-only routes for user management
router.get("/users", isAuthenticated, isAdmin, getAllUsers);
router.put("/users/:id", isAuthenticated, isAdmin, updateUser);
router.delete("/users/:id", isAuthenticated, isAdmin, deleteUser);
router.get("/users-with-teams", isAuthenticated, isAdmin, getUsersWithTeams);

// Admin-only routes for UCI data import
router.post("/import-riders", isAuthenticated, isAdmin, importRidersFromUci);
router.post("/import-races", isAuthenticated, isAdmin, importRacesFromUci);
router.post("/seed/riders", isAuthenticated, isAdmin, bulkUpsertRiders);
router.post("/seed/races", isAuthenticated, isAdmin, bulkUpsertRaces);

export default router;
