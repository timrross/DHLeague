import { Response } from "express";
import { storage } from "../storage";

// Admin middleware to check if user is an admin
export async function isAdmin(req: any, res: Response, next: Function) {
  try {
    const userId = req.oidc?.user?.sub;
    const user = await storage.getUser(userId);

    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ message: "Unauthorized. Admin access required." });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Server error" });
  }
}
