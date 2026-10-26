import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateVideoIntelligence(segments) {
  const transcriptWithTimestamps = segments
    .slice(0, 100)
    .map((s) => `[${Math.floor(s.start)}s]: ${s.text}`)
    .join("\n");

  const prompt = `
Given this timestamped transcript:
${transcriptWithTimestamps}

Produce a structured JSON output with:
1. "summary": A concise executive TL;DR summary.
2. "keyTakeaways": An array of 3 to 5 core takeaway bullet points.
3. "chapters": An array of objects with "title", "start" (seconds), and "end" (seconds).
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return JSON.parse(completion.choices[0].message.content);
}
