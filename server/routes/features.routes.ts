import { Router } from "express";
import { getFeatures } from "../controllers/features.controller";

const router = Router();

router.get("/", getFeatures);

export default router;
