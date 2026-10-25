import Groq from "groq-sdk";
import fs from "fs";

let groqClient = null;

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

    // Cue structure:
    // 1
    // 00:00:01.000 --> 00:00:04.500
    // Subtitle text here
    vtt += `${cueId}\n${start} --> ${end}\n${text}\n\n`;
  });

  return vtt;
};

/**
 * Transcribes an audio file using Groq's whisper-large-v3-turbo model.
 *
 * @param {string} audioFilePath - Absolute path to the 16kHz mono audio file.
 * @returns {Promise<{ transcript: string, captionVtt: string, duration: number }>}
 */
export const transcribeWithGroq = async (audioFilePath) => {
  const client = getGroqClient();

  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Audio file not found at path: ${audioFilePath}`);
  }

  const audioStream = fs.createReadStream(audioFilePath);

  console.log(`[Groq] Requesting transcription via whisper-large-v3-turbo...`);

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
};
