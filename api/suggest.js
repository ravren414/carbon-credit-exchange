// api/suggest.js

export default async function handler(req, res) {
  // Allow only POST from browser
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const { projectName, totalEmissions, items } = req.body || {};

    // Make a simple text prompt for the Responses API
    const lines = (items || [])
      .map(
        (it, i) =>
          `${i + 1}. Category: ${it.category}, Item: ${it.item}, Qty: ${
            it.quantity
          } ${it.unit}, EF: ${it.ef}, Emissions: ${it.emissions} tCO2e`
      )
      .join("\n");

    const prompt = `You are a sustainability consultant for construction projects.

Project name: ${projectName || "N/A"}
Total project emissions: ${totalEmissions || 0} tCO2e

Emission line items:
${lines || "No items provided."}

Task:
1) Suggest 3 practical low-carbon alternatives (Option 1, Option 2, Option 3).
2) For each option, briefly explain why it is lower carbon and where it is commonly used.
3) Keep the answer short and easy to understand for a civil engineering student.`;

    // Call OpenAI Responses API
    const apiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await apiRes.json();

    // If OpenAI returned an error, log & bubble up
    if (!apiRes.ok) {
      console.error("OpenAI API error:", data);
      res
        .status(500)
        .json({ error: "OpenAI API error", details: data });
      return;
    }

    // Extract assistant text from Responses API format
    let text = "";
    try {
      const first = data.output?.[0]?.content?.[0];
      if (first?.text) {
        text = first.text;
      } else {
        text = JSON.stringify(data.output || data);
      }
    } catch (e) {
      text = "Could not parse OpenAI response.";
    }

    // Always send valid JSON back
    res.status(200).json({
      ok: true,
      suggestions: text,
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      ok: false,
      error: "Server error",
      message: err.message,
    });
  }
}
