import { Router } from "express";
import { requireAuth } from "../auth";
import { isAdmin } from "../middleware/auth.middleware";
import {
  getRiders,
  getRiderById,
  createRider,
  updateRider,
  deleteRider,
  getRidersByGender,
} from "../controllers/riders.controller";
import { getRiderPlaceholderImage } from "../controllers/riderImages.controller";

const router = Router();

// Rider routes
router.get("/", getRiders);
router.get("/gender/:gender", getRidersByGender);
router.get("/:uciId/placeholder.svg", getRiderPlaceholderImage);
router.get("/:id", getRiderById);

router.post(
    "/",
    requireAuth,
    isAdmin,
    createRider
);

router.put(
    "/:id",
    requireAuth,
    isAdmin,
    updateRider
);

router.delete(
    "/:id",
    requireAuth,
    isAdmin,
    deleteRider
);

export default router;
