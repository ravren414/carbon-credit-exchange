import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST instead." });
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const body = req.body || {};
    const projectName = body.projectName || "Untitled Project";
    const totalEmissions = body.totalEmissions || 0;
    const items = body.items || [];

    // PROMPT
    const prompt = `
You are a senior carbon consultant for construction projects.

You will receive:
- projectName (string)
- totalEmissions (number)
- items: array of { category, item, quantity, unit, ef, emissions }

DATA:
${JSON.stringify({ projectName, totalEmissions, items }, null, 2)}

TASK:
Return a **strict JSON response only** with this structure:

{
  "summary": "1 paragraph summary",
  "top_reduction_actions": ["Action 1", "Action 2", "Action 3"],
  "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"],
  "cost_saving": "1 paragraph",
  "carbon_credits": "How many credits to buy and why",
  "risk_and_compliance": "ESG + regulatory risk overview",
  "sustainability_score": 0-100,
  "extra_points": ["extra point 1", "extra point 2"]
}

Rules:
- Must be valid JSON
- No backticks
- No markdown
    `;

    // CALL OPENAI
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
      insights = { summary: raw };
    }

    return res.status(200).json({ ok: true, insights });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({
      error: "AI failed",
      details: err.message,
    });
  }
}
