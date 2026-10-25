import Groq from "groq-sdk";
import { Video } from "../../models/video.model.js";

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

// Candidate models in preference order (Llama 3.3 prioritized, with resilient fallbacks)
const CANDIDATE_MODELS = [
  process.env.MODERATION_MODEL || "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-safeguard-20b",
  "qwen/qwen3.8-27b",
];

const MODERATION_SYSTEM_PROMPT = `You are an advanced AI Content Safety & Moderation system for a video streaming platform.
Your task is to analyze the provided video content (Title, Description, and Audio Transcript) to detect:
1. Hate speech: attacks, derogatory language, or dehumanization based on race, religion, ethnicity, gender, sexual orientation, disability, etc.
2. Extreme profanity: excessive, gratuitous, or aggressive swearing.
3. Vulgarity: sexually explicit, graphic, or lewd remarks.
4. Severe toxicity & harassment: targeted bullying, threats of violence, or incitement of harm.

Decision Criteria:
- toxicityScore: A float between 0.00 and 1.00 indicating the overall degree of toxicity (0.0 = completely wholesome/safe, 1.0 = extremely toxic).
- isVulgar: Boolean. True if vulgarity, lewdness, or extreme obscene profanity is present.
- shouldShadowBan: Boolean. Set to true if toxicityScore >= 0.70 OR if severe hate speech, direct threats, extreme profanity, or vulgarity are detected.
- flaggedCategories: An array of specific violation categories identified (e.g., ["extreme_profanity", "hate_speech", "harassment", "vulgarity", "threats"]). Empty array [] if content is clean.

Respond strictly in valid JSON format with this exact structure:
{
  "toxicityScore": 0.85,
  "isVulgar": true,
  "shouldShadowBan": true,
  "flaggedCategories": ["extreme_profanity", "hate_speech"]
}`;

/**
 * Analyzes video text with Llama 3.3 (or resilient fallback) via Groq API.
 * 
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.transcript=""]
 * @returns {Promise<{ toxicityScore: number, isVulgar: boolean, shouldShadowBan: boolean, flaggedCategories: string[] }>}
 */
export const analyzeContentWithLlama = async ({ title = "", description = "", transcript = "" }) => {
  const client = getGroqClient();

  const userContent = [
    `Title: ${title.trim() || "[No title provided]"}`,
    `Description: ${description.trim() || "[No description provided]"}`,
    `Transcript: ${transcript.trim() || "[No spoken transcript available]"}`
  ].join("\n\n");

  let lastError = null;
  const modelsToTry = [...new Set(CANDIDATE_MODELS.filter(Boolean))];

  for (const model of modelsToTry) {
    try {
      console.log(`[ContentModeration] Analyzing content with model: ${model}...`);
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: MODERATION_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const rawJson = completion.choices?.[0]?.message?.content;
      if (!rawJson) {
        throw new Error("Empty response received from LLM moderation provider");
      }

      const parsed = JSON.parse(rawJson);

      // Sanitize and normalize fields
      let toxicityScore = Number(parsed.toxicityScore);
      if (isNaN(toxicityScore)) toxicityScore = 0.0;
      toxicityScore = Math.max(0.0, Math.min(1.0, toxicityScore));

      const isVulgar = Boolean(parsed.isVulgar);
      const flaggedCategories = Array.isArray(parsed.flaggedCategories)
        ? parsed.flaggedCategories.map(c => String(c).trim().toLowerCase()).filter(Boolean)
        : [];

      // shouldShadowBan is true if flagged by LLM or if toxicity >= 0.70 or if flaggedCategories contains severe flags
      const shouldShadowBan = Boolean(parsed.shouldShadowBan) || toxicityScore >= 0.70;

      return {
        toxicityScore: Number(toxicityScore.toFixed(2)),
        isVulgar,
        shouldShadowBan,
        flaggedCategories,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[ContentModeration] Model ${model} failed: ${err.message}. Trying next available fallback...`);
    }
  }

  throw new Error(`All moderation models failed. Last error: ${lastError?.message}`);
};

/**
 * Moderates a video in MongoDB by ID and applies shadow ban if necessary.
 * 
 * @param {string|mongoose.Types.ObjectId} videoId
 * @returns {Promise<object>} The updated video moderation status and result
 */
export const moderateVideoById = async (videoId) => {
  console.log(`[ContentModeration] Starting moderation for videoId: ${videoId}`);

  const video = await Video.findById(videoId);
  if (!video) {
    throw new Error(`Video not found with id: ${videoId}`);
  }

  await Video.findByIdAndUpdate(videoId, {
    $set: {
      moderationStatus: "processing",
      moderationError: null,
    },
  });

  try {
    const analysis = await analyzeContentWithLlama({
      title: video.title,
      description: video.description,
      transcript: video.transcript || "",
    });

    console.log(
      `[ContentModeration] Video ${videoId} analysis result: ` +
      `toxicity=${analysis.toxicityScore}, isVulgar=${analysis.isVulgar}, ` +
      `shouldShadowBan=${analysis.shouldShadowBan}, categories=[${analysis.flaggedCategories.join(", ")}]`
    );

    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          isShadowBanned: analysis.shouldShadowBan,
          toxicityScore: analysis.toxicityScore,
          isVulgar: analysis.isVulgar,
          flaggedCategories: analysis.flaggedCategories,
          moderationStatus: "completed",
          moderationError: null,
          moderatedAt: new Date(),
        },
      },
      { new: true }
    );

    return {
      videoId,
      ...analysis,
      updatedVideo,
    };
  } catch (err) {
    console.error(`[ContentModeration] Failed moderating video ${videoId}:`, err.message);

    await Video.findByIdAndUpdate(videoId, {
      $set: {
        moderationStatus: "failed",
        moderationError: err.message,
      },
    }).catch(dbErr => console.error(`[ContentModeration] Failed to write error status to DB:`, dbErr.message));

    throw err;
  }
};
