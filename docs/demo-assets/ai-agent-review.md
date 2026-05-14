# MedAssist AI — Demo Package Review
*Generated: 2026-05-14*

---

## 1. App Overview

MedAssist AI is a single-page React 18 + Vite application that wraps Anthropic's Claude API into a clinical workflow tool. All logic lives in `src/App.jsx`. API calls are proxied through a Netlify serverless function (`netlify/functions/claude.js`) so the API key never reaches the browser. Patient state is held in React `useState` — there is no database.

The app has two role-based portals:

| Portal | Screens |
|--------|---------|
| **Doctor Assistant** | Patient Registration, Appointment Scheduling, Claim Generation |
| **Doctor** | Patient Details, Capture Details (SOAP), Diagnostic Orders, Diagnostic Results |

---

## 2. Main User Flows Discovered

### Flow A — Doctor Assistant (Administrative)
1. Register a new patient (demographics form)
2. Claude generates AI Intake Insights (monitoring priorities, suggested intake questions, intake note)
3. Book an appointment — Claude suggests 3 AI-reasoned slots for the next 7 days
4. After the clinical encounter, generate an insurance claim — Claude produces ICD-10 + CPT codes, gap detection, and denial risk analysis

### Flow B — Doctor (Clinical)
1. View patient details + generate a Pre-Visit AI Brief before entering the room
2. Record the doctor-patient conversation (live mic or typed) — Claude extracts a structured SOAP note with extracted orders and clinical gaps
3. Optionally upload old lab reports (PDF/image) — Claude OCRs and incorporates them into the SOAP context
4. Dictate diagnostic orders — Claude maps to LOINC codes with priority and rationale
5. Paste current lab results — Claude analyses values, flags abnormals, generates read-aloud text, and visualises trends across historical uploads

---

## 3. LLM Integration Status

**Status: ✅ Active and usable**

| Item | Detail |
|------|--------|
| Provider | Anthropic |
| Model | `claude-sonnet-4-6` (constant at `App.jsx:15`) |
| Call sites | `callClaude()` — text prompts (lines 76–91) |
| Vision call site | `callClaudeWithFile()` — PDF/image OCR (lines 93–121) |
| Proxy | `netlify/functions/claude.js` — reads `ANTHROPIC_API_KEY` from server env |
| Key location | `.env.local` as `ANTHROPIC_API_KEY` (server-side, not bundled) |
| Verified | Live 200 response from `claude-sonnet-4-6` confirmed before demo recording |
| Security | Model whitelist enforced; `max_tokens` capped at 4000; CORS headers present |

Claude is invoked in **7 distinct places**:

| Screen | Trigger | Prompt type |
|--------|---------|-------------|
| Registration | After save | Text — intake profile analysis |
| Appointments | "Suggest Slots" button | Text — scheduling with patient context |
| Patient Details | "Generate Brief" button | Text — pre-visit clinical summary |
| Capture Details | "Extract Key Details" button | Text — SOAP extraction from conversation |
| Capture Details | File upload | Vision — OCR of PDF/image lab reports |
| Diagnostic Orders | "Map to Standard Codes" button | Text — LOINC code mapping |
| Diagnostic Results | "Analyze Results" button | Text — lab value analysis |
| Diagnostic Results | Historical file upload | Vision — OCR of historical lab reports |
| Claim Generation | "Generate Claim" button | Text — ICD-10/CPT coding with denial risk |

---

## 4. Synthetic Demo Data

All demo data is **fake/fictional** and safe for sharing. It was created as a third seed patient in `initialPatients` inside `src/App.jsx`.

**Patient: Priya Menon (P1003)**
- Age 47, Female, DOB 1978-04-19
- Conditions: Hypertension (2019), Pre-diabetes (2023), Hypothyroidism (2021)
- 3 past visits pre-seeded
- 1 upcoming appointment (Dr. Mehta, 2026-05-20)

Pre-populated state across all screens:

| Field | Content |
|-------|---------|
| `capturedNote` | Full SOAP note — uncontrolled HTN, progressing pre-diabetes, hypothyroidism exacerbation |
| `diagnosticOrder` | 5 orders mapped to LOINC: HbA1c (4548-4), FBS (1558-6), Lipid Panel (57698-3), TSH (3016-3), Renal Panel (24362-6) |
| `diagnosticResults` | 5 lab values — HbA1c 6.8% ↑, FBS 118 ↑, Cholesterol 214 ↑, TSH 6.2 ↑, Creatinine 0.9 ✓ |
| `historicalReports` | One historical lab report (Nov 2025) for trend visualisation |
| `claim` | 3 ICD-10 codes (I10, R73.09, E03.9) + 4 CPT codes (99214, 83036, 80061, 84443) |
| `aiBrief` | Pre-visit summary with 4 alert tags |
| `registrationInsights` | 3 monitoring priorities, 3 suggested questions, intake note |

