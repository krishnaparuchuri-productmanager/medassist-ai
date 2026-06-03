/**
 * Cloudflare Pages Function — secure server-side proxy for Anthropic API.
 * Deployed at: /api/claude
 *
 * API key lives in Cloudflare environment variables only.
 * It is never bundled into the client-side JavaScript.
 */

const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5-20251001",
]);
const MAX_TOKENS_CAP = 4000;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Eval-Token",
  };
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  const origin = context.env.ALLOWED_ORIGIN || "*";
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// Handle POST — the only method the frontend uses
export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = env.ALLOWED_ORIGIN || "*";
  const cors = corsHeaders(origin);

  // ── Eval token guard (staging only) ───────────────────────────────────────
  // If EVAL_TOKEN is set in env, requests must include X-Eval-Token header.
  // Production env does not set EVAL_TOKEN so this check is skipped there.
  const evalToken = env.EVAL_TOKEN;
  if (evalToken) {
    const provided = request.headers.get("X-Eval-Token") || "";
    if (provided !== evalToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorised: invalid eval token." }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured on server." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Parse and validate the request body
  let parsedBody;
  try {
    parsedBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body." }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Enforce model whitelist — prevents model-swap cost abuse
  const requestedModel = parsedBody.model || "";
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return new Response(
      JSON.stringify({ error: `Model '${requestedModel}' is not permitted.` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // Cap max_tokens — prevents runaway spend
  parsedBody.max_tokens = Math.min(
    typeof parsedBody.max_tokens === "number" ? parsedBody.max_tokens : MAX_TOKENS_CAP,
    MAX_TOKENS_CAP
  );

  // Anthropic requires a beta header for PDF document content blocks
  const messages = parsedBody.messages || [];
  const hasPdfContent = messages.some((msg) => {
    const content = Array.isArray(msg.content) ? msg.content : [];
    return content.some((block) => block.type === "document");
  });

  const anthropicHeaders = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (hasPdfContent) {
    anthropicHeaders["anthropic-beta"] = "pdfs-2024-09-25";
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: JSON.stringify(parsedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", JSON.stringify(data));
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reach Anthropic API." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}

// Reject all other HTTP methods cleanly
export async function onRequest(context) {
  const { request, env } = context;
  const origin = env.ALLOWED_ORIGIN || "*";
  if (request.method === "OPTIONS") return onRequestOptions(context);
  if (request.method === "POST")    return onRequestPost(context);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: corsHeaders(origin),
  });
}
