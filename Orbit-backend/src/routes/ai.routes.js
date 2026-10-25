import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  askVideoQuestion,
  getVideoAnalysis,
  triggerAnalysis,
  getVideoTranscriptSegments,
} from "../controllers/ai.controller.js";

const router = Router();

/* ================= PUBLIC ROUTES ================= */

// Get AI analysis (summary, chapters, advisory) for a video
router.get("/analysis/:videoId", getVideoAnalysis);

// Get interactive transcript segments
router.get("/transcript/:videoId", getVideoTranscriptSegments);

/* ================= PROTECTED ROUTES ================= */

// RAG Chatbot: ask a question about a video
router.post("/chat/:videoId", verifyJWT, askVideoQuestion);

// Manually trigger AI analysis (video owner only)
router.post("/analyze/:videoId", verifyJWT, triggerAnalysis);

export default router;
