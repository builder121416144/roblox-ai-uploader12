// File: api/auth/callback.js
import { URLSearchParams } from "url";
import crypto from "crypto";
import fetch from "node-fetch";

export default async function handler(req, res) {
  const {
    ROBLOX_CLIENT_ID,
    ROBLOX_CLIENT_SECRET,
    ROBLOX_REDIRECT_URI,
    NODE_ENV
  } = process.env;

  // roba essenziale
  if (!ROBLOX_CLIENT_ID || !ROBLOX_CLIENT_SECRET || !ROBLOX_REDIRECT_URI) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "Missing env vars: ROBLOX_CLIENT_ID, ROBLOX_CLIENT_SECRET, ROBLOX_REDIRECT_URI"
      })
    );
    return;
  }

  // estrai i parametri della query
  const { code, state } = req.query;
  if (!code || !state) {
    res.statusCode = 400;
    res.end("Missing code or state");
    return;
  }

  // legge cookie dello state
  const cookies = req.headers.cookie || "";
  const cookieState = cookies
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("rbx_oauth_state="));

  if (!cookieState) {
    res.statusCode = 400;
    res.end("Missing stored state cookie.");
    return;
  }

  const storedState = cookieState.split("=")[1];
  if (storedState !== state) {
    res.statusCode = 400;
    res.end("State mismatch.");
    return;
  }

  // scambia il code con il token OAuth
  const tokenURL = "https://apis.roblox.com/oauth/v1/token";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: ROBLOX_CLIENT_ID,
    client_secret: ROBLOX_CLIENT_SECRET,
    redirect_uri: ROBLOX_REDIRECT_URI
  });

  let tokenResponse;
  try {
    const r = await fetch(tokenURL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    });
    tokenResponse = await r.json();
  } catch (err) {
    res.statusCode = 500;
    res.end("Failed to exchange token.");
    return;
  }

  if (!tokenResponse.access_token) {
    res.statusCode = 500;
    res.end("Roblox did not return an access_token.");
    return;
  }

  // salva access token in cookie HttpOnly
  const isSecure = NODE_ENV === "production";
  const accessCookie = [
    `rbx_access=${tokenResponse.access_token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${tokenResponse.expires_in || 3600}`
  ];
  if (isSecure) accessCookie.push("Secure");

  res.setHeader("Set-Cookie", accessCookie.join("; "));

  // puoi mandare l’utente dove vuoi
  res.writeHead(302, { Location: "/" });
  res.end();
}
