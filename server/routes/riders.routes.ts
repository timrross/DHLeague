import { Router } from "express";
import { isAuthenticated } from "../oidcAuth";
import { isAdmin } from "../middleware/auth.middleware";
import { 
    getRiders, 
    getRiderById, 
    createRider, 
    updateRider, 
    deleteRider, 
    getRidersByGender 
} from "../controllers/riders.controller";

const router = Router();

// Rider routes
router.get("/", getRiders);
router.get("/:id", getRiderById);

router.post(
    "/",
    isAuthenticated,
    isAdmin,
    createRider
);

router.put(
    "/:id",
    //isAuthenticated,
    //isAdmin,
    updateRider
);

router.delete(
    "/:id",
    isAuthenticated,
    isAdmin,
    deleteRider
);

router.get("/gender/:gender", getRidersByGender);

export default router;
