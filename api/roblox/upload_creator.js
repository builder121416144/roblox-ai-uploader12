// api/roblox/upload_creator.js
import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fbxBuffer, name, description } = req.body;

  if (!fbxBuffer || !name || !description) {
    return res.status(400).json({ error: "Missing fbxBuffer, name or description" });
  }

  const apiKey = process.env.ROBLOX_OPEN_CLOUD_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Open Cloud API key" });
  }

  const form = new FormData();
  const metadata = {
    assetType: "Model",
    displayName: name,
    description: description
  };

  form.append("request", JSON.stringify(metadata));
  form.append("fileContent", Buffer.from(fbxBuffer), {
    filename: "model.fbx",
    contentType: "application/octet-stream",
  });

  try {
    const response = await fetch("https://apis.roblox.com/assets/v1/assets", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
      },
      body: form
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const operationPath = data.path;

    // Polling per completamento
    let statusRes;
    let attempts = 0;
    do {
      await wait(2000);
      statusRes = await fetch(`https://apis.roblox.com${operationPath}`, {
        method: "GET",
        headers: { "Authorization": apiKey },
      });
      const statusJson = await statusRes.json();
      if (statusJson.done) {
        return res.status(200).json({ assetId: statusJson.result.asset.id });
      }
      attempts++;
    } while (attempts < 20);

    return res.status(500).json({ error: "Upload timeout" });
  } catch (err) {
    console.error("Error uploading to Roblox:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
