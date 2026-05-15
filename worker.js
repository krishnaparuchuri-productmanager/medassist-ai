const ALLOWED_MODELS = [
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5-20251001",
];
const MAX_TOKENS_CAP = 4000;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleClaude(request, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }

  const { model, max_tokens, ...rest } = body;

  if (!ALLOWED_MODELS.includes(model)) {
    return new Response(
      JSON.stringify({ error: `Model not allowed: ${model}` }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(request) },
      }
    );
  }

  const cappedTokens = Math.min(max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP);

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  // Add PDF beta header if the request contains document content
  if (JSON.stringify(rest).includes('"type":"document"')) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({ model, max_tokens: cappedTokens, ...rest }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/claude") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request),
        });
      }
      if (request.method === "POST") {
        return handleClaude(request, env);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    // All other routes — serve static assets (SPA fallback via wrangler.toml)
    return env.ASSETS.fetch(request);
  },
};
