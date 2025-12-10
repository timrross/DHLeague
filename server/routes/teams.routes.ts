import { Router } from "express";
import { isAuthenticated } from "../oidcAuth";
import { 
  getUserTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  swapTeamRider
} from "../controllers/teams.controller";

const router = Router();

// User team routes
router.get("/user", isAuthenticated, getUserTeam);
router.post("/", isAuthenticated, createTeam);
router.put("/:id", isAuthenticated, updateTeam);
router.delete("/:id", isAuthenticated, deleteTeam);

// Team swap route
router.post("/:id/swap", isAuthenticated, swapTeamRider);

export default router;