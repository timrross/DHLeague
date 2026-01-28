import { Router } from "express";
import { requireAuth } from "../auth";
import { getMyPerformance, getMyTeams, updateMyUsername } from "../controllers/me.controller";

const router = Router();

router.get("/teams", requireAuth, getMyTeams);
router.get("/performance", requireAuth, getMyPerformance);
router.put("/username", requireAuth, updateMyUsername);

export default router;
