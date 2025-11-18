// api/suggest.js
// Serverless function for AI insights

export default async function handler(req, res) {
  // Sirf POST allow
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    const body = req.body || {};

    const projectName = body.projectName || "Untitled Project";
    const totalEmissions = Number(body.totalEmissions || 0);
    const items = Array.isArray(body.items) ? body.items : [];

    // ---------- PROMPT ----------
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
  ],
  "mini_report": "3–6 line plain-text mini report suitable to copy-paste into a client email."
}

Rules:
- ALWAYS send valid JSON.
- sustainability_score must be a NUMBER (no % sign).
- Do NOT wrap JSON in backticks or markdown.
`;

    // ---------- OpenAI API CALL ----------
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini", // tumhaare account me jo bhi model hai use kar sakte ho
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant for carbon accounting and sustainability in construction projects.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
        }),
      }
    );

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error("OpenAI API error:", openaiRes.status, text);
      return res.status(500).json({
        ok: false,
        error: "OpenAI API error",
        details: text,
      });
    }

    const completion = await openaiRes.json();

    const raw = completion?.choices?.[0]?.message?.content || "";
    let insights;

    // JSON parse try
    try {
      insights = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error:", e, raw);

      // Fallback taaki UI toot na jaaye
      insights = {
        summary: String(raw).slice(0, 1000),
        top_reduction_actions: [],
        alternatives: [],
        cost_saving: "",
        carbon_credits: "",
        risk_and_compliance: "",
        sustainability_score: 0,
        extra_points: [],
        mini_report: String(raw).slice(0, 1500),
      };
    }

    return res.status(200).json({ ok: true, insights });
  } catch (err) {
    console.error("suggest handler error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
