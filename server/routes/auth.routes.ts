import { Router } from "express";
import { isAuthenticated } from "../oidcAuth";
import { getCurrentUser, checkIsAdmin } from "../controllers/auth.controller";

const router = Router();

// Auth routes
router.get("/user", isAuthenticated, getCurrentUser);
router.get("/admin", isAuthenticated, checkIsAdmin);

export default router;