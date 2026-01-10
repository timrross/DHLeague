import { Router } from "express";
import { requireAuth } from "../auth";
import { 
  getUserTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  swapTeamRider
} from "../controllers/teams.controller";
import { getUserTeamsBySeason, upsertUserTeam } from "../controllers/gameTeams.controller";

const router = Router();

// User team routes
router.get("/user", requireAuth, getUserTeam);
router.get("/:seasonId", requireAuth, getUserTeamsBySeason);
router.put("/:seasonId/:teamType", requireAuth, upsertUserTeam);
router.post("/", requireAuth, createTeam);
router.put("/:id", requireAuth, updateTeam);
router.delete("/:id", requireAuth, deleteTeam);

// Team swap route
router.post("/:id/swap", requireAuth, swapTeamRider);

export default router;
