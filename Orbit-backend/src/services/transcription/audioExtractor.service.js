import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";

// Ensure ffmpeg points to the static binary or system PATH
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Extracts and downsamples the audio track from a video file into an optimized
 * 16 kHz mono MP3 file suitable for high-speed transcription with Groq Whisper.
 *
 * @param {string} inputVideoPath - Path to the local video file.
 * @returns {Promise<string>} Path to the generated lightweight temporary audio file.
 */
export const extractAudioForWhisper = (inputVideoPath) => {
  return new Promise((resolve, reject) => {
    if (!inputVideoPath) {
      return reject(new Error("inputVideoPath is required for audio extraction"));
    }

    // Create a uniquely named temporary file in OS temp directory
    const tempAudioFileName = `whisper_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.mp3`;
    const outputAudioPath = path.join(os.tmpdir(), tempAudioFileName);

    ffmpeg(inputVideoPath)
      .noVideo() // Remove video stream
      .audioCodec("libmp3lame") // Fast and compact MP3 codec
      .audioFrequency(16000) // 16 kHz sampling rate (Whisper internal default)
      .audioChannels(1) // Mono channel (halves audio data size)
      .audioBitrate("48k") // 48 kbps is optimal for speech clarity while keeping file size tiny
      .output(outputAudioPath)
      .on("start", (commandLine) => {
        console.log(`[FFmpeg] Started extraction: ${commandLine}`);
      })
      .on("error", (err, stdout, stderr) => {
        console.error("[FFmpeg] Audio extraction failed:", err.message);
        reject(new Error(`FFmpeg audio extraction error: ${err.message}`));
      })
      .on("end", () => {
        console.log(`[FFmpeg] Audio extracted successfully: ${outputAudioPath}`);
        resolve(outputAudioPath);
      })
      .run();
  });
};

/**
 * Safely removes a file from the filesystem if it exists.
 * Does not throw an error if the file has already been removed.
 *
 * @param {string} filePath - Path to file to be removed.
 */
export const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
    console.log(`[Cleanup] Deleted file: ${filePath}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn(`[Cleanup] Warning deleting ${filePath}:`, err.message);
    }
  }
};
