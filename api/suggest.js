export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const body = req.body || {};

    const projectName = body.projectName || "Untitled Project";
    const totalEmissions = body.totalEmissions || 0;
    const items = body.items || [];

   const prompt = `
You are a senior carbon consultant for construction projects.

You will receive this JSON:
{
  "projectName": string,
  "totalEmissions": number,       // in tCO2e
  "items": [
    { "category": string, "item": string, "quantity": number, "unit": string, "ef": number, "emissions": number }
  ]
}

Here is the data:
${JSON.stringify({ projectName, totalEmissions, items }, null, 2)}

Based ONLY on this data, respond with a single JSON object in EXACTLY this format:

{
  "summary": "2–4 sentence high-level summary of the emissions profile.",
  "sustainabilityScore": 0-100,
  "sustainabilityLabel": "Poor | Fair | Good | Excellent",
  "sustainabilityExplanation": "1 short paragraph explaining why you gave that score.",
  "extraRecommendations": [
    "Action 1 (max 20 words)",
    "Action 2 (max 20 words)",
    "Action 3 (max 20 words)"
  ],
  "miniReport": "Short, client-ready mini report (5–8 sentences, plain text)."
}

Rules:
- Output valid JSON only.
- Do not include any backticks, markdown, or extra text.
`;


    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        const completion = await openai.chat.completions.create({
  model: "gpt-4.1-mini",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: prompt },
  ],
});

const raw = completion.choices[0]?.message?.content || "";
let insights;

try {
  insights = JSON.parse(raw);
} catch (e) {
  console.error("JSON parse error:", e, raw);
  insights = { summary: raw };
}

return res.status(200).json({ ok: true, insights });

      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a precise carbon accounting assistant for construction projects.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", errText);
      return res.status(openaiRes.status).json({
        error: "OpenAI API error",
        details: errText,
      });
    }

    const openaiJson = await openaiRes.json();
    const content = openaiJson.choices?.[0]?.message?.content || "{}";

    let insights;
    try {
      insights = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e, content);
      return res.status(500).json({
        error: "Failed to parse AI JSON",
      });
    }

    return res.status(200).json({
      ok: true,
      insights,
    });
  } catch (err) {
    console.error("Server error in /api/suggest:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
