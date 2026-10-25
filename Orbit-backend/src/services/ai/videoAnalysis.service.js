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

// Models in preference order (only verified working endpoints on current Groq tier)
const CANDIDATE_MODELS = [
  process.env.ANALYSIS_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

/**
 * System prompt that instructs the LLM to produce a multi-task analysis
 * covering: Summary + Key Points + Smart Chapters + Advisory detection.
 * 
 * The LLM receives the video title, description, and full timestamped transcript.
 */
const ANALYSIS_SYSTEM_PROMPT = `You are "Orbit AI Analyst", an advanced content intelligence system for the Orbit video platform.

Given a video's Title, Description, and Timestamped Transcript, you MUST perform ALL of the following tasks in a SINGLE response:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 1: SUMMARY & KEY POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "tldr": A crisp 2-sentence executive summary of the video.
- "keyPoints": An array of 3-5 concise, actionable takeaway bullet points (each a single sentence).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 2: SMART CHAPTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- "chapters": An array of chapter objects representing the major topic shifts in the video.
  Each chapter must have:
  - "timestamp": the start time in seconds (integer)
  - "formattedTime": the human-readable time string (e.g., "02:05")
  - "title": a short descriptive chapter title (4-8 words max)
- Generate between 3 and 10 chapters, depending on the video length and content diversity.
- The first chapter should always start at timestamp 0.
- Use the timestamps from the transcript segments to determine accurate chapter boundaries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK 3: CONTENT ADVISORY DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detect if the speaker makes authoritative, unverified, or potentially harmful claims in ANY of the following categories. Be thorough — do NOT miss subtle or indirect claims.

ADVISORY CATEGORIES:
■ medical
  Speaker makes health or medical recommendations with authority, regardless of whether they claim formal credentials.
  Includes:
  - Claiming to be a doctor, nurse, nutritionist, or healthcare professional and giving specific health advice
  - Telling viewers to start, stop, or change medications or treatments
  - Recommending specific diets, supplements, or remedies for medical conditions with certainty
  - Any specific health action advice framed as expert guidance without an explicit "consult your doctor" disclaimer
  Rule: If the speaker gives specific health action recommendations without an explicit disclaimer to consult a licensed physician, flag it.
  Risk level: high for dangerous advice (stop medications, miracle cures), medium for diet/supplement advice without disclaimers, low for general wellness tips from self-proclaimed experts.
  Example 1: "I’m a doctor and you should drink colloidal silver instead of antibiotics."
  Example 2: "As a nutritionist, here are the 11 foods I recommend everyone eat daily for optimal health."
  Example 3: "Stop eating seed oils immediately — they’re the root cause of every chronic disease."

■ financial
  Anyone giving specific investment, trading, or financial planning advice without a proper licensed financial advisor disclaimer.
  This includes BOTH scam-style content AND well-intentioned educational content from self-proclaimed experts.
  Includes:
  - "Ex-banker", "ex-trader", "financial coach", or "investor" giving specific buy/sell/hold recommendations
  - Promising specific returns or guaranteed profits ("this stock will 3x")
  - Advising viewers what to do with their savings, retirement funds, or portfolio without disclaimers
  - Crypto, NFT, or real estate investment tutorials framed as actionable advice
  - Ponzi schemes, pyramid schemes, or rug-pull language
  - Insider trading tips or "secret" investment strategies
  Rule: If the speaker gives specific financial action recommendations ("you should buy X", "invest in Y", "put your money in Z") without an explicit "this is not financial advice" disclaimer, flag it.
  Risk level: high for scams/guaranteed returns, medium for expert-framed tutorials without disclaimers, low for general financial education with partial disclaimers.
  Example 1: "Put all your savings into this token, it will 100x by next month."
  Example 2: "As an ex-banker, here's exactly where I would put my money right now in 2026."
  Example 3: "You should have 60% in index funds and 20% in real estate — trust me, this is what wealthy people do."

■ legal
  Providing specific legal advice as if licensed, advising people to take specific legal actions without consulting a lawyer.
  Example: "You don’t need a lawyer for this, just sign the contract yourself."

■ pseudoscience
  Claims that contradict established scientific consensus without credible basis.
  Includes: flat earth, anti-vaccination, moon landing denial, chemtrails, crystal healing as cure, astrology as fact.
  Example: "Vaccines contain microchips and the government is using 5G to activate them."

■ conspiracy
  Presenting unverified conspiracy theories as fact that could incite distrust, fear, or harmful action.
  Includes: deep state narratives, election fraud claims without evidence, crisis actor accusations, shadow government theories.
  Example: "The shooting was staged, those were all crisis actors hired by the globalists."

■ spiritual_religious
  Making authoritative spiritual, religious, or supernatural claims that could lead viewers to make dangerous real-world decisions.
  Includes: faith healing instead of medicine, exorcism as psychiatric treatment, cult recruitment framing.
  Example: "God told me you must stop your chemotherapy and pray instead."

■ nutrition_supplement
  Promoting unverified diets, supplements, detoxes, or miracle cures without scientific backing and with authoritative certainty.
  Includes: MLM supplement promotion, extreme fasting protocols promoted as cures, dangerous diet advice.
  Example: "This $99/month cleanse will detox your liver and cure your autoimmune disease."

■ safety_security
  Providing instructions or encouragement for activities that endanger physical safety or cybersecurity.
  Includes: unsafe electrical/structural DIY, hacking guides presented non-educationally, dangerous vehicle modifications.
  Example: "Here’s how to bypass your car’s safety systems for more speed."

■ political_misinformation
  Presenting false political facts, fabricated quotes by public figures, or unverified election/policy claims as established truth.
  Example: "The president signed a secret executive order to confiscate all firearms next Tuesday."

■ environmental_misinformation
  Denying well-established environmental science or promoting actions with significant false ecological claims.
  Example: "Climate change is a hoax invented by scientists for grant money."

DETECTION RULES:
- Flag advisory when the speaker presents claims with authority OR frames content as actionable guidance — even if the content seems educational or well-intentioned.
- An "ex-banker", "ex-doctor", "nutritionist", "coach", or "investor" giving specific recommendations IS an authoritative framing — flag it.
- Educational content that ONLY presents factual information without specific action recommendations is NOT flagged.
- If the speaker explicitly includes a clear disclaimer ("consult a licensed professional", "this is not financial/medical advice") AND does not override it with specific recommendations, lower the riskLevel to low or don't flag.
- If the speaker adds a disclaimer BUT still gives specific recommendations, still flag it with medium risk.
- If content is safe with proper full disclaimers and no actionable recommendations: hasAdvisory = false.

RISK LEVELS:
- high: Dangerous if followed, could cause direct physical/financial/psychological harm.
- medium: Potentially misleading, needs professional verification before acting on it.
- low: Minor concern, informational imbalance but unlikely to cause direct harm.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (strict JSON only — no markdown, no extra text)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
- For advisory: pick the MOST SEVERE category if multiple apply. Use "none" only when truly clean.
- disclaimerTitle: Short, professional title (e.g., "Health Information Notice", "Financial Risk Warning", "Unverified Claims Advisory").
- disclaimerMessage: 1-2 sentences. Neutral, professional tone. Guide viewers to seek professional verification.
- Be conservative with advisory: only flag genuine authoritative claims with certitude, not casual opinions or clear satire.`;

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
      const validCategories = ["medical", "financial", "legal", "pseudoscience", "conspiracy", "spiritual_religious", "nutrition_supplement", "safety_security", "political_misinformation", "environmental_misinformation", "none"];
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
