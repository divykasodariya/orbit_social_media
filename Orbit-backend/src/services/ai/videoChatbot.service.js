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

// Candidate models in preference order (only verified working endpoints)
const CANDIDATE_MODELS = [
  process.env.CHAT_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const MAX_CHAT_CONTEXT_CHARS = 10000; // ~2500 tokens, keeps chat prompt well under Groq TPM limit

/**
 * Formats segments into a compact indexed transcript for the chat context.
 * For long videos (>10,000 chars), performs RAG retrieval around the user's question,
 * returning the most relevant timestamped moments with context windows.
 * @param {Array<{start: number, end: number, text: string}>} segments
 * @param {string} [question=""]
 * @returns {string}
 */
const buildTranscriptContext = (segments, question = "") => {
  if (!segments || segments.length === 0) return "";

  const allLines = segments.map((seg) => {
    const mins = Math.floor(seg.start / 60);
    const secs = Math.floor(seg.start % 60);
    const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return {
      start: seg.start,
      time,
      text: seg.text.trim(),
    };
  });

  const fullRawText = allLines.map((l) => `[${l.time}] ${l.text}`).join("\n");
  if (fullRawText.length <= MAX_CHAT_CONTEXT_CHARS) {
    return fullRawText;
  }

  // Large video RAG retrieval: Score segments against user query
  const queryTokens = (question || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scoredSegments = allLines.map((line, idx) => {
    let score = 0;
    const lowerText = line.text.toLowerCase();
    for (const token of queryTokens) {
      if (lowerText.includes(token)) score += 2;
    }
    return { ...line, idx, score };
  });

  const selectedIndices = new Set();
  const topMatches = scoredSegments
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  if (topMatches.length > 0) {
    for (const match of topMatches) {
      if (match.idx > 0) selectedIndices.add(match.idx - 1);
      selectedIndices.add(match.idx);
      if (match.idx < allLines.length - 1) selectedIndices.add(match.idx + 1);
    }
  } else {
    // If generic question (e.g. "summarize the video"): evenly sample timeline
    const step = Math.max(1, Math.floor(allLines.length / 30));
    for (let i = 0; i < allLines.length; i += step) {
      selectedIndices.add(i);
    }
  }

  const resultLines = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((idx) => `[${allLines[idx].time}] ${allLines[idx].text}`);

  return resultLines.join("\n").slice(0, MAX_CHAT_CONTEXT_CHARS);
};

/**
 * Builds the system prompt for the video chatbot with embedded transcript context.
 */
const buildSystemPrompt = (video, transcriptText) => {
  return `You are "Orbit Copilot", an AI assistant embedded in a video player that answers questions STRICTLY based on the content of the video provided below.
You must respond with a valid JSON object.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO METADATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${video.title}
Description: ${video.description}
Duration: ${Math.floor((video.duration || 0) / 60)} minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELEVANT TIMESTAMPED TRANSCRIPT MOMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${transcriptText || "[Transcript not available]"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ONLY answer based on what is explicitly said or shown in this video. If the answer is not in the video, respond: "This topic was not covered in the video."
2. When referencing a moment from the video, ALWAYS include a timestamp citation in the format [MM:SS] — for example [02:05]. The user can click these to jump to that moment.
3. FORMATTING RULES (CRITICAL — violating these will break the UI):
   - Write in plain, clear prose. No markdown whatsoever.
   - Do NOT use ** for bold or any other markdown emphasis.
   - Do NOT use # headings, > blockquotes, --- dividers, or backtick code blocks.
   - Do NOT use - or * bullet points or numbered lists with dots.
   - If you need to list items, write them as natural sentences separated by commas or on new lines without any leading symbol.
   - Do NOT start any line with **, *, -, #, or >.
4. Keep responses concise (2-4 short paragraphs maximum unless the user explicitly asks for detail).
5. Include 1 to 5 timestamp citations [MM:SS] inline within your answer text where relevant.
6. Never fabricate or invent information not present in the transcript.
7. You must respond ONLY in strict valid JSON with this exact structure:
{
  "answer": "Your plain prose answer with [MM:SS] citations inline",
  "citations": [
    { "time": "02:05", "timestamp": 125, "quote": "Brief direct quote from that moment in the video" }
  ]
}

The citations array lists the 1-5 most relevant transcript moments referenced in your answer.
Each citation's timestamp field must be an integer (number of seconds from the start).`;
};

/**
 * Sends a user question about a video to the RAG chatbot.
 *
 * @param {string} videoId - MongoDB ObjectId of the video
 * @param {string} question - The user's question
 * @param {Array<{role: string, content: string}>} [conversationHistory=[]] - Previous messages for multi-turn context
 * @returns {Promise<{ answer: string, citations: Array }>}
 */
export const chatWithVideo = async (videoId, question, conversationHistory = []) => {
  const client = getGroqClient();

  const video = await Video.findById(videoId).select(
    "title description duration transcript segments"
  );

  if (!video) throw new Error(`Video not found: ${videoId}`);

  // Build transcript context via RAG retrieval from segments or truncated transcript
  const transcriptText =
    video.segments && video.segments.length > 0
      ? buildTranscriptContext(video.segments, question)
      : (video.transcript || "").slice(0, MAX_CHAT_CONTEXT_CHARS);

  if (!transcriptText) {
    return {
      answer:
        "The transcript for this video is not available yet. Please try again once the video has finished processing.",
      citations: [],
    };
  }

  const systemPrompt = buildSystemPrompt(video, transcriptText);

  // Build message chain: system -> conversation history -> current question
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  console.log(
    `[VideoChatbot] Processing question for videoId: ${videoId} | Q: "${question.slice(0, 80)}..."`
  );

  let lastError = null;
  const modelsToTry = [...new Set(CANDIDATE_MODELS.filter(Boolean))];

  for (const model of modelsToTry) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 2048,
      });

      const rawJson = completion.choices?.[0]?.message?.content;
      if (!rawJson) throw new Error("Empty response from chatbot model");

      try {
        const parsed = JSON.parse(rawJson);

        return {
          answer: String(parsed.answer || "I couldn't generate an answer. Please try rephrasing your question."),
          citations: Array.isArray(parsed.citations)
            ? parsed.citations.map((c) => ({
                time: String(c.time || "00:00"),
                timestamp: Math.max(0, Math.floor(Number(c.timestamp) || 0)),
                quote: String(c.quote || "").slice(0, 300),
              }))
            : [],
        };
      } catch {
        // If JSON parsing fails, return raw string
        return {
          answer: rawJson,
          citations: [],
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[VideoChatbot] Model ${model} failed: ${err.message}. Trying next candidate...`);
    }
  }

  throw new Error(`All chatbot models failed. Last error: ${lastError?.message}`);
};
