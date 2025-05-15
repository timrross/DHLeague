import { Router, Request, Response, NextFunction } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { isAdmin } from "../middleware/auth.middleware";
import { uciApiService } from "../services/uciApi";
import { z } from "zod";
import { insertRiderSchema, insertRaceSchema } from "@shared/schema";
import { upload, processImage } from "../imageUpload";

const router = Router();

// Get all users
router.get(
  "/users",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  },
);

// Get users with their teams
router.get(
  "/users/teams",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const usersWithTeams = await storage.getUsersWithTeams();
      res.json(usersWithTeams);
    } catch (error) {
      console.error("Error fetching users with teams:", error);
      res.status(500).json({ message: "Failed to fetch users with teams" });
    }
  },
);

// Get user with team by ID
router.get(
  "/users/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const team = await storage.getUserTeam(userId);

      res.json({
        ...user,
        team,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  },
);

// Update user
router.patch(
  "/users/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const userData = req.body;

      // Validate we're only updating allowed fields
      const allowedFields = [
        "isAdmin",
        "isActive",
        "firstName",
        "lastName",
        "email",
        "jokerCardUsed",
      ];
      const updateData: Record<string, any> = {};

      for (const field of allowedFields) {
        if (field in userData) {
          updateData[field] = userData[field];
        }
      }

      // Check if there's at least one valid property to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          message: "No valid fields provided for update",
        });
      }

      const user = await storage.updateUser(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  },
);

// Delete user
router.delete(
  "/users/:id",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const success = await storage.deleteUser(userId);

      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  },
);

// UCI API integration - import riders
router.post(
  "/import/riders",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      // Fetch riders from UCI API
      const uciRiders = await uciApiService.getMTBDownhillRiders();

      // Map to our schema and insert
      const riders = await uciApiService.mapRiderData(uciRiders);

      // Delete existing riders if requested
      if (req.body.clearExisting) {
        await storage.deleteAllRiders();
      }

      // Create each rider
      const created = [];
      for (const rider of riders) {
        try {
          const createdRider = await storage.createRider(rider);
          created.push(createdRider);
        } catch (error) {
          console.error(`Error creating rider ${rider.name}:`, error);
        }
      }

      res.json({
        message: `Imported ${created.length} riders successfully`,
        imported: created.length,
        total: riders.length,
      });
    } catch (error) {
      console.error("Error importing riders:", error);
      res.status(500).json({ message: "Failed to import riders from UCI API" });
    }
  },
);

// UCI API integration - import races
router.post(
  "/import/races",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      // Fetch events from UCI API
      const uciEvents = await uciApiService.getUpcomingMTBEvents();

      // Map to our schema
      const races = uciApiService.mapRaceData(uciEvents);

      // Create each race
      const created = [];
      for (const race of races) {
        try {
          const createdRace = await storage.createRace(race);
          created.push(createdRace);
        } catch (error) {
          console.error(`Error creating race ${race.name}:`, error);
        }
      }

      res.json({
        message: `Imported ${created.length} races successfully`,
        imported: created.length,
        total: races.length,
      });
    } catch (error) {
      console.error("Error importing races:", error);
      res.status(500).json({ message: "Failed to import races from UCI API" });
    }
  },
);

// Upload rider image
router.post(
  "/riders/:id/image",
  isAuthenticated,
  isAdmin,
  upload.single("image"),
  processImage,
  async (req: Request, res: Response) => {
    try {
      const riderId = parseInt(req.params.id);
      if (isNaN(riderId)) {
        return res.status(400).json({ message: "Invalid rider ID" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const rider = await storage.getRider(riderId);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }

      // Update rider with image path
      const imageFilename = req.file.filename;
      const image = `/images/riders/${imageFilename}`;

      const updatedRider = await storage.updateRider(riderId, { image });

      res.json({
        message: "Rider image uploaded successfully",
        rider: updatedRider,
      });
    } catch (error) {
      console.error("Error uploading rider image:", error);
      res.status(500).json({ message: "Failed to upload rider image" });
    }
  },
);

export default router;
