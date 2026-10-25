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

// Candidate models in preference order
const CANDIDATE_MODELS = [
  process.env.MODERATION_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-safeguard-20b",
  "openai/gpt-oss-20b",
];

const MODERATION_SYSTEM_PROMPT = `You are an advanced AI Content Safety & Moderation system for a video streaming platform called Orbit.
Your task is to analyze the provided video content (Title, Description, and Audio Transcript) and detect ANY harmful, dangerous, or violating content across ALL of the following categories:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY DEFINITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. hate_speech
   Derogatory, dehumanizing, or threatening language targeting individuals or groups based on race, ethnicity, religion, nationality, gender, sexual orientation, disability, caste, or socioeconomic status.
   Examples: slurs, calling a group subhuman, calling for discrimination.

2. extreme_profanity
   Excessive, aggressive, or weaponized use of swear words — especially when directed at individuals or used to demean. Casual mild profanity alone does NOT trigger this.

3. vulgarity
   Sexually explicit language, graphic descriptions of sexual acts, lewd commentary, or obscene sexual content.

4. harassment_bullying
   Targeted personal attacks, sustained mocking, doxxing (sharing private personal info), cyberbullying, or shaming specific individuals.

5. threats_violence
   Direct or implied threats of physical harm, incitement to violence, glorification of real-world violence, or calls for harm against specific people or groups.

6. self_harm_promotion
   Encouraging, instructing, or glorifying suicide, self-injury, eating disorders (pro-ana/pro-mia), or dangerous self-destructive behaviors.

7. dangerous_challenges
   Promotion of viral dangerous challenges or stunts (e.g., choking challenge, Tide Pod eating, blackout challenge) that could cause physical harm if imitated.

8. radicalization_extremism
   Propaganda, recruitment, or glorification of terrorist organizations, violent extremist ideologies, cults, or calls for political violence.

9. scam_fraud
   Promotion of get-rich-quick schemes, fake investment platforms, phishing, identity theft, pyramid/Ponzi schemes, or fraudulent financial offers.

10. dangerous_misinformation
    Actively dangerous false health claims (e.g., "bleach cures COVID", "stop taking insulin", "vaccines cause autism") that could lead to injury or death if followed.

11. child_safety
    Any content that sexualizes, endangers, exploits, or inappropriately involves minors. Zero tolerance — even indirect references.

12. animal_cruelty
    Glorification, instruction, or graphic depiction of abuse, torture, or killing of animals for entertainment.

13. privacy_doxxing
    Sharing or encouraging others to share private personal information (addresses, phone numbers, SSNs, financial details) of real individuals without consent.

14. weapons_illegal_activity
    Detailed instructions for creating illegal weapons, explosives, drugs, or committing crimes (hacking tutorials for malicious use, weapon modifications, drug synthesis).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING & DECISION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- toxicityScore: Float 0.00–1.00. Represents overall severity of ALL violations combined.
  0.0–0.29 = Clean / Safe
  0.30–0.49 = Mild concern (flag but don't ban)
  0.50–0.69 = Moderate violation (flag, review recommended)
  0.70–1.00 = Severe violation (shadow ban)

- isVulgar: true if categories vulgarity, child_safety, or extreme_profanity are present.

- shouldShadowBan: true if ANY of the following:
  • toxicityScore >= 0.70
  • Any of these categories detected: hate_speech, threats_violence, self_harm_promotion, radicalization_extremism, child_safety, dangerous_challenges, dangerous_misinformation, animal_cruelty, scam_fraud, weapons_illegal_activity

- flaggedCategories: Array of only the category names that were actually detected. Empty array [] if content is clean.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be thorough. A video that SEEMS harmless but contains subtle dangerous misinformation, scam language, or extremist dog-whistles MUST be flagged.
- Do NOT let borderline content slide. When in doubt between categories, flag it.
- Educational content discussing (not promoting) dangerous topics is NOT flagged.
- Satire and clearly labeled fiction are treated with lower severity but still scored.
- Respond STRICTLY in valid JSON only. No markdown, no explanation outside JSON.

OUTPUT FORMAT:
{
  "toxicityScore": 0.85,
  "isVulgar": true,
  "shouldShadowBan": true,
  "flaggedCategories": ["extreme_profanity", "hate_speech", "threats_violence"]
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

  // Cap transcript to 12,000 characters (~3,000 tokens) to stay well under Groq TPM limit
  const safeTranscript = transcript && transcript.length > 12000
    ? `${transcript.slice(0, 6000)}\n\n[... middle section omitted ...]\n\n${transcript.slice(-6000)}`
    : transcript.trim() || "[No spoken transcript available]";

  const userContent = [
    `Title: ${title.trim() || "[No title provided]"}`,
    `Description: ${description.trim() || "[No description provided]"}`,
    `Transcript: ${safeTranscript}`
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
