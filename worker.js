/**
 * MediAssist AI — Cloudflare Worker
 *
 * Routes each /api/claude request to the correct specialist sub-agent
 * based on `task_type` in the request body:
 *
 *   task_type        → agent              model
 *   ─────────────────────────────────────────────────────
 *   "registration"   → medassist-scheduler  haiku
 *   "scheduling"     → medassist-scheduler  haiku
 *   "scribe"         → medassist-scribe     sonnet
 *   "orders"         → medassist-orders     haiku
 *   "results"        → medassist-results    sonnet
 *   "billing"        → medassist-billing    sonnet
 *   (absent)         → pass-through         body.model
 *
 * After every successful call:
 *   - Pushes a run to LangSmith (APAC endpoint, fire-and-forget)
 *   - Pushes a cost record to AgentOps (fire-and-forget)
 *
 * Env vars required (set via Cloudflare dashboard → Workers → Settings → Variables):
 *   ANTHROPIC_API_KEY   — Anthropic secret key
 *   LANGSMITH_API_KEY   — LangSmith personal token (from APAC workspace)
 *   LANGSMITH_ENDPOINT  — https://apac.api.smith.langchain.com
 *   LANGSMITH_PROJECT   — medassist  (or your project name)
 *   AGENTOPS_API_URL    — https://agentops-production-980c.up.railway.app
 */

// ── Model whitelist ────────────────────────────────────────────────────────────
const ALLOWED_MODELS = [
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
];
const MAX_TOKENS_CAP = 4000;

// ── Agent router config ────────────────────────────────────────────────────────
const AGENT_CONFIG = {
  registration: {
    agent_id:     "medassist-scheduler",
    model:        "claude-haiku-4-5",
    system_prompt: "You are a clinical registration assistant. Analyse patient profiles and surface intake priorities. Output only valid JSON.",
  },
  scheduling: {
    agent_id:     "medassist-scheduler",
    model:        "claude-haiku-4-5",
    system_prompt: "You are a clinic scheduling assistant. Check same-day conflicts before suggesting slots. Output only valid JSON.",
  },
  scribe: {
    agent_id:     "medassist-scribe",
    model:        "claude-sonnet-4-6",
    system_prompt: "You are a clinical scribe AI. Always include chief_complaint, HPI, assessment, and plan. Never provide a definitive diagnosis. Output only valid JSON.",
  },
  orders: {
    agent_id:     "medassist-orders",
    model:        "claude-haiku-4-5",
    system_prompt: "You are a clinical order entry assistant. Map every order to a LOINC code. Priority must be explicit (high/medium/low). Output only valid JSON.",
  },
  results: {
    agent_id:     "medassist-results",
    model:        "claude-sonnet-4-6",
    system_prompt: "You are a clinical results analysis assistant. Always flag critical values with status=CRITICAL. Always include follow_up_suggestions for abnormal results. Never provide a definitive diagnosis. Output only valid JSON.",
  },
  billing: {
    agent_id:     "medassist-billing",
    model:        "claude-sonnet-4-6",
    system_prompt: "You are a medical coding assistant. Always run denial risk analysis. Only output ICD-10/CPT codes substantiated by documented clinical findings. Output only valid JSON.",
  },
};

// ── Cost formulas ──────────────────────────────────────────────────────────────
function calcCost(model, inputTokens, outputTokens) {
  const isHaiku = model.includes("haiku");
  const inputRate  = isHaiku ? 0.25  : 3.00;
  const outputRate = isHaiku ? 1.25  : 15.00;
  return (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
}

// ── PHI anonymisation (strip before pushing to observability tools) ────────────
function anonymise(text) {
  let s = String(text || "").slice(0, 400);
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]");
  s = s.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[DATE]");
  s = s.replace(/\bP\d{4,}\b/gi, "[MRN]");
  s = s.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[NAME]");
  return "[ANONYMISED] " + s;
}

