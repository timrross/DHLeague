import { Router } from "express";
import { getSeasonStandingsController } from "../controllers/gameStandings.controller";

const router = Router();

router.get("/:seasonId/standings", getSeasonStandingsController);

export default router;
