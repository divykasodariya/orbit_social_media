import Groq from "groq-sdk";
import { Video } from "../../models/video.model.js";

let groqClient = null;

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

// Models in preference order (supports 120B flagship and 27B high-speed models)
const CANDIDATE_MODELS = [
  process.env.ANALYSIS_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

/**
 * System prompt that instructs the LLM to produce a multi-task analysis
 * covering: Summary + Key Points + Smart Chapters + Advisory detection.
 * 
 * The LLM receives the video title, description, and full timestamped transcript.
 */
const ANALYSIS_SYSTEM_PROMPT = `You are "Orbit AI Analyst", an advanced content intelligence system for the Orbit video platform.

Given a video's Title, Description, and Timestamped Transcript, you MUST perform ALL of the following tasks in a SINGLE response:

═══════════════════════════════════════
TASK 1: SUMMARY & KEY POINTS
═══════════════════════════════════════
- "tldr": A crisp 2-sentence executive summary of the video.
- "keyPoints": An array of 3-5 concise, actionable takeaway bullet points (each a single sentence).

═══════════════════════════════════════
TASK 2: SMART CHAPTERS
═══════════════════════════════════════
- "chapters": An array of chapter objects representing the major topic shifts in the video.
  Each chapter must have:
  - "timestamp": the start time in seconds (integer)
  - "formattedTime": the human-readable time string (e.g., "02:05")
  - "title": a short descriptive chapter title (4-8 words max)
- Generate between 3 and 10 chapters, depending on the video length and content diversity.
- The first chapter should always start at timestamp 0.
- Use the timestamps from the transcript segments to determine accurate chapter boundaries.

═══════════════════════════════════════
TASK 3: ADVISORY / SENSITIVE CLAIMS DETECTION
═══════════════════════════════════════
Detect if the speaker makes authoritative claims in these categories WITHOUT proper accredited disclaimers:
- Medical/Health: Prescribing treatments, cures, diagnoses, or telling viewers to stop medications.
- Financial: Promising specific returns, guaranteed profits, or investment schemes.
- Legal: Providing specific legal advice as if licensed.

If such claims are detected:
- "hasAdvisory": true
- "category": one of "medical", "financial", "legal"
- "riskLevel": "high" (dangerous if followed), "medium" (potentially misleading), or "low" (minor concern)
- "disclaimerTitle": A short title like "Health Information Notice" or "Financial Advice Disclaimer"
- "disclaimerMessage": A 1-2 sentence warning message for viewers (professional, neutral tone).

If the content is safe or already includes proper disclaimers:
- "hasAdvisory": false
- "category": "none"
- "riskLevel": "none"
- "disclaimerTitle": null
- "disclaimerMessage": null

═══════════════════════════════════════
OUTPUT FORMAT (strict JSON)
═══════════════════════════════════════
{
  "tldr": "...",
  "keyPoints": ["...", "..."],
  "chapters": [
    { "timestamp": 0, "formattedTime": "00:00", "title": "Introduction" },
    { "timestamp": 125, "formattedTime": "02:05", "title": "Setting Up the Database" }
  ],
  "advisory": {
    "hasAdvisory": false,
    "category": "none",
    "riskLevel": "none",
    "disclaimerTitle": null,
    "disclaimerMessage": null
  }
}

IMPORTANT RULES:
- Always respond in STRICT valid JSON. No markdown, no explanation, only JSON.
- If the transcript is very short or empty, still provide a best-effort summary from the title and description.
- Chapter timestamps must be integers (seconds).
- Be conservative with advisory flags: only flag genuine authoritative claims, not casual opinions.`;

const MAX_PROMPT_CHARS = 12000; // ~3000 tokens, safe for Groq 7,000-8,000 TPM limit

/**
 * Formats timestamped segments into a readable transcript string for the LLM prompt.
 * If the transcript is long (>12000 chars), smartly buckets segments by time windows
 * across the video to preserve full timeline context from 00:00 to end without exceeding TPM limits.
 * @param {Array<{start: number, end: number, text: string}>} segments
 * @returns {string}
 */
const formatSegmentsForPrompt = (segments) => {
  if (!segments || segments.length === 0) return "[No transcript available]";

  const rawLines = segments.map((seg) => {
    const mins = Math.floor(seg.start / 60);
    const secs = Math.floor(seg.start % 60);
    const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `[${time}] ${seg.text.trim()}`;
  });

  const fullText = rawLines.join("\n");
  if (fullText.length <= MAX_PROMPT_CHARS) {
    return fullText;
  }

  // Large video handling: Bucket segments evenly across the video timeline
  const lastSeg = segments[segments.length - 1];
  const totalDuration = (lastSeg && lastSeg.end) ? lastSeg.end : (segments.length * 5);
  const desiredBuckets = 50; // ~50 timestamped narrative anchor points
  const bucketWindow = Math.max(30, Math.ceil(totalDuration / desiredBuckets));

  const buckets = {};
  for (const seg of segments) {
    const bucketIdx = Math.floor(seg.start / bucketWindow);
    if (!buckets[bucketIdx]) {
      buckets[bucketIdx] = { start: seg.start, texts: [] };
    }
    if (buckets[bucketIdx].texts.length < 2) {
      buckets[bucketIdx].texts.push(seg.text.trim());
    }
  }

  const condensedLines = Object.values(buckets).map((b) => {
    const mins = Math.floor(b.start / 60);
    const secs = Math.floor(b.start % 60);
    const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `[${time}] ${b.texts.join(" ")}`;
  });

  return condensedLines.join("\n").slice(0, MAX_PROMPT_CHARS);
};

/**
 * Formats a timestamp in seconds to MM:SS or HH:MM:SS format.
 * @param {number} totalSeconds
 * @returns {string}
 */
const formatTimestamp = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Runs the multi-task AI analysis on a video's content.
 *
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.transcript=""]
 * @param {Array<{start: number, end: number, text: string}>} [params.segments=[]]
 * @returns {Promise<{ tldr, keyPoints, chapters, advisory }>}
 */