// ── UUID v4 (Node-16 compatible) ───────────────────────────────────────────────
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── CORS headers ───────────────────────────────────────────────────────────────
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ── LangSmith trace push ───────────────────────────────────────────────────────
async function pushLangSmith(env, {
  agentId, taskType, model,
  userPrompt, responseText,
  inputTokens, outputTokens, latencyMs,
}) {
  const apiKey  = env.LANGSMITH_API_KEY;
  const endpoint = (env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com").replace(/\/$/, "");
  const project  = env.LANGSMITH_PROJECT || "medassist";
  if (!apiKey) return;

  const now      = new Date();
  const startISO = new Date(now.getTime() - latencyMs).toISOString();
  const endISO   = now.toISOString();

  const run = {
    id:           uuidv4(),
    name:         `medassist-${taskType || "passthrough"}`,
    run_type:     "chain",
    session_name: project,
    inputs:       { user_input: anonymise(userPrompt), task_type: taskType },
    outputs:      { response: responseText ? responseText.slice(0, 500) : null },
    start_time:   startISO,
    end_time:     endISO,
    tags:         ["medassist", taskType || "passthrough"],
    extra: {
      metadata: {
        agent_id:      agentId,
        model,
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        latency_ms:    latencyMs,
        cost_usd:      calcCost(model, inputTokens || 0, outputTokens || 0),
      },
    },
  };

  await fetch(`${endpoint}/runs`, {
    method:  "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify(run),
  });
}

// ── AgentOps cost push ─────────────────────────────────────────────────────────
async function pushAgentOpsCost(env, { agentId, model, inputTokens, outputTokens }) {
  const base = env.AGENTOPS_API_URL;
  if (!base || !agentId) return;

  const day  = new Date().toISOString().slice(0, 10);
  const cost = calcCost(model, inputTokens || 0, outputTokens || 0);

  await fetch(`${base}/agents/${agentId}/costs`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      recorded_date: day,
      total_tokens:  (inputTokens || 0) + (outputTokens || 0),
      input_tokens:  inputTokens  || 0,
      output_tokens: outputTokens || 0,
      cost_usd:      cost,
      review_count:  1,
    }),
  });

  // Also push a router-level cost record
  await fetch(`${base}/agents/medassist-router/costs`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      recorded_date: day,
      total_tokens:  0,
      input_tokens:  0,
      output_tokens: 0,
      cost_usd:      0,
      review_count:  1,
    }),
  });
}

// ── Main handler ───────────────────────────────────────────────────────────────
async function handleClaude(request, env, ctx) {
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

  // ── Router: look up specialist config by task_type ─────────────────────────
  const { task_type, model: bodyModel, max_tokens, ...rest } = body;
  const agentCfg   = task_type ? AGENT_CONFIG[task_type] : null;
  const resolvedModel = agentCfg ? agentCfg.model : (bodyModel || "claude-sonnet-4-6");
  const agentId    = agentCfg?.agent_id || null;

  if (!ALLOWED_MODELS.includes(resolvedModel)) {
    return new Response(JSON.stringify({ error: `Model not allowed: ${resolvedModel}` }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(request) },
    });
  }

  // Inject specialist system prompt (overrides client-provided system for routed calls)
  const anthropicBody = {
    model:      resolvedModel,
    max_tokens: Math.min(max_tokens || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
    ...rest,
  };
  if (agentCfg?.system_prompt) {
    anthropicBody.system = agentCfg.system_prompt;
  }

  // ── PDF beta header ────────────────────────────────────────────────────────
  const headers = {
    "Content-Type":       "application/json",
    "x-api-key":          apiKey,
    "anthropic-version":  "2023-06-01",
  };
  if (JSON.stringify(rest).includes('"type":"document"')) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
  }

  // ── Call Anthropic ─────────────────────────────────────────────────────────
  const t0 = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers,
    body:    JSON.stringify(anthropicBody),
  });
  const latencyMs = Date.now() - t0;

  const data = await response.json();

  // ── Background observability pushes (fire-and-forget) ─────────────────────
  if (response.ok && data.content) {
    const inputTokens  = data.usage?.input_tokens  || 0;
    const outputTokens = data.usage?.output_tokens || 0;
    const responseText = data.content.map(b => b.text || "").join("").trim();

    // Extract user prompt text for tracing (first user message)
    const userPrompt = (rest.messages || [])
      .filter(m => m.role === "user")
      .map(m => typeof m.content === "string" ? m.content : JSON.stringify(m.content))
      .join(" ")
      .slice(0, 600);

    ctx.waitUntil(
      Promise.allSettled([
        pushLangSmith(env, {
          agentId, taskType: task_type, model: resolvedModel,
          userPrompt, responseText,
          inputTokens, outputTokens, latencyMs,
        }),
        agentId ? pushAgentOpsCost(env, {
          agentId, model: resolvedModel, inputTokens, outputTokens,
        }) : Promise.resolve(),
      ])
    );
  }

  return new Response(JSON.stringify(data), {
    status:  response.status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

// ── Export ─────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/claude") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method === "POST") {
        return handleClaude(request, env, ctx);
      }
      return new Response("Method not allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};
