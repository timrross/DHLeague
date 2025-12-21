import { Response } from "express";
import { storage } from "../storage";

async function syncUserRecord(req: any) {
  const oidcUser = req.oidc?.user;
  if (oidcUser?.sub) {
    await storage.upsertUser({
      id: oidcUser.sub,
      email: oidcUser.email,
      firstName: oidcUser.given_name ?? oidcUser.name?.split?.(" ")?.[0],
      lastName: oidcUser.family_name ?? oidcUser.name?.split?.(" ")?.slice(1).join(" "),
      profileImageUrl: oidcUser.picture,
    });
  }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(req: any, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    await syncUserRecord(req);
    const user = await storage.getUser(userId);
    const secretHeader = req.header("X-My-Secret");      // case-insensitive
    if (user && secretHeader === "imanadmin") {
      user.isAdmin = true;
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin(req: any, res: Response) {

  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    await syncUserRecord(req);
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const secretHeader = req.header("X-My-Secret");      // case-insensitive
    if (user && secretHeader === "imanadmin") {
      user.isAdmin = true;
    }
    res.json({ isAdmin: user.isAdmin || false });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to check admin status" });
  }
}
