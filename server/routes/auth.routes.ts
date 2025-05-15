import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

const router = Router();

// Get current authenticated user
router.get("/user", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Check if user is admin
router.get("/admin", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user) {
      return res.json({ isAdmin: false });
    }

    res.json({ isAdmin: !!user.isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
