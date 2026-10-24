import { Router } from "express";
import {
    createCommunity,
    getCommunities,
    getCommunityBySlug,
    updateCommunity,
    deleteCommunity,
    joinCommunityHandler,
    leaveCommunityHandler,
    getCommunityMembers,
    searchCommunities
} from "../controllers/community.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require auth so we can compute isMember per user
router.use(verifyJWT);

router.get("/", getCommunities);
router.get("/search", searchCommunities);
router.get("/:slug", getCommunityBySlug);
router.get("/:id/members", getCommunityMembers);

router.post("/", createCommunity);
router.patch("/:id", updateCommunity);
router.delete("/:id", deleteCommunity);

router.post("/:id/join", joinCommunityHandler);
router.post("/:id/leave", leaveCommunityHandler);

export default router;
