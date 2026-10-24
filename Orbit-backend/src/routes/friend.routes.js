import { Router } from "express";
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriendHandler,
    getFriends,
    getFriendRequests,
    getUserFriends,
    getUserFollowers,
    getUserFollowing,
    getMutualFriends,
    getConnectionPath
} from "../controllers/friend.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const friendRouter = Router();
const userGraphRouter = Router();

// Require authentication
friendRouter.use(verifyJWT);
userGraphRouter.use(verifyJWT);

// --- /friends routes ---
friendRouter.post("/request/:userId", sendFriendRequest);
friendRouter.post("/request/:requestId/accept", acceptFriendRequest);
friendRouter.post("/request/:requestId/reject", rejectFriendRequest);
friendRouter.delete("/request/:requestId", cancelFriendRequest);
friendRouter.delete("/:userId", removeFriendHandler);
friendRouter.get("/", getFriends);
friendRouter.get("/requests", getFriendRequests);

// --- /users routes ---
userGraphRouter.get("/:id/friends", getUserFriends);
userGraphRouter.get("/:id/followers", getUserFollowers);
userGraphRouter.get("/:id/following", getUserFollowing);
userGraphRouter.get("/:id/mutual-friends", getMutualFriends);
userGraphRouter.get("/:id/connection-path", getConnectionPath);

export { friendRouter, userGraphRouter };
