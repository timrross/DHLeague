import { Router } from "express";
import { requireAuth } from "../auth";
import {
  getFriends,
  getPendingRequests,
  getPendingRequestCount,
  getFriendStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "../controllers/friends.controller";

const router = Router();

// All friend routes require authentication
router.use(requireAuth);

// List current user's friends
router.get("/", getFriends);

// List pending friend requests
router.get("/pending", getPendingRequests);

// Get pending request count for badge
router.get("/pending/count", getPendingRequestCount);

// Get status with specific user
router.get("/status/:userId", getFriendStatus);

// Send friend request
router.post("/request/:userId", sendFriendRequest);

// Accept friend request
router.post("/accept/:requestId", acceptFriendRequest);

// Reject friend request
router.delete("/reject/:requestId", rejectFriendRequest);

// Remove friend
router.delete("/:friendId", removeFriend);

export default router;
