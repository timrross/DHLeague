import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { isAdmin } from "../middleware/auth.middleware";
import { z } from "zod";
import { insertRiderSchema } from "@shared/schema";

const router = Router();

// Get all riders
router.get("/", async (req: Request, res: Response) => {
  try {
    const riders = await storage.getRiders();
    res.json(riders);
  } catch (error) {
    console.error("Error fetching riders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get rider by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.id);
    if (isNaN(riderId)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const rider = await storage.getRider(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.json(rider);
  } catch (error) {
    console.error("Error fetching rider:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get riders by gender
router.get("/gender/:gender", async (req: Request, res: Response) => {
  try {
    const gender = req.params.gender;
    if (gender !== "male" && gender !== "female") {
      return res.status(400).json({ message: "Invalid gender parameter" });
    }

    const riders = await storage.getRidersByGender(gender);
    res.json(riders);
  } catch (error) {
    console.error("Error fetching riders by gender:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create rider (admin only)
router.post("/", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const validatedData = insertRiderSchema.parse(req.body);
    const rider = await storage.createRider(validatedData);
    res.status(201).json(rider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid rider data", errors: error.errors });
    }
    console.error("Error creating rider:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update rider
router.put("/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.id);
    if (isNaN(riderId)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const rider = await storage.getRider(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const updatedRider = await storage.updateRider(riderId, req.body);
    res.json(updatedRider);
  } catch (error) {
    console.error("Error updating rider:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;