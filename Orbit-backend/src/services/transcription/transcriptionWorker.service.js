import { Video } from "../../models/video.model.js";
import { extractAudioForWhisper, safeUnlink } from "./audioExtractor.service.js";
import { transcribeWithGroq } from "./groqTranscription.service.js";

/**
 * Orchestrates post-upload audio extraction, Groq transcription,
 * WebVTT subtitle formatting, and database persistence.
 *
 * Designed to execute asynchronously in the background without blocking HTTP responses.
 *
 * @param {string} videoId - The MongoDB ObjectId of the Video record.
 * @param {string} videoFilePath - The path to the uploaded local video file.
 * @param {object} [options={}]
 * @param {boolean} [options.cleanVideoFile=false] - Whether to delete the source video file after processing.
 * @returns {Promise<void>}
 */
export const processVideoTranscription = async (videoId, videoFilePath, options = {}) => {
  let tempAudioPath = null;

  console.log(`[TranscriptionWorker] Started job for videoId: ${videoId}`);

  try {
    // 1. Mark status as 'processing'
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        transcription_status: "processing",
        transcription_error: null,
      },
    });

    // 2. Extract and downsample audio to 16 kHz mono MP3
    console.log(`[TranscriptionWorker] Extracting audio track from: ${videoFilePath}`);
    tempAudioPath = await extractAudioForWhisper(videoFilePath);

    // 3. Transcribe via Groq whisper-large-v3-turbo and generate WebVTT
    console.log(`[TranscriptionWorker] Sending audio to Groq Whisper API...`);
    const { transcript, captionVtt } = await transcribeWithGroq(tempAudioPath);

    // 4. Update Video record with completed status and subtitles
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        transcript,
        caption_vtt: captionVtt,
        transcription_status: "completed",
        transcription_error: null,
      },
    });

    console.log(`[TranscriptionWorker] Successfully completed transcription for videoId: ${videoId}`);

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
    // 5. Cleanup temporary audio file
    if (tempAudioPath) {
      await safeUnlink(tempAudioPath);
    }

    // Optional: cleanup original uploaded video if already uploaded to Cloudinary
    if (options.cleanVideoFile && videoFilePath) {
      await safeUnlink(videoFilePath);
    }
  }
};
