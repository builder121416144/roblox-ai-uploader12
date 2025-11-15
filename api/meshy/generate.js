// /api/meshy/generate.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await fetch("https://api.meshy.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MESHY_API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        quality: "preview", // puoi usare "high" se vuoi più dettagli
        format: "glb"       // formato 3D standard compatibile con Roblox
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    // data conterrà l'URL del modello GLB generato da Meshy
    res.status(200).json({ modelUrl: data.url });
  } catch (error) {
    console.error("Meshy API error:", error);
    res.status(500).json({ error: "Failed to generate 3D model" });
  }
}
