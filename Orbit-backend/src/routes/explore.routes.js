import { Router } from "express";
import { getExploreFeed, getExploreHighlights } from "../controllers/explore.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Allow optional auth for explore? 
// If we want personalized exclusion of followed creators, auth is needed.
// So let's use verifyJWT but allow it to continue if token is missing? 
// The app uses verifyJWT which strictly requires token. 
// Assuming the user is logged in to use Explore page based on the app's design.
router.use(verifyJWT);

router.get("/feed", getExploreFeed);
router.get("/highlights", getExploreHighlights);

export default router;
