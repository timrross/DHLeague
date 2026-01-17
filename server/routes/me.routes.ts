import { Router } from "express";
import { requireAuth } from "../auth";
import { getMyPerformance, getMyTeams } from "../controllers/me.controller";

const router = Router();

router.get("/teams", requireAuth, getMyTeams);
router.get("/performance", requireAuth, getMyPerformance);

export default router;
