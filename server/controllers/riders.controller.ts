import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Get all riders
 */
export async function getRiders(req: Request, res: Response) {
  try {
    const riders = await storage.getRiders();
    res.json(riders);
  } catch (error) {
    console.error("Error fetching riders:", error);
    res.status(500).json({ message: "Failed to fetch riders" });
  }
}

/**
 * Get a rider by ID (numeric or string rider ID)
 */
export async function getRiderById(req: Request, res: Response) {
  try {
    const riderId = Number(req.params.id);
    if (isNaN(riderId)) {
      // This could be a rider ID string instead of a numeric ID
      const rider = await storage.getRiderByRiderId(req.params.id);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      return res.json(rider);
    }

    const rider = await storage.getRider(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.json(rider);
  } catch (error) {
    console.error("Error fetching rider:", error);
    res.status(500).json({ message: "Failed to fetch rider" });
  }
}

/**
 * Create a new rider
 */
export async function createRider(req: Request, res: Response) {
  try {
    const rider = await storage.createRider(req.body);
    res.status(201).json(rider);
  } catch (error) {
    console.error("Error creating rider:", error);
    res.status(500).json({ 
      message: "Failed to create rider",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update an existing rider
 */
export async function updateRider(req: Request, res: Response) {
  try {
    const riderId = Number(req.params.id);
    if (isNaN(riderId)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const riderData = req.body;
    // Map any mismatched field names
    if (
      riderData.profileImageUrl !== undefined &&
      riderData.image === undefined
    ) {
      riderData.image = riderData.profileImageUrl;
    }

    // Map any numeric fields that might come as strings
    if (riderData.cost) riderData.cost = Number(riderData.cost);
    if (riderData.points) riderData.points = Number(riderData.points);
    if (riderData.lastYearStanding)
      riderData.lastYearStanding = Number(riderData.lastYearStanding);

    // Debug the data being sent
    console.log("Updating rider with data:", riderData);

    // Check if there's at least one valid property to update
    const hasValidFields = Object.values(riderData).some(
      (val) => val !== undefined && val !== null && val !== "",
    );

    if (!hasValidFields) {
      return res.status(400).json({
        message: "No valid fields provided for update",
        error: "At least one field must have a value",
      });
    }

    try {
      const updatedRider = await storage.updateRider(
        riderId,
        riderData,
      );

      if (!updatedRider) {
        return res.status(404).json({ message: "Rider not found" });
      }

      res.json(updatedRider);
    } catch (error: any) {
      if (
        error.message &&
        error.message.includes("No values to set")
      ) {
        return res.status(400).json({
          message: "No valid fields provided for update",
          error: error.message,
        });
      }
      throw error; // Let the outer catch handle other errors
    }
  } catch (error) {
    console.error("Error updating rider:", error);
    res.status(500).json({
      message: "Failed to update rider",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Delete a rider (Not implemented)
 */
export async function deleteRider(req: Request, res: Response) {
  try {
    // Add a deleteRider method to the storage interface and implementation
    // For now, we'll return 501 Not Implemented
    res.status(501).json({
      message: "Delete rider functionality not implemented yet",
    });
  } catch (error) {
    console.error("Error deleting rider:", error);
    res.status(500).json({
      message: "Failed to delete rider",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get riders by gender
 */
export async function getRidersByGender(req: Request, res: Response) {
  try {
    const gender = req.params.gender;

    if (gender !== "male" && gender !== "female") {
      return res
        .status(400)
        .json({ message: "Gender must be 'male' or 'female'" });
    }

    const riders = await storage.getRidersByGender(gender);
    res.json(riders);
  } catch (error) {
    console.error("Error fetching riders by gender:", error);
    res.status(500).json({ message: "Failed to fetch riders" });
  }
}