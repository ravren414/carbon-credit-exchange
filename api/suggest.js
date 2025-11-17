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

You will receive:
- projectName (string)
- totalEmissions (number, in tCO2e)
- items: array of { category, item, quantity, unit, ef, emissions }

DATA:
${JSON.stringify({ projectName, totalEmissions, items }, null, 2)}

TASK:
Analyze this project and return a **strict JSON object only** (no extra text, no markdown) with this exact shape:

{
  "summary": "1 short paragraph explaining total emissions, main drivers, and overall profile.",
  "top_reduction_actions": [
    "Action 1 (with approx % or tCO2e reduction)",
    "Action 2",
    "Action 3"
  ],
  "alternatives": [
    "Material/energy alternative 1",
    "Material/energy alternative 2",
    "Material/transport alternative 3"
  ],
  "cost_saving": "1 paragraph on cheapest reduction options and rough cost/benefit.",
  "carbon_credits": "1 paragraph on how many credits to buy, approximate cost range, and what type of projects (renewables, forestry, etc.).",
  "risk_and_compliance": "1 paragraph on regulatory / ESG risks and how this project scores.",
  "sustainability_score": 0-100,
  "extra_points": [
    "Any extra recommendation in one line",
    "Another useful tip"
  ]
}

Rules:
- ALWAYS send valid JSON.
- sustainability_score must be a NUMBER (no % sign).
- Do NOT wrap JSON in backticks.
`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
