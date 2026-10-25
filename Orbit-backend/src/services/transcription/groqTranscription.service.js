import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

let groqClient = null;

const MAX_SAFE_FILE_SIZE = 24 * 1024 * 1024; // 24 MB safe threshold (Groq upload limit is 25 MB)
const CHUNK_SEGMENT_SECONDS = 900; // 15-minute segments for large files

/**
 * Lazily initialize Groq client instance
 */
const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined in environment variables");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

/**
 * Splits a large audio file into ~15 minute MP3 segments without re-encoding.
 * @param {string} inputAudioPath
 * @param {number} [segmentSeconds=900]
 * @returns {Promise<string[]>} List of chunk file paths
 */
const splitAudioIntoChunks = (inputAudioPath, segmentSeconds = CHUNK_SEGMENT_SECONDS) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.dirname(inputAudioPath);
    const chunkPrefix = `chunk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_`;
    const pattern = path.join(outputDir, `${chunkPrefix}%03d.mp3`);

    console.log(`[GroqTranscription] Audio exceeds 24MB. Splitting into ${segmentSeconds}s chunks...`);

    ffmpeg(inputAudioPath)
      .outputOptions([
        "-f segment",
        `-segment_time ${segmentSeconds}`,
        "-c copy",
      ])
      .output(pattern)
      .on("error", (err) => {
        console.error("[GroqTranscription] Chunking failed:", err.message);
        reject(err);
      })
      .on("end", async () => {
        try {
          const allFiles = await fs.promises.readdir(outputDir);
          const chunkPaths = allFiles
            .filter((f) => f.startsWith(chunkPrefix) && f.endsWith(".mp3"))
            .sort()
            .map((f) => path.join(outputDir, f));

          console.log(`[GroqTranscription] Generated ${chunkPaths.length} chunk(s) for transcription.`);
          resolve(chunkPaths);
        } catch (err) {
          reject(err);
        }
      })
      .run();
  });
};

/**
 * Formats a duration in seconds into WebVTT timestamp format: HH:MM:SS.mmm
 * @param {number} totalSeconds
 * @returns {string} e.g. "00:01:23.450"
 */
export const formatVttTimestamp = (totalSeconds) => {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const totalMs = Math.round(safeSeconds * 1000);

  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;

  const pad = (num, len = 2) => String(num).padStart(len, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(milliseconds, 3)}`;
};

/**
 * Converts Whisper verbose_json segments into a valid WebVTT (.vtt) caption string.
 *
 * @param {Array<{ id: number, start: number, end: number, text: string }>} segments
 * @param {string} [rawTranscript=""] Fallback text if no segments are returned
 * @returns {string} WebVTT formatted caption string
 */
export const convertSegmentsToWebVTT = (segments, rawTranscript = "") => {
  let vtt = "WEBVTT\n\n";

  if (!segments || segments.length === 0) {
    if (rawTranscript && rawTranscript.trim()) {
      vtt += `1\n00:00:00.000 --> 00:00:10.000\n${rawTranscript.trim()}\n\n`;
    }
    return vtt;
  }

  segments.forEach((seg, index) => {
    const cueId = index + 1;
    const start = formatVttTimestamp(seg.start);
    const end = formatVttTimestamp(seg.end);
    const text = (seg.text || "").trim();

    vtt += `${cueId}\n${start} --> ${end}\n${text}\n\n`;
  });

  return vtt;
};

/**
 * Transcribes an audio file using Groq's whisper-large-v3-turbo model.
 * Automatically splits large audio (>24MB) into chunks to bypass Groq's 25MB limit.
 *
 * @param {string} audioFilePath - Absolute path to the 16kHz mono audio file.
 * @returns {Promise<{ transcript: string, captionVtt: string, duration: number, segments: Array }>}
 */
export const transcribeWithGroq = async (audioFilePath) => {
  const client = getGroqClient();

  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Audio file not found at path: ${audioFilePath}`);
  }

  const fileStats = fs.statSync(audioFilePath);
  const fileSize = fileStats.size;

  // Case 1: Standard file within Groq 25MB limit (under 24MB safe buffer)
  if (fileSize <= MAX_SAFE_FILE_SIZE) {
    console.log(`[Groq] Sending single audio file (${(fileSize / 1024 / 1024).toFixed(2)} MB) to Whisper API...`);

    const audioStream = fs.createReadStream(audioFilePath);
    const response = await client.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      temperature: 0.0,
    });

    const transcript = response.text || "";
    const captionVtt = convertSegmentsToWebVTT(response.segments, transcript);

    console.log(`[Groq] Transcription completed successfully. Length: ${transcript.length} characters`);

    return {
      transcript,
      captionVtt,
      duration: response.duration || 0,
      segments: response.segments || [],
    };
  }

  // Case 2: Large file (>24MB) — Split into 15-minute segments and transcribe each
  console.log(`[Groq] Audio size (${(fileSize / 1024 / 1024).toFixed(2)} MB) exceeds 24MB limit. Activating chunking engine...`);

  const chunkPaths = await splitAudioIntoChunks(audioFilePath);
  if (!chunkPaths || chunkPaths.length === 0) {
    throw new Error("Audio chunking failed: No chunks generated");
  }

  let cumulativeOffset = 0;
  const allSegments = [];
  const allTranscripts = [];

  try {
    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkPath = chunkPaths[i];
      console.log(`[Groq] Transcribing chunk ${i + 1}/${chunkPaths.length} (${path.basename(chunkPath)})...`);

      const chunkStream = fs.createReadStream(chunkPath);
      const response = await client.audio.transcriptions.create({
        file: chunkStream,
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json",
        temperature: 0.0,
      });

      const chunkText = (response.text || "").trim();
      if (chunkText) {
        allTranscripts.push(chunkText);
      }

      const chunkSegments = Array.isArray(response.segments) ? response.segments : [];
      for (const seg of chunkSegments) {
        allSegments.push({
          id: allSegments.length + 1,
          start: Math.round((seg.start + cumulativeOffset) * 100) / 100,
          end: Math.round((seg.end + cumulativeOffset) * 100) / 100,
          text: (seg.text || "").trim(),
        });
      }

      cumulativeOffset += Number(response.duration) || 0;
    }

    const fullTranscript = allTranscripts.join(" ");
    const captionVtt = convertSegmentsToWebVTT(allSegments, fullTranscript);

    console.log(
      `[Groq] Multi-chunk transcription completed. Total duration: ${cumulativeOffset.toFixed(1)}s, Segments: ${allSegments.length}`
    );

    return {
      transcript: fullTranscript,
      captionVtt,
      duration: cumulativeOffset,
      segments: allSegments,
    };
  } finally {
    // Clean up temporary chunk files
    for (const chunkPath of chunkPaths) {
      try {
        if (fs.existsSync(chunkPath)) {
          await fs.promises.unlink(chunkPath);
        }
      } catch (cleanErr) {
        console.warn(`[Groq] Warning cleaning chunk ${chunkPath}:`, cleanErr.message);
      }
    }
  }
};
