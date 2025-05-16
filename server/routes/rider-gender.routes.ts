import { Router } from "express";
import { isAdmin } from "../middleware/auth.middleware";
import { updateRiderGenders, updateRiderGendersFromUci } from "../controllers/rider-gender.controller";

const router = Router();

// Route to update rider genders based on UCI data (admin only)
router.post('/update-genders', isAdmin, updateRiderGenders);

// Route to update rider genders directly from UCI API (admin only)
router.post('/update-genders-from-uci', isAdmin, updateRiderGendersFromUci);

// Public route to get rider gender data without updating
router.get('/fetch-uci-data', updateRiderGendersFromUci);

export default router;