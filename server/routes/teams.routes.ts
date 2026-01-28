import { Router } from "express";
import { requireAuth } from "../auth";
import {
  getUserTeam,
  getUserTeamPerformance,
  createTeam,
  updateTeam,
  deleteTeam,
  useJokerCard,
  swapTeamRider,
  checkTeamNameAvailability
} from "../controllers/teams.controller";
import { getUserTeamsBySeason, upsertUserTeam } from "../controllers/gameTeams.controller";

const router = Router();

// Team name availability check (no auth required for UX)
router.get("/check-name", checkTeamNameAvailability);

// User team routes
router.get("/user", requireAuth, getUserTeam);
router.get("/user/performance", requireAuth, getUserTeamPerformance);
router.get("/:seasonId", requireAuth, getUserTeamsBySeason);
router.put("/:seasonId/:teamType", requireAuth, upsertUserTeam);
router.post("/", requireAuth, createTeam);
router.put("/:id", requireAuth, updateTeam);
router.delete("/:id", requireAuth, deleteTeam);
router.post("/:id/joker", requireAuth, useJokerCard);

// Team swap route
router.post("/:id/swap", requireAuth, swapTeamRider);

export default router;
