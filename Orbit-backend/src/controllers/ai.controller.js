import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { chatWithVideo, analyzeVideoById } from "../services/ai/index.js";
import { processVideoTranscription } from "../services/transcription/index.js";

/**
 * POST /api/v1/ai/chat/:videoId
 * RAG-powered video chatbot — answers questions based on the video's transcript.
 */
const askVideoQuestion = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { question, conversationHistory } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    throw new ApiError(400, "Question is required");
  }

  if (question.trim().length > 500) {
    throw new ApiError(400, "Question must be under 500 characters");
  }

  const result = await chatWithVideo(
    videoId,
    question.trim(),
    Array.isArray(conversationHistory) ? conversationHistory : []
  );

  return res.status(200).json(
    new ApiResponse(200, result, "AI response generated successfully")
  );
});

/**
 * GET /api/v1/ai/analysis/:videoId
 * Returns the AI analysis (summary, chapters, advisory) for a video.
 */
const getVideoAnalysis = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).select(
    "aiAnalysis aiAdvisory segments transcript transcription_status title"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        analysis: video.aiAnalysis || {},
        advisory: video.aiAdvisory || {},
        transcription_status: video.transcription_status,
        hasTranscript: Boolean(video.transcript),
        segmentCount: video.segments?.length || 0,
      },
      "Video AI analysis fetched successfully"
    )
  );
});

/**
 * POST /api/v1/ai/analyze/:videoId
 * Manually triggers AI analysis for a video (owner only).
 * If transcript is missing or previous transcription failed, auto-queues transcription.
 */
const triggerAnalysis = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the video owner can trigger analysis");
  }

  // If transcript is missing or transcription failed, dispatch background transcription
  if (!video.transcript || video.transcription_status === "failed") {
    console.log(`[AIController] Transcript missing or failed for ${videoId}. Dispatching transcription...`);
    setImmediate(() => {
      processVideoTranscription(video._id, null, { cleanVideoFile: false })
        .catch((err) => console.error("[AIController] Re-transcription failed:", err.message));
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { transcription_status: "processing" },
        "Transcription has been queued. AI analysis and moderation will run automatically upon completion."
      )
    );
  }

  const result = await analyzeVideoById(videoId);

  return res.status(200).json(
    new ApiResponse(200, result, "AI analysis completed successfully")
  );
});

/**
 * GET /api/v1/ai/transcript/:videoId
 * Returns the interactive timestamped transcript segments for a video.
 */
const getVideoTranscriptSegments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).select(
    "segments transcript transcription_status"
  );

  if (!video) throw new ApiError(404, "Video not found");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        segments: video.segments || [],
        transcription_status: video.transcription_status,
        hasTranscript: Boolean(video.transcript),
      },
      "Transcript segments fetched successfully"
    )
  );
});

export {
  askVideoQuestion,
  getVideoAnalysis,
  triggerAnalysis,
  getVideoTranscriptSegments,
};
