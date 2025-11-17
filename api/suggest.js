export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { projectName, totalEmissions, items } = req.body;

    if (!projectName || !totalEmissions || !items) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
You are an expert sustainability consultant.  
Project: ${projectName}  
Total Emissions: ${totalEmissions} tCO₂e  

Emission Items:
${items
  .map(
    (i) =>
      `- ${i.category} | ${i.item} | Qty: ${i.quantity} ${i.unit} | EF: ${i.ef} | Emissions: ${i.emissions}`
  )
  .join("\n")}

Suggest 3 alternative materials, equipment, or methods that reduce carbon emissions.  
Give response in clean JSON with this format:
{
  "suggestions": [
    { "title": "", "description": "" }
  ]
}
    `;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt
      })
    });

    const data = await response.json();
    console.log("OpenAI Response:", data);

    if (!data.output_text) {
      return res.status(500).json({ error: "Invalid OpenAI Response", raw: data });
    }

    const cleanText = data.output_text.trim();
    const suggestionsJSON = JSON.parse(cleanText);

    return res.status(200).json(suggestionsJSON);

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Server crashed", details: err.message });
  }
}
