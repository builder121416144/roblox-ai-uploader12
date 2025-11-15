// File: /api/auth/login.js
// Node.js serverless function (Vercel). Usa ESM-style default export.
// Scopo: costruire la URL di autorizzazione Roblox e redirectare l'utente.
// Richieste:
//   - process.env.ROBLOX_CLIENT_ID (obbligatorio)
//   - process.env.ROBLOX_REDIRECT_URI (obbligatorio)  --> deve essere esattamente l'URL registrato nella dashboard Roblox
//   - process.env.ROBLOX_SCOPE (opzionale, default "openid profile")
// NOTE: in sviluppo locale puoi usare http://localhost:3000/api/auth/callback e registrarlo nelle redirect consentite.

import crypto from "crypto";

export default function handler(req, res) {
  const {
    ROBLOX_CLIENT_ID,
    ROBLOX_REDIRECT_URI,
    ROBLOX_SCOPE = "openid profile",
    NODE_ENV,
  } = process.env;

  if (!ROBLOX_CLIENT_ID || !ROBLOX_REDIRECT_URI) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "Missing required environment variables. Set ROBLOX_CLIENT_ID and ROBLOX_REDIRECT_URI.",
      })
    );
    return;
  }

  // genera state anti-CSRF
  const state = crypto.randomBytes(16).toString("hex");
  // opzionale: puoi includere in state info encoded (es. returnTo), per ora keep simple

  // salva state in cookie HTTP-only, con scadenza breve
  const isSecure = NODE_ENV === "production"; // su Vercel sarà production -> Secure=true
  const maxAgeSeconds = 10 * 60; // 10 minuti
  const cookieParts = [
    `rbx_oauth_state=${state}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
  ];
  if (isSecure) cookieParts.push("Secure");

  res.setHeader("Set-Cookie", cookieParts.join("; "));

  // costruisci query string per l'authorize endpoint
  const params = new URLSearchParams({
    client_id: ROBLOX_CLIENT_ID,
    redirect_uri: ROBLOX_REDIRECT_URI,
    response_type: "code",
    scope: ROBLOX_SCOPE,
    state,
  });

  const authorizeUrl = `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`;

  // redirect 302
  res.writeHead(302, { Location: authorizeUrl });
  res.end();
}
