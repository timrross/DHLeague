import { Request, Response } from "express";
import { storage } from "../storage";
import { sendFriendRequestEmail } from "../services/email/friendRequests";

/**
 * Get the current user's friends list
 */
export async function getFriends(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const friends = await storage.getFriends(userId);
    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Failed to fetch friends" });
  }
}

/**
 * Get pending friend requests for the current user
 */
export async function getPendingRequests(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await storage.getPendingFriendRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Failed to fetch pending requests" });
  }
}

/**
 * Get count of pending friend requests for badge display
 */
export async function getPendingRequestCount(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await storage.getPendingRequestCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    res.status(500).json({ message: "Failed to fetch pending count" });
  }
}

/**
 * Get friendship status with a specific user
 */
export async function getFriendStatus(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId: otherUserId } = req.params;
    if (!otherUserId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (userId === otherUserId) {
      return res.status(400).json({ message: "Cannot check friend status with yourself" });
    }

    const status = await storage.getFriendStatus(userId, otherUserId);
    res.json({ status });
  } catch (error) {
    console.error("Error fetching friend status:", error);
    res.status(500).json({ message: "Failed to fetch friend status" });
  }
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId: addresseeId } = req.params;
    if (!addresseeId) {
      return res.status(400).json({ message: "User ID required" });
    }

    if (userId === addresseeId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Verify addressee exists
    const addressee = await storage.getUser(addresseeId);
    if (!addressee) {
      return res.status(404).json({ message: "User not found" });
    }

    const friend = await storage.sendFriendRequest(userId, addresseeId);

    if (addressee.email) {
      try {
        const requester = await storage.getUser(userId);
        const requesterName =
          requester?.usernameConfirmed && requester.username
            ? requester.username
            : null;
        await sendFriendRequestEmail({
          requesterName,
          recipientEmail: addressee.email,
        });
      } catch (emailError) {
        console.warn("Friend request email failed:", emailError);
      }
    }
    res.status(201).json(friend);
  } catch (error) {
    if (error instanceof Error && error.message === "Friend relationship already exists") {
      return res.status(409).json({ message: error.message });
    }
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Failed to send friend request" });
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestId = parseInt(req.params.requestId, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const friend = await storage.acceptFriendRequest(userId, requestId);
    res.json(friend);
  } catch (error) {
    if (error instanceof Error && error.message === "Friend request not found or already processed") {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Failed to accept friend request" });
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestId = parseInt(req.params.requestId, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const success = await storage.rejectFriendRequest(userId, requestId);
    if (!success) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: "Failed to reject friend request" });
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(req: Request, res: Response) {
  try {
    const userId = req.oidc?.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const friendId = parseInt(req.params.friendId, 10);
    if (isNaN(friendId)) {
      return res.status(400).json({ message: "Invalid friend ID" });
    }

    const success = await storage.removeFriend(userId, friendId);
    if (!success) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ message: "Failed to remove friend" });
  }
}
