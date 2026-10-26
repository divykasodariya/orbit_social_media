import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function moderateVideoContent(transcriptText) {
  const prompt = `
Analyze the following video transcript for authoritative advice or sensitive claims:
"${transcriptText.slice(0, 4000)}"

Respond ONLY in JSON with this schema:
{
  "hasAdvisory": boolean,
  "category": "medical" | "financial" | "legal" | "pseudoscience" | "none",
  "riskLevel": "low" | "medium" | "high" | "none",
  "disclaimerTitle": string | null,
  "disclaimerMessage": string | null
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const result = JSON.parse(completion.choices[0].message.content);
  return {
    hasAdvisory: Boolean(result.hasAdvisory),
    category: result.category || "none",
    riskLevel: result.riskLevel || "none",
    disclaimerTitle: result.disclaimerTitle || null,
    disclaimerMessage: result.disclaimerMessage || null,
  };
}
