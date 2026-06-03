/**
 * Cloudflare Pages Function — MediAssist multi-agent router + Anthropic proxy.
 * Deployed at: /api/claude
 *
 * When task_type is present in the request body:
 *   • Selects the correct specialist agent (model + system prompt)
 *   • Strips task_type before forwarding to Anthropic (Anthropic rejects unknown fields)
 *   • Pushes a lightweight trace to AgentOps (fire-and-forget)
 *
 * When task_type is absent:
 *   • Falls through to original proxy behaviour — model and system from request body
 *   • No trace push, no agent routing
 *
 * Staging-only: EVAL_TOKEN env var gates the endpoint to authorised eval runners.
 * Production env does not set EVAL_TOKEN so the guard is a no-op there.
 */

// ── Agent config registry ──────────────────────────────────────────────────────
const AGENT_CONFIG = {
  registration: {
    agent_id:    "medassist-scheduler",
    model:       "claude-haiku-4-5-20251001",
    system:      "You are a clinical registration assistant. Collect patient demographics accurately. Output only valid JSON.",
  },
  scheduling: {
    agent_id:    "medassist-scheduler",
    model:       "claude-haiku-4-5-20251001",
    system:      "You are a clinic scheduling assistant. Always check for same-day conflicts. Output only valid JSON with appointment slots.",
  },
  scribe: {
    agent_id:    "medassist-scribe",
    model:       "claude-sonnet-4-6",
    system:      "You are a clinical scribe AI. Always include chief_complaint, HPI, assessment, and plan in your SOAP note. Never provide a definitive diagnosis. Output only valid JSON.",
  },
  orders: {
    agent_id:    "medassist-orders",
    model:       "claude-haiku-4-5-20251001",
    system:      "You are a clinical order entry assistant. Map every order to a LOINC code. Always include an explicit priority: high, medium, or low. Output only valid JSON.",
  },
  results: {
    agent_id:    "medassist-results",
    model:       "claude-sonnet-4-6",
    system:      "You are a clinical results analysis assistant. Always flag critical values with status=CRITICAL. Always include follow_up_suggestions for abnormal results. Never provide a definitive diagnosis. Output only valid JSON.",
  },
  billing: {
    agent_id:    "medassist-billing",
    model:       "claude-sonnet-4-6",
    system:      "You are a medical coding assistant. Always run denial risk analysis. Only output ICD-10 and CPT codes that are substantiated by documented clinical findings. Output only valid JSON.",
  },
};

// Models allowed through the proxy (whitelist prevents cost abuse)
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5-20251001",
]);

const MAX_TOKENS_CAP   = 4000;
const AGENTOPS_TIMEOUT = 5000; // ms — fire-and-forget trace push

// ── Pre-guardrail checks (run before calling Anthropic) ───────────────────────
// Returns { valid: true } or { valid: false, error: string, status: number }
function preGuardrail(taskType, messages) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join(" ")
    .trim();

  // ── Scribe: must have enough clinical detail to produce a meaningful note ──
  if (taskType === "scribe") {
    const MIN_LENGTH = 30; // characters
    const CLINICAL_KEYWORDS = [
      "patient", "complaint", "pain", "symptoms", "history", "presents",
      "fever", "cough", "bp", "hr", "medication", "allergies", "diagnosis",
      "assessment", "years", "male", "female", "old", "chronic", "acute",
    ];
    if (userText.length < MIN_LENGTH) {
      return {
        valid: false,
        status: 400,
        error: "Insufficient clinical context. Please provide patient details, chief complaint, and relevant history before generating a SOAP note.",
      };
    }
    const hasKeyword = CLINICAL_KEYWORDS.some((kw) =>
      userText.toLowerCase().includes(kw)
    );
    if (!hasKeyword) {
      return {
        valid: false,
        status: 400,
        error: "Insufficient clinical context. Please include patient demographics, chief complaint, and clinical history.",
      };
    }
  }

  // ── Billing: must reference a clinical note or diagnosis ──────────────────
  if (taskType === "billing") {
    const BILLING_KEYWORDS = [
      "icd", "cpt", "diagnosis", "procedure", "note", "soap", "visit",
      "encounter", "assessment", "plan", "history", "complaint", "patient",
    ];
    const hasKeyword = BILLING_KEYWORDS.some((kw) =>
      userText.toLowerCase().includes(kw)
    );
    if (!hasKeyword || userText.length < 20) {
      return {
        valid: false,
        status: 400,
        error: "Clinical documentation required. Please provide a SOAP note or clinical encounter details before requesting billing codes.",
      };
    }
  }

  // ── Orders: must reference a clinical reason ──────────────────────────────
  if (taskType === "orders") {
    if (userText.length < 15) {
      return {
        valid: false,
        status: 400,
        error: "Clinical context required. Please provide a clinical reason or patient presentation before requesting orders.",
      };
    }
  }

  return { valid: true };
}

// ── PHI anonymisation ─────────────────────────────────────────────────────────
function anonymiseForTrace(text) {
  let safe = String(text || "").slice(0, 400);
  safe = safe.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]");
  safe = safe.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[DATE]");
  safe = safe.replace(/\bP\d{4,}\b/g, "[MRN]");
  return "[ANONYMISED] " + safe;
}

