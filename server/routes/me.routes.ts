import { Router } from "express";
import { requireAuth } from "../auth";
import {
  getMyPerformance,
  getMyTeams,
  updateMyUsername,
  checkUsernameAvailability,
} from "../controllers/me.controller";

const router = Router();

router.get("/teams", requireAuth, getMyTeams);
router.get("/performance", requireAuth, getMyPerformance);
router.get("/username/check", requireAuth, checkUsernameAvailability);
router.put("/username", requireAuth, updateMyUsername);

export default router;
