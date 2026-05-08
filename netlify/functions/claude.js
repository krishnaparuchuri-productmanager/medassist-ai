// Secure server-side proxy for Anthropic API
// This function runs on Netlify's servers — the API key never reaches the browser.

const ALLOWED_MODELS = new Set(["claude-sonnet-4-6", "claude-sonnet-4-5", "claude-haiku-4-5-20251001"]);
const MAX_TOKENS_CAP = 4000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "https://medassistaipoc.netlify.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is not set.");
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "API key not configured on server." }),
    };
  }

  try {
    // Netlify sometimes base64-encodes the request body — decode it if needed.
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;

    // Parse the body so we can inspect and sanitize it.
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON in request body." }),
      };
    }

    // Enforce allowed model — reject anything not on the whitelist.
    const requestedModel = parsedBody.model || "";
    if (!ALLOWED_MODELS.has(requestedModel)) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Model '${requestedModel}' is not permitted.` }),
      };
    }

    // Cap max_tokens to prevent cost abuse.
    parsedBody.max_tokens = Math.min(
      typeof parsedBody.max_tokens === "number" ? parsedBody.max_tokens : MAX_TOKENS_CAP,
      MAX_TOKENS_CAP
    );

    // Anthropic requires a beta header to use the document (PDF) content type.
    const messages = parsedBody.messages || [];
    const hasPdfContent = messages.some((msg) => {
      const content = Array.isArray(msg.content) ? msg.content : [];
      return content.some((block) => block.type === "document");
    });

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (hasPdfContent) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(parsedBody),
    });

    const data = await response.json();

    // Log the full error from Anthropic so it's visible in Netlify function logs.
    if (!response.ok) {
      console.error("Anthropic API error:", JSON.stringify(data));
    }

    return {
      statusCode: response.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Proxy error:", error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to reach Anthropic API." }),
    };
  }
};
