import { Router } from "express";
import { getUserRecommendations, getCommunityRecommendations } from "../controllers/recommendation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/users", getUserRecommendations);
router.get("/communities", getCommunityRecommendations);

export default router;
