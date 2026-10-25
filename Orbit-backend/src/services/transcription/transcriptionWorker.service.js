import fs from "fs";
import { Video } from "../../models/video.model.js";
import { extractAudioForWhisper, safeUnlink } from "./audioExtractor.service.js";
import { transcribeWithGroq } from "./groqTranscription.service.js";
import { analyzeVideoById } from "../ai/index.js";
import { moderateVideoById } from "../moderation/index.js";

/**
 * Orchestrates post-upload audio extraction, Groq transcription,
 * WebVTT subtitle formatting, and database persistence.
 * 
 * After transcription completes, automatically triggers:
 *  1. AI Content Analysis (summary, chapters, advisory detection)
 *  2. Content Moderation (toxicity & shadow ban evaluation)
 *
 * Designed to execute asynchronously in the background without blocking HTTP responses.
 *
 * @param {string} videoId - The MongoDB ObjectId of the Video record.
 * @param {string} [videoFilePath=null] - The path to the uploaded local video file (or null to use videoFile URL).
 * @param {object} [options={}]
 * @param {boolean} [options.cleanVideoFile=false] - Whether to delete the source video file after processing.
 * @returns {Promise<void>}
 */
export const processVideoTranscription = async (videoId, videoFilePath = null, options = {}) => {
  let tempAudioPath = null;
  let hasLocalFile = false;

  console.log(`[TranscriptionWorker] Started job for videoId: ${videoId}`);

  try {
    const video = await Video.findById(videoId);
    if (!video) throw new Error(`Video not found with id: ${videoId}`);

    hasLocalFile = Boolean(videoFilePath && fs.existsSync(videoFilePath));
    const sourceMedia = hasLocalFile ? videoFilePath : video.videoFile;

    if (!sourceMedia) {
      throw new Error(`No local video file or Cloudinary URL found for videoId: ${videoId}`);
    }

    // 1. Mark status as 'processing'
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        transcription_status: "processing",
        transcription_error: null,
      },
    });

    // 2. Extract and downsample audio to 16 kHz mono MP3
    console.log(`[TranscriptionWorker] Extracting audio track from: ${sourceMedia}`);
    tempAudioPath = await extractAudioForWhisper(sourceMedia);

    // 3. Transcribe via Groq whisper-large-v3-turbo and generate WebVTT
    console.log(`[TranscriptionWorker] Sending audio to Groq Whisper API...`);
    const { transcript, captionVtt, segments } = await transcribeWithGroq(tempAudioPath);

    // 4. Update Video record with completed status, subtitles, and segments
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        transcript,
        caption_vtt: captionVtt,
        segments: segments || [],
        transcription_status: "completed",
        transcription_error: null,
      },
    });

    console.log(`[TranscriptionWorker] Successfully completed transcription for videoId: ${videoId}`);

    // ═══════════════════════════════════════════════════════════
    // 5. Trigger AI Analysis & Moderation in parallel (non-blocking)
    // ═══════════════════════════════════════════════════════════
    console.log(`[TranscriptionWorker] Dispatching AI analysis & moderation for videoId: ${videoId}`);

    // Run both concurrently — each handles its own errors
    Promise.allSettled([
      analyzeVideoById(videoId).catch((err) => {
        console.error(`[TranscriptionWorker] AI Analysis failed for ${videoId}:`, err.message);
      }),
      moderateVideoById(videoId).catch((err) => {
        console.error(`[TranscriptionWorker] Moderation failed for ${videoId}:`, err.message);
      }),
    ]).then((results) => {
      const analysisResult = results[0];
      const moderationResult = results[1];
      console.log(
        `[TranscriptionWorker] Post-transcription jobs finished for ${videoId}: ` +
        `Analysis=${analysisResult.status}, Moderation=${moderationResult.status}`
      );
    });

  } catch (error) {
    console.error(`[TranscriptionWorker] Failed processing videoId ${videoId}:`, error.message);

    // Update status to 'failed' in database for user/admin visibility
    try {
      await Video.findByIdAndUpdate(videoId, {
        $set: {
          transcription_status: "failed",
          transcription_error: error.message || "Unknown transcription error",
        },
      });
    } catch (dbErr) {
      console.error(`[TranscriptionWorker] Failed updating failure status in DB:`, dbErr.message);
    }

  } finally {
    // 6. Cleanup temporary audio file
    if (tempAudioPath) {
      await safeUnlink(tempAudioPath);
    }

    // Optional: cleanup original uploaded video if already uploaded to Cloudinary
    if (options.cleanVideoFile && hasLocalFile && videoFilePath) {
      await safeUnlink(videoFilePath);
    }
  }
};
