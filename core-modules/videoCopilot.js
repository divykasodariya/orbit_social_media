import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function askVideoCopilot(question, videoTitle, transcriptText) {
  const systemPrompt = `
You are the Orbit AI Video Copilot. Answer user questions about the video "${videoTitle}".
Base your answers strictly on the video transcript provided below. If the answer is not in the transcript, state that clearly.

Transcript:
${transcriptText.slice(0, 6000)}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  return {
    answer: response.choices[0].message.content,
    timestamp: new Date().toISOString(),
  };
}
