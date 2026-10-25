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

// Candidate models in preference order
const CANDIDATE_MODELS = [
  process.env.CHAT_MODEL || "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
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
  return `You are "Orbit Copilot", an AI assistant that answers questions STRICTLY based on the content of a specific video.
You must respond with a valid JSON object.

═══════════════════════════════════════
VIDEO METADATA
═══════════════════════════════════════
Title: ${video.title}
Description: ${video.description}
Duration: ${Math.floor((video.duration || 0) / 60)} minutes

═══════════════════════════════════════
RELEVANT TIMESTAMPED TRANSCRIPT MOMENTS
═══════════════════════════════════════
${transcriptText || "[Transcript not available]"}

═══════════════════════════════════════
YOUR RULES
═══════════════════════════════════════
1. ONLY answer questions based on what is said or shown in this video. If the answer isn't in the video, say "This topic wasn't covered in the video."
2. When referencing something from the video, ALWAYS include a clickable timestamp citation in the format [MM:SS] (e.g., [02:05]). The viewer can click it to jump to that moment.
3. Use structured formatting in your responses:
   - Use **bold** for key terms
   - Use bullet points for lists
   - Use > blockquotes for direct quotes from the video
4. Keep responses concise but thorough (2-4 paragraphs max unless the user asks for detail).
5. If asked for a summary, provide a structured overview with timestamps.
6. You may paraphrase the video content but never fabricate information not present in the transcript.
7. Respond strictly in valid JSON format with this structure:
{
  "answer": "Your formatted answer with [MM:SS] timestamp citations",
  "citations": [
    { "time": "02:05", "timestamp": 125, "quote": "Brief relevant quote from that moment" }
  ]
}

The "citations" array should contain the 1-5 most relevant transcript moments referenced in your answer.
Each citation's "timestamp" field must be the integer number of seconds.`;
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
