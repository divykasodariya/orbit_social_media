import http from "./http";

/**
 * Fetch AI summary, chapters, and advisory warning for a video.
 * @param {string} videoId
 */
export const getVideoAnalysis = (videoId) =>
  http.get(`/ai/analysis/${videoId}`);

/**
 * Fetch interactive timestamped transcript segments for a video.
 * @param {string} videoId
 */
export const getVideoTranscriptSegments = (videoId) =>
  http.get(`/ai/transcript/${videoId}`);

/**
 * Ask a question to the video RAG copilot chatbot.
 * @param {string} videoId
 * @param {string} question
 * @param {Array<{role: string, content: string}>} [conversationHistory=[]]
 */
export const askVideoQuestion = (videoId, question, conversationHistory = []) =>
  http.post(`/ai/chat/${videoId}`, { question, conversationHistory });

/**
 * Manually trigger AI analysis for a video (video owner only).
 * @param {string} videoId
 */
export const triggerAnalysis = (videoId) =>
  http.post(`/ai/analyze/${videoId}`);
