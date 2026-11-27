/**
 * Quiz Master Rwanda — Pi Authentication verifier
 * Vercel Node.js Function: POST /api/pi/verify
 *
 * Pi access tokens are validated by Pi's Platform API and are never stored.
 * The server API key is not required for the user-scoped /v2/me endpoint.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ verified: false, message: "Method not allowed." });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({ verified: false, message: "Cross-origin request denied." });
      }
    } catch (_) {
      return res.status(403).json({ verified: false, message: "Invalid request origin." });
    }
  }

  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = match && match[1] ? match[1].trim() : "";

  if (!accessToken || accessToken.length < 20 || accessToken.length > 4096) {
    return res.status(400).json({ verified: false, message: "A valid Pi access token is required." });
  }

  try {
    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (!piResponse.ok) {
      return res.status(401).json({
        verified: false,
        message: "Pi could not verify this account. Please sign in again."
      });
    }

    const piUser = await piResponse.json();
    if (!piUser || typeof piUser.uid !== "string" || !piUser.uid) {
      return res.status(401).json({ verified: false, message: "Pi returned an invalid account response." });
    }

    return res.status(200).json({
      verified: true,
      user: {
        uid: piUser.uid,
        username: typeof piUser.username === "string" ? piUser.username : ""
      }
    });
  } catch (_) {
    // Do not log tokens or return upstream details to the browser.
    return res.status(502).json({
      verified: false,
      message: "Pi verification is temporarily unavailable. Please try again."
    });
  }
};