// ── UUID fallback (Node 16 compatible) ────────────────────────────────────────
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── CORS ──────────────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":  origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Eval-Token",
  };
}

// ── CORS preflight ────────────────────────────────────────────────────────────
export async function onRequestOptions(context) {
  const origin = context.env.ALLOWED_ORIGIN || "*";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = env.ALLOWED_ORIGIN || "*";
  const cors   = corsHeaders(origin);

  // ── 1. Eval token guard (staging only) ──────────────────────────────────────
  // EVAL_TOKEN is set only in the Preview environment, never in Production.
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

  // ── 2. API key ────────────────────────────────────────────────────────────────
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured on server." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // ── 3. Parse body ─────────────────────────────────────────────────────────────
  let parsedBody;
  try {
    parsedBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body." }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // ── 4. Router — resolve task_type → agent config ──────────────────────────────
  const taskType = parsedBody.task_type || null;
  const agentCfg = taskType ? AGENT_CONFIG[taskType] : null;

  // Strip task_type — Anthropic does not accept unknown fields
  delete parsedBody.task_type;

  if (agentCfg) {
    // ── Pre-guardrail: validate input before spending tokens ──────────────────
    const messages = parsedBody.messages || [];
    const guard    = preGuardrail(taskType, messages);
    if (!guard.valid) {
      return new Response(
        JSON.stringify({ error: guard.error }),
        { status: guard.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Override model and system prompt with agent-specific values
    parsedBody.model  = agentCfg.model;
    parsedBody.system = agentCfg.system;
  }

  // ── 5. Model whitelist ────────────────────────────────────────────────────────
  const requestedModel = parsedBody.model || "";
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return new Response(
      JSON.stringify({ error: `Model '${requestedModel}' is not permitted.` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  // ── 6. Cap max_tokens ─────────────────────────────────────────────────────────
  parsedBody.max_tokens = Math.min(
    typeof parsedBody.max_tokens === "number" ? parsedBody.max_tokens : MAX_TOKENS_CAP,
    MAX_TOKENS_CAP
  );

  // ── 7. PDF beta header ────────────────────────────────────────────────────────
  const messages      = parsedBody.messages || [];
  const hasPdfContent = messages.some((msg) => {
    const content = Array.isArray(msg.content) ? msg.content : [];
    return content.some((block) => block.type === "document");
  });

  const anthropicHeaders = {
    "Content-Type":      "application/json",
    "x-api-key":         apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (hasPdfContent) {
    anthropicHeaders["anthropic-beta"] = "pdfs-2024-09-25";
  }

  // ── 8. Call Anthropic ─────────────────────────────────────────────────────────
  const t0 = Date.now();
  let anthropicResponse, responseData;

  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: anthropicHeaders,
      body:    JSON.stringify(parsedBody),
    });
    responseData = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error("Anthropic API error:", JSON.stringify(responseData));
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reach Anthropic API." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const durationMs = Date.now() - t0;

  // ── 9. AgentOps trace push (fire-and-forget, agent calls only) ────────────────
  if (agentCfg && env.AGENTOPS_API_URL && anthropicResponse.ok) {
    const usage     = responseData.usage || {};
    const inputTok  = usage.input_tokens  || 0;
    const outputTok = usage.output_tokens || 0;

    // Cost formula per model
    const costPerM = agentCfg.model.includes("haiku")
      ? { in: 0.25, out: 1.25 }
      : { in: 3.00, out: 15.00 };
    const cost = (inputTok * costPerM.in + outputTok * costPerM.out) / 1_000_000;

    // Anonymise user input before pushing
    const firstUserMsg = messages.find((m) => m.role === "user");
    const rawInput     = typeof firstUserMsg?.content === "string"
      ? firstUserMsg.content
      : JSON.stringify(firstUserMsg?.content || "");
    const safeInput = anonymiseForTrace(rawInput);

    const tracePayload = {
      trace_id:    uuidv4(),
      agent_id:    agentCfg.agent_id,
      run_type:    "llm",
      user_input:  safeInput,
      output:      ((responseData.content || [])[0]?.text || "").slice(0, 500),
      input_tokens:  inputTok,
      output_tokens: outputTok,
      cost_usd:      parseFloat(cost.toFixed(6)),
      duration_ms:   durationMs,
      model:         agentCfg.model,
      success:       true,
    };

    // Fire-and-forget — never block the user response
    context.waitUntil?.(
      fetch(`${env.AGENTOPS_API_URL}/agents/${agentCfg.agent_id}/traces`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(tracePayload),
        signal:  AbortSignal.timeout(AGENTOPS_TIMEOUT),
      }).catch((e) => console.warn("AgentOps trace push failed:", e.message))
    );
  }

  // ── 10. Return Anthropic response to client ────────────────────────────────────
  return new Response(JSON.stringify(responseData), {
    status:  anthropicResponse.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Reject all other HTTP methods cleanly ─────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;
  const origin = env.ALLOWED_ORIGIN || "*";
  if (request.method === "OPTIONS") return onRequestOptions(context);
  if (request.method === "POST")    return onRequestPost(context);
  return new Response("Method Not Allowed", {
    status:  405,
    headers: corsHeaders(origin),
  });
}
