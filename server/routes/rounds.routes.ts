import { Router } from "express";
import { getNextRounds } from "../controllers/rounds.controller";

const router = Router();

router.get("/next", getNextRounds);

export default router;