export const analyzeVideoContent = async ({
  title = "",
  description = "",
  transcript = "",
  segments = [],
}) => {
  const client = getGroqClient();

  const formattedTranscript = segments.length > 0
    ? formatSegmentsForPrompt(segments)
    : transcript.trim() || "[No transcript available]";

  const userContent = [
    `Title: ${title.trim() || "[No title provided]"}`,
    `Description: ${description.trim() || "[No description provided]"}`,
    `\nTimestamped Transcript:\n${formattedTranscript}`,
  ].join("\n\n");

  let lastError = null;
  const modelsToTry = [...new Set(CANDIDATE_MODELS.filter(Boolean))];

  for (const model of modelsToTry) {
    try {
      console.log(`[AIAnalysis] Running multi-task analysis with model: ${model}...`);

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.15,
        max_tokens: 4096,
      });

      const rawJson = completion.choices?.[0]?.message?.content;
      if (!rawJson) throw new Error("Empty response from AI analysis model");

      const parsed = JSON.parse(rawJson);

      // Sanitize and normalize chapters
      const chapters = Array.isArray(parsed.chapters)
        ? parsed.chapters.map((ch) => ({
            timestamp: Math.max(0, Math.floor(Number(ch.timestamp) || 0)),
            formattedTime: formatTimestamp(Number(ch.timestamp) || 0),
            title: String(ch.title || "Untitled").slice(0, 100),
          }))
        : [];

      // Sanitize advisory
      const advisory = parsed.advisory || {};
      const validCategories = ["medical", "financial", "legal", "none"];
      const validRiskLevels = ["high", "medium", "low", "none"];

      const result = {
        tldr: String(parsed.tldr || "").slice(0, 500),
        keyPoints: Array.isArray(parsed.keyPoints)
          ? parsed.keyPoints.map((p) => String(p).slice(0, 300)).slice(0, 7)
          : [],
        chapters: chapters.sort((a, b) => a.timestamp - b.timestamp),
        advisory: {
          hasAdvisory: Boolean(advisory.hasAdvisory),
          category: validCategories.includes(advisory.category) ? advisory.category : "none",
          riskLevel: validRiskLevels.includes(advisory.riskLevel) ? advisory.riskLevel : "none",
          disclaimerTitle: advisory.hasAdvisory ? String(advisory.disclaimerTitle || "Content Advisory").slice(0, 200) : null,
          disclaimerMessage: advisory.hasAdvisory ? String(advisory.disclaimerMessage || "").slice(0, 500) : null,
        },
      };

      console.log(
        `[AIAnalysis] Completed successfully. ` +
        `TL;DR length: ${result.tldr.length}, ` +
        `Chapters: ${result.chapters.length}, ` +
        `Advisory: ${result.advisory.hasAdvisory ? result.advisory.category : "none"}`
      );

      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[AIAnalysis] Model ${model} failed: ${err.message}. Trying next...`);
    }
  }

  throw new Error(`All AI analysis models failed. Last error: ${lastError?.message}`);
};

/**
 * Runs AI analysis on a video by ID and persists results to MongoDB.
 * Designed to run asynchronously after transcription completes.
 *
 * @param {string} videoId - MongoDB ObjectId of the video
 * @returns {Promise<object>} The analysis results
 */
export const analyzeVideoById = async (videoId) => {
  console.log(`[AIAnalysis] Starting analysis for videoId: ${videoId}`);

  const video = await Video.findById(videoId);
  if (!video) throw new Error(`Video not found with id: ${videoId}`);

  // Mark as processing
  await Video.findByIdAndUpdate(videoId, {
    $set: { "aiAnalysis.analysisStatus": "processing" },
  });

  try {
    const analysis = await analyzeVideoContent({
      title: video.title,
      description: video.description,
      transcript: video.transcript || "",
      segments: video.segments || [],
    });

    // Persist analysis results
    await Video.findByIdAndUpdate(videoId, {
      $set: {
        "aiAnalysis.tldr": analysis.tldr,
        "aiAnalysis.keyPoints": analysis.keyPoints,
        "aiAnalysis.chapters": analysis.chapters,
        "aiAnalysis.analysisStatus": "completed",
        "aiAdvisory.hasAdvisory": analysis.advisory.hasAdvisory,
        "aiAdvisory.category": analysis.advisory.category,
        "aiAdvisory.riskLevel": analysis.advisory.riskLevel,
        "aiAdvisory.disclaimerTitle": analysis.advisory.disclaimerTitle,
        "aiAdvisory.disclaimerMessage": analysis.advisory.disclaimerMessage,
      },
    });

    console.log(`[AIAnalysis] Persisted analysis results for videoId: ${videoId}`);
    return analysis;
  } catch (err) {
    console.error(`[AIAnalysis] Failed for videoId ${videoId}:`, err.message);

    await Video.findByIdAndUpdate(videoId, {
      $set: { "aiAnalysis.analysisStatus": "failed" },
    }).catch((dbErr) =>
      console.error("[AIAnalysis] Failed to write error status:", dbErr.message)
    );

    throw err;
  }
};
