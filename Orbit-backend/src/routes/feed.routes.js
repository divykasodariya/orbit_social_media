import { Router } from "express";
import { getHomeFeed } from "../controllers/feed.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Feed endpoints require authentication to provide personalized results
router.use(verifyJWT);

router.get("/", getHomeFeed);

export default router;