A `useEffect` was added to `RegisterScreen` so `registrationInsights` from the last patient auto-populates the insights panel on mount — making the AI panel visible immediately without requiring a fresh registration.

---

## 5. Screenshot Inventory

Saved to `docs/demo-assets/`:

| File | Screen |
|------|--------|
| `01-login.png` | Login — role selector + credentials |
| `02-registration-ai-insights.png` | Registration — form + AI Intake Insights panel |
| `03-appointment-scheduling.png` | Appointment — Priya's booked slot |
| `04-claim-generation.png` | Claim — ICD-10/CPT codes + denial risk |
| `05-patient-details.png` | Patient Details — demographics + history |
| `06-pre-visit-brief.png` | Patient Details — Pre-Visit AI Brief card |
| `07-capture-soap-note.png` | Capture — structured SOAP note extracted |
| `08-diagnostic-orders.png` | Orders — LOINC-mapped order list |
| `09-diagnostic-results.png` | Results — lab analysis with status flags |
| `10-trend-chart.png` | Results — trend line chart across two time points |

---

## 6. Video Inventory

| File | Details |
|------|---------|
| `docs/demo-assets/demo.mp4` | H.264 MP4, 1280×800, 30fps, ~65 seconds |

The video walks through all 8 phases with:
- Annotated overlay cards on each screen (tag, AI description, provider benefit)
- Fade-to-black transitions between screens
- 5-second hold per screen for readability
- Synthetic data visible throughout — no live API calls during recording

Legacy assets (`docs/walkthrough.mp4`, `docs/walkthrough.gif`) are preserved unchanged.

---

## 7. Code Quality Observations

| Area | Observation |
|------|-------------|
| **Single-file architecture** | All 1,400+ lines in `App.jsx` — works for a prototype but will become hard to maintain. Split into `components/`, `screens/`, `hooks/`, `api/` when expanding. |
| **State management** | All state lifted to root `App` and passed as `{ patients, setPatients, toast }` props. Correct for this scale; would benefit from `useContext` or Zustand if screens grow. |
| **No loading skeletons** | Screens flash empty state briefly on navigation. Add skeleton loaders for polish. |
| **Error handling** | `callClaude` returns `null` on failure; callers show a toast. Adequate for prototype, but no retry logic or user-facing error detail. |
| **Voice API** | `SpeechRecognition` is Chrome-only. Other browsers see an error toast — acceptable for prototype, worth noting in docs. |
| **Tailwind static map** | `AC` class map correctly avoids dynamic string interpolation — production build is safe. |
| **`parseJSON` helper** | Strips markdown fences and JS comments from Claude responses before parsing — a necessary defensive measure given model output variability. |
| **No tests** | Zero test files. Add Vitest + React Testing Library unit tests for `parseJSON`, `callClaude` mock, and key component render paths before any production use. |

---

## 8. AI Agent Opportunities

### 8.1 — Autonomous Pre-Appointment Briefing Agent

**User problem:** Doctor opens the app right before an encounter with no preparation time.

**Why agentic:** Requires multi-step reasoning — pull patient history, check recent labs, cross-reference overdue screenings, compose a brief — without human initiation for each step.

**Trigger:** Automatically 30 minutes before a scheduled appointment (`patient.appointments[]`).

**Required inputs:** Patient demographics, history, past visits, last lab results, appointment date/time.

**Recommended behaviour:**
1. Identify appointments in the next 60 minutes
2. Fetch patient context
3. Call Claude to summarise active conditions, flag overdue screenings, and list medication changes since last visit
4. Push brief to doctor's dashboard as a pinned card

**Output:** Pre-Visit AI Brief card — already exists in UI (`aiBrief`). This makes it automatic rather than on-demand.

**Guardrails:** Doctor can dismiss or override. Brief is advisory only — no clinical decisions made.

**Files to touch:** `src/App.jsx` (`PatientDetailsScreen`), add a scheduled trigger hook or background effect.

**Complexity:** Low — UI already built, just automate the trigger.

**Priority:** 🔴 High — immediate demo value, zero new UI needed.

---

### 8.2 — SOAP-to-Order Pipeline Agent

**User problem:** After SOAP extraction, doctor still manually navigates to Diagnostic Orders and re-dictates tests that Claude already identified in `extracted_orders`.

