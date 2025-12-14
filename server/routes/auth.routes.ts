import { Router } from "express";
import { requireAuth } from "../auth";
import { getCurrentUser, checkIsAdmin } from "../controllers/auth.controller";

const router = Router();

// Auth routes
router.get("/user", requireAuth, getCurrentUser);
router.get("/admin", requireAuth, checkIsAdmin);

export default router;
