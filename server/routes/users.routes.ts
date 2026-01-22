import { Router } from "express";
import { getUserTeams, getUserPerformance } from "../controllers/users.controller";

const router = Router();

// Public endpoints to view any user's team/performance
router.get("/:userId/teams", getUserTeams);
router.get("/:userId/performance", getUserPerformance);

export default router;