**Why agentic:** The information is already in `capturedNote.extracted_orders` — bridging it to the Orders screen is a deterministic handoff that shouldn't require human re-entry.

**Trigger:** When a SOAP note is saved with non-empty `extracted_orders.labs` or `extracted_orders.imaging`.

**Recommended behaviour:**
1. Detect populated `extracted_orders` after SOAP save
2. Auto-populate the dictation input in `OrdersScreen` with the extracted tests
3. Optionally auto-trigger LOINC mapping

**Output:** Pre-filled order dictation + LOINC-mapped order list.

**Guardrails:** Doctor reviews and can remove/add before finalising.

**Files to touch:** `CaptureScreen` save handler → pass extracted orders to `OrdersScreen` via shared state.

**Complexity:** Low — state already exists, just wire it.

**Priority:** 🔴 High — removes a redundant manual step in every encounter.

---

### 8.3 — Claim Pre-population Agent

**User problem:** Claims are generated from scratch on demand. If SOAP, orders, and results are all complete, the claim could be generated automatically with no user action.

**Why agentic:** All inputs (clinical note, diagnostic orders, lab results) are available in patient state. The claim generation prompt already reads them — it just needs an autonomous trigger.

**Trigger:** When `capturedNote`, `diagnosticOrder`, and `diagnosticResults` all become non-null for a patient.

**Recommended behaviour:**
1. Watch patient state for completion of all three upstream fields
2. Auto-call the claim generation prompt in the background
3. Mark claim as "draft — pending review" in the UI

**Output:** Pre-generated draft claim visible in Claim Generation screen when the assistant opens it.

**Guardrails:** Always marked as "AI Draft". Assistant must explicitly confirm before submission. Editable.

**Files to touch:** Root `App` component — add a `useEffect` watching patient state.

**Complexity:** Low — the prompt and result handling already exist in `ClaimsScreen`.

**Priority:** 🟠 Medium-High — saves the assistant a manual step and reduces turnaround time.

---

### 8.4 — Abnormal Result Escalation Agent

**User problem:** Critical lab values (e.g. TSH 6.2, HbA1c 6.8) are flagged visually but require the doctor to notice them manually.

**Why agentic:** Flagging a critical value and surfacing a recommended action is a multi-step reasoning task — classify severity, determine urgency, compose a message, route to the right person.

**Trigger:** When `diagnosticResults` is saved and any result has `status: "critical"` or `status: "high"` with a value significantly outside range.

**Recommended behaviour:**
1. Identify critical/high results
2. Call Claude to classify urgency (routine vs. urgent vs. critical)
3. Generate a short action recommendation per finding
4. Display as a red banner notification with the specific action

**Output:** Persistent alert banner: *"TSH 6.2 — hypothyroidism confirmed. Recommend initiating levothyroxine before patient leaves today."*

**Guardrails:** Advisory only. No automatic prescriptions or orders.

**Files to touch:** `ResultsScreen` — add post-analysis effect; `Toast` system — add persistent alert type.

**Complexity:** Medium — needs a new Claude prompt + persistent alert UI component.

**Priority:** 🟠 Medium-High — directly improves patient safety.

---

### 8.5 — Denial Risk Monitor Agent

**User problem:** Denial risk notes in the claim are visible but passive — the assistant may miss them before submission.

**Why agentic:** Matching a pending claim against a corpus of past denial patterns, identifying which rules apply, and scoring overall denial risk is a multi-document reasoning task.

**Trigger:** After claim generation completes.

**Recommended behaviour:**
1. Compare generated codes against `priorClaimsCorpus`
2. Score denial risk (low / medium / high)
3. Generate a prioritised checklist of documentation items to fix before submission

**Output:** Risk score badge on the claim + actionable checklist.

**Files to touch:** `ClaimsScreen` — extend post-generation logic; add risk score to claim state shape.

**Complexity:** Medium — prompt is an extension of the existing claim prompt.

**Priority:** 🟡 Medium — revenue impact for production use, lower urgency for prototype.

---

## Verification Checklist

- [x] LLM status confirmed active (`claude-sonnet-4-6`, 200 OK)
- [x] Synthetic demo data created (Priya Menon, P1003)
- [x] Data seeded in `src/App.jsx` `initialPatients`
- [x] 10 screenshots captured in `docs/demo-assets/`
- [x] MP4 video recorded and encoded (`docs/demo-assets/demo.mp4`)
- [x] README.md updated with demo assets section
- [x] No real patient data used anywhere
- [ ] Tests — none exist; recommended before any production use
