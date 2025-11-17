export default async function handler(req, res) {
  try {
    const { total, items } = req.query;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "API key missing in Vercel env variables." });
    }

    const prompt = `
You are an expert sustainability consultant.
Total project emissions: ${total} tCO2e.

Based on these emission items:
${items}

Give 3 best recommendations to reduce emissions.
Format clearly like this:

1. Recommendation (short)
   - Why it helps
   - Estimated savings (%)
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer ${process.env.OPENAI_API_KEY}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      suggestions: data.choices[0].message.content
    });

  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
}

