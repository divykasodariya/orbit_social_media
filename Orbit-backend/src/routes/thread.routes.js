import { Router } from "express";
import {
    createThread,
    getCommunityThreads,
    getThreadById,
    updateThread,
    deleteThread,
    voteThread,
    deleteVoteThread,
    addThreadComment,
    getThreadComments,
    reportItem
} from "../controllers/thread.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Publicly readable endpoints (if desired, or we can enforce auth everywhere)
// Since this is a social app, we allow reading if we want, but let's assume auth is needed for most interactions
// To match requirements, we'll enforce verifyJWT except for reading. Actually, the user asked to follow Orbit's conventions.

router.get("/community/:communityId", getCommunityThreads);
router.get("/:id", getThreadById);
router.get("/:id/comments", getThreadComments);

router.use(verifyJWT); // Secure the rest

router.post("/community/:communityId", createThread);
router.patch("/:id", updateThread);
router.delete("/:id", deleteThread);

// Voting
router.post("/:id/vote", voteThread);
router.delete("/:id/vote", deleteVoteThread);

// Comments
router.post("/:id/comments", addThreadComment);

// Reporting
router.post("/report", reportItem);

export default router;
