export default async function handler(req, res) {
  // 1) Sirf POST allow karo
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // 2) ENV check
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY on server." });
  }

  // 3) Body safely parse karo
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  const { projectName, totalEmissions, items } = body || {};

  // 4) Description text banaya for AI
  const description = `
Project name: ${projectName || "Unknown"}
Total emissions: ${totalEmissions ?? "N/A"} tCO2e

Line items:
${(items || [])
  .map(
    (item, i) =>
      `${i + 1}. Category: ${item.category}, Item: ${item.item}, Qty: ${
        item.quantity
      } ${item.unit}, EF: ${item.ef}, Emissions: ${item.emissions} tCO2e`
  )
  .join("\n")}
  `.trim();

  const prompt = `
You are a sustainability consultant for construction projects.

Based on this project data:

${description}

Return three alternative low-carbon design or material options for this project.
Each recommendation should:
- have a short title
- have a 2–3 sentence explanation
- mention approximate potential CO2e reduction qualitatively (e.g., "moderate", "high").

Reply **only** as JSON in this exact format:

{
  "recommendations": [
    { "title": "Option 1", "detail": "..." },
    { "title": "Option 2", "detail": "..." },
    { "title": "Option 3", "detail": "..." }
  ]
}
If project data is incomplete, still give sensible generic construction recommendations.
`;

  try {
    // 5) OpenAI Responses API call via fetch (no extra package needed)
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI API error:", response.status, text);
      return res.status(500).json({
        error: "OpenAI API error",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    // 6) Naya Responses API ka structure se text nikalna
    const rawText =
      data.output?.[0]?.content?.[0]?.text?.value || data.output_text || "";

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse JSON from OpenAI:", rawText);
      return res.status(500).json({
        error: "Could not parse JSON from OpenAI",
        raw: rawText,
      });
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error("Unexpected error in /api/suggest:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
