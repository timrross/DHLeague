import { Router } from "express";
import { getCurrentUser, checkIsAdmin } from "../controllers/auth.controller";

const router = Router();

// Auth routes
router.get("/user", getCurrentUser);
router.get("/admin", checkIsAdmin);

export default router;
