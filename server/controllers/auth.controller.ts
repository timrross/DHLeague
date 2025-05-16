import { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin(req: Request, res: Response) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ isAdmin: user.isAdmin || false });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to check admin status" });
  }
}