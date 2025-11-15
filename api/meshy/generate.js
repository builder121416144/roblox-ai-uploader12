// api/meshy/generate.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await fetch("https://api.meshy.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MESHY_API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        quality: "preview",
        format: "glb"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    res.status(200).json({ glbUrl: data.url }); // restituiamo l'URL del modello
  } catch (error) {
    console.error("Meshy API error:", error);
    res.status(500).json({ error: "Failed to generate 3D model" });
  }
}
