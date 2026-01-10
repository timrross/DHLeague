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
  bulkUpsertRiders,
  bulkUpsertRaces,
  streamDatarideRiderSync,
  clearAllRiders
} from "../controllers/admin.controller";
import {
  listRacesAdmin,
  listSeasonsAdmin,
} from "../controllers/gameAdmin.controller";
import {
  lockRaceAdmin,
  settleRaceAdmin,
  upsertRaceResultsAdmin,
} from "../controllers/gameRaces.controller";
import { updateRiderImage } from "../controllers/riderImages.controller";

const router = Router();

// Admin-only routes for user management
router.get("/users", requireAuth, isAdmin, getAllUsers);
router.put("/users/:id", requireAuth, isAdmin, updateUser);
router.delete("/users/:id", requireAuth, isAdmin, deleteUser);
router.get("/users-with-teams", requireAuth, isAdmin, getUsersWithTeams);

// Admin-only routes for UCI data import
router.post("/import-riders", requireAuth, isAdmin, importRidersFromUci);
router.post("/import-races", requireAuth, isAdmin, importRacesFromUci);
router.post("/seed/riders", requireAuth, isAdmin, bulkUpsertRiders);
router.post("/seed/races", requireAuth, isAdmin, bulkUpsertRaces);
router.get("/dataride/riders/stream", requireAuth, isAdmin, streamDatarideRiderSync);
router.delete("/riders", requireAuth, isAdmin, clearAllRiders);
router.post("/riders/:uciId/image", requireAuth, isAdmin, updateRiderImage);
router.get("/seasons", requireAuth, isAdmin, listSeasonsAdmin);
router.get("/races", requireAuth, isAdmin, listRacesAdmin);
router.post("/races/:raceId/lock", requireAuth, isAdmin, lockRaceAdmin);
router.post("/races/:raceId/results", requireAuth, isAdmin, upsertRaceResultsAdmin);
router.post("/races/:raceId/settle", requireAuth, isAdmin, settleRaceAdmin);

export default router;
