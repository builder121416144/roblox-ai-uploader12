// api/roblox/convert_and_upload.js
import fetch from "node-fetch";
import FormData from "form-data";
import { ThreeDCloudApi, postConvertByFormatRequest } from "aspose3dcloud";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { glbUrl, name, description } = req.body;
  if (!glbUrl || !name || !description) {
    return res.status(400).json({ error: "Missing glbUrl, name or description" });
  }

  // ✅ Aspose credenziali
  const clientId = process.env.ASPOSE_CLIENT_ID;
  const clientSecret = process.env.ASPOSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Missing Aspose credentials" });
  }

  // ✅ Roblox credenziali
  const apiKey = process.env.ROBLOX_OPEN_CLOUD_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Roblox Open Cloud API key" });
  }

  try {
    // Step 1: scarica GLB
    const glbResponse = await fetch(glbUrl);
    if (!glbResponse.ok) throw new Error("Failed to download GLB");
    const glbBuffer = await glbResponse.arrayBuffer();

    // Step 2: converti GLB → FBX con Aspose
    const api = new ThreeDCloudApi(clientId, clientSecret);
    const reqConv = new postConvertByFormatRequest();
    reqConv.name = "model.glb";
    reqConv.newformat = "fbx";
    reqConv.newfilename = "model.fbx";
    reqConv.isOverwrite = true;

    const convResult = await api.postConvertByFormat(reqConv, Buffer.from(glbBuffer));
    const downloadBuffer = await api.downloadFile(convResult.name); // FBX in buffer

    // Step 3: upload su Roblox
    const form = new FormData();
    const metadata = {
      assetType: "Model",
      displayName: name,
      description: description
    };

    form.append("request", JSON.stringify(metadata));
    form.append("fileContent", Buffer.from(downloadBuffer), {
      filename: "model.fbx",
      contentType: "application/octet-stream",
    });

    const robloxResponse = await fetch("https://apis.roblox.com/assets/v1/assets", {
      method: "POST",
      headers: {
        "Authorization": apiKey
      },
      body: form
    });

    if (!robloxResponse.ok) {
      const text = await robloxResponse.text();
      return res.status(robloxResponse.status).json({ error: text });
    }

    const robloxData = await robloxResponse.json();
    const operationPath = robloxData.path;

    // Step 4: polling finché l’upload non è completato
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
    console.error("Error in convert_and_upload:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
