import React, { useState, useRef, useEffect } from "react";
import {
  Stethoscope, UserCog, LogOut, User, Calendar, FileText,
  ClipboardList, Mic, FlaskConical, Activity, Receipt,
  AlertCircle, CheckCircle2, Loader2, Volume2, Trash2,
  Search, ChevronRight, Sparkles, Square, Upload, X, TrendingUp,
  Image as ImageIcon, FileUp, Copy, Brain
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-6";
const TODAY = new Date().toISOString().split("T")[0];

// Static class maps — Tailwind purges dynamic string interpolations at build time
const AC = {
  teal: {
    active:    "bg-teal-500/15 text-teal-300 border-teal-400",
    icon:      "text-teal-400",
    sel:       "border-teal-400 bg-teal-50",
    roleSel:   "border-teal-400 bg-teal-400/10",
    roleText:  "text-teal-300",
    roleIcon:  "text-teal-400",
    signIn:    "bg-teal-500 hover:bg-teal-600",
    gradient:  "from-teal-400 to-teal-600",
  },
  indigo: {
    active:    "bg-indigo-500/15 text-indigo-300 border-indigo-400",
    icon:      "text-indigo-400",
    sel:       "border-indigo-400 bg-indigo-50",
    roleSel:   "border-indigo-400 bg-indigo-400/10",
    roleText:  "text-indigo-300",
    roleIcon:  "text-indigo-400",
    signIn:    "bg-indigo-500 hover:bg-indigo-600",
    gradient:  "from-indigo-400 to-indigo-600",
  },
};

// ─── SEED DATA ────────────────────────────────────────────────
const initialPatients = [
  {
    id: "P1001", name: "Anita Sharma", age: 54, gender: "Female",
    phone: "+91-98xxxxxx12", dob: "1971-03-14",
    history: ["Hypertension (2018)", "Type 2 Diabetes (2020)"],
    pastVisits: [
      { date: "2026-01-12", reason: "Follow-up HTN",    diagnosis: "Essential hypertension" },
      { date: "2025-09-03", reason: "Diabetic review",  diagnosis: "T2DM controlled" }
    ],
    appointments: [{ date: "2026-04-22", time: "10:30 AM", doctor: "Dr. Rao" }],
    capturedNote: null, diagnosticOrder: null, diagnosticResults: null, claim: null,
    historicalReports: [], registrationInsights: null, aiBrief: null,
  },
  {
    id: "P1002", name: "Ravi Kumar", age: 42, gender: "Male",
    phone: "+91-99xxxxxx45", dob: "1983-07-22",
    history: ["Dyslipidemia (2022)"],
    pastVisits: [
      { date: "2025-12-10", reason: "Chest discomfort eval", diagnosis: "Atypical chest pain, R/O ACS" }
    ],
    appointments: [],
    capturedNote: null, diagnosticOrder: null, diagnosticResults: null, claim: null,
    historicalReports: [], registrationInsights: null, aiBrief: null,
  },
  // ── DEMO PATIENT — full workflow pre-seeded for screenshots & video ──
  {
    id: "P1003", name: "Priya Menon", age: 47, gender: "Female",
    phone: "+91-98765-43210", dob: "1978-04-19",
    history: ["Hypertension (2019)", "Pre-diabetes (2023)", "Hypothyroidism (2021)"],
    pastVisits: [
      { date: "2026-02-10", reason: "BP follow-up",    diagnosis: "Uncontrolled hypertension — medication adjusted" },
      { date: "2025-11-18", reason: "Annual review",   diagnosis: "Pre-diabetes, HbA1c 6.4%" },
      { date: "2025-07-04", reason: "Fatigue workup",  diagnosis: "Subclinical hypothyroidism noted" },
    ],
    appointments: [{ date: "2026-05-20", time: "09:30 AM", doctor: "Dr. Mehta" }],
    capturedNote: {
      chief_complaint: "Persistent fatigue and occasional headaches for 3 weeks",
      history_of_present_illness: "47-year-old female with known hypertension and pre-diabetes presents with 3-week history of fatigue, mild frontal headaches, and increased thirst. Home BP averaging 148/92 mmHg. Last HbA1c 6.4% six months ago. No chest pain or dyspnoea. Compliant with amlodipine 5 mg OD.",
      examination_findings: "BP 152/94 mmHg, HR 78 bpm, SpO2 98%, BMI 27.4. Mild periorbital puffiness. Thyroid mildly enlarged, non-tender. CVS: Normal S1 S2, no murmurs. Respiratory: Clear.",
      assessment: "1. Uncontrolled hypertension — dose escalation required. 2. Pre-diabetes progressing — HbA1c trending upward. 3. Likely hypothyroidism exacerbation — fatigue, puffiness, and mild goitre.",
      plan: "1. Increase amlodipine to 10 mg OD. 2. Add losartan 50 mg OD for BP and renal protection. 3. Order HbA1c, FBS, lipid profile, TSH, and renal function. 4. Dietary counselling referral. 5. Follow-up in 4 weeks.",
      extracted_orders: {
        medications: ["Amlodipine 10 mg OD", "Losartan 50 mg OD"],
        procedures: [],
        labs: ["HbA1c", "Fasting Blood Glucose", "Lipid profile", "TSH", "Renal function tests"],
        imaging: [],
      },
      patient_quotes: [
        "I feel tired all the time, even after a full night's sleep",
        "My home BP readings have been quite high lately",
      ],
      gaps: ["Medication adherence history not documented", "Family history of diabetes not recorded"],
    },
    diagnosticOrder: {
      orders: [
        { test_name: "Glycated Haemoglobin (HbA1c)", loinc_code: "4548-4",   category: "lab",   priority: "high",   rationale: "Monitor pre-diabetes progression; last value 6.4% six months ago" },
        { test_name: "Fasting Blood Glucose",          loinc_code: "1558-6",   category: "lab",   priority: "high",   rationale: "Baseline glucose for diabetes risk assessment" },
        { test_name: "Lipid Panel",                    loinc_code: "57698-3",  category: "lab",   priority: "medium", rationale: "Cardiovascular risk assessment in hypertensive patient" },
        { test_name: "Thyroid Stimulating Hormone",    loinc_code: "3016-3",   category: "lab",   priority: "high",   rationale: "Evaluate thyroid function — fatigue, puffiness, and mild goitre present" },
        { test_name: "Renal Function Panel",           loinc_code: "24362-6",  category: "lab",   priority: "medium", rationale: "Baseline renal status before initiating ARB (losartan) therapy" },
      ],
      gaps: ["Consider echocardiogram given multi-year uncontrolled hypertension"],
    },
    diagnosticResults: {
      results: [
        { test: "HbA1c",               value: "6.8",  unit: "%",     range: "< 5.7",    range_low: 0,    range_high: 5.7,   numeric_value: 6.8,  status: "high",   read_aloud: "HbA1c is 6.8 percent, above normal, indicating progression toward diabetes." },
        { test: "Fasting Blood Glucose",value: "118",  unit: "mg/dL", range: "70–100",   range_low: 70,   range_high: 100,   numeric_value: 118,  status: "high",   read_aloud: "Fasting blood glucose is 118 milligrams per decilitre, above normal, consistent with pre-diabetes." },
        { test: "Total Cholesterol",    value: "214",  unit: "mg/dL", range: "< 200",    range_low: 0,    range_high: 200,   numeric_value: 214,  status: "high",   read_aloud: "Total cholesterol is 214, slightly above the desirable level." },
        { test: "TSH",                  value: "6.2",  unit: "mIU/L", range: "0.4–4.0",  range_low: 0.4,  range_high: 4.0,   numeric_value: 6.2,  status: "high",   read_aloud: "TSH is 6.2, elevated, confirming hypothyroidism." },
        { test: "Serum Creatinine",     value: "0.9",  unit: "mg/dL", range: "0.5–1.1",  range_low: 0.5,  range_high: 1.1,   numeric_value: 0.9,  status: "normal", read_aloud: "Serum creatinine is 0.9, within normal range." },
      ],
      significant_findings: [
        "HbA1c 6.8% — pre-diabetes progressing, diabetes risk elevated",
        "TSH 6.2 mIU/L — hypothyroidism confirmed, thyroid replacement indicated",
        "Total cholesterol 214 mg/dL — statin therapy warranted given hypertension comorbidity",
      ],
      follow_up_suggestions: [
        "Initiate levothyroxine for confirmed hypothyroidism",
        "Consider statin therapy given cholesterol elevation and cardiovascular risk",
        "Repeat HbA1c in 3 months to monitor pre-diabetes trajectory",
        "Refer to endocrinology for combined diabetes and thyroid management",
      ],
      report_date: "2026-05-14",
    },
    claim: {
      patient_id: "P1003",
      date_of_service: "2026-05-14",
      diagnosis_codes: [
        { code: "I10",    description: "Essential (primary) hypertension",          reason: "Active — BP 152/94, medication adjustment today" },
        { code: "R73.09", description: "Pre-diabetes (other abnormal glucose)",      reason: "HbA1c 6.8%, FBS 118 mg/dL — pre-diabetic range" },
        { code: "E03.9",  description: "Hypothyroidism, unspecified",                reason: "TSH 6.2 with clinical symptoms — fatigue, goitre, puffiness" },
      ],
      procedure_codes: [
        { code: "99214", description: "Office visit — moderate complexity (25 min)", units: 1, modifier: null, reason: "3 chronic conditions reviewed, multiple medication changes" },
        { code: "83036", description: "HbA1c measurement",                           units: 1, modifier: null, reason: "Diabetes monitoring in pre-diabetic patient" },
        { code: "80061", description: "Lipid panel",                                 units: 1, modifier: null, reason: "Cardiovascular risk screening" },
        { code: "84443", description: "TSH assay",                                   units: 1, modifier: null, reason: "Thyroid evaluation for suspected hypothyroidism" },
      ],
      gaps_detected: [
        "Echocardiogram not ordered despite prolonged uncontrolled hypertension",
        "Medication adherence not documented — may affect medical necessity for dose escalation",
      ],
      denial_risk_notes: [
        "Ensure BP reading is documented in note when billing 99214 for hypertension visit",
        "HbA1c (83036) requires diabetes/pre-diabetes diagnosis — R73.09 covers this",
      ],
      similar_prior_cases: [
        "HTN follow-up + lipid review — I10, E78.5, CPT 99213, 80061",
        "Diabetes review with labs — E11.9, CPT 99214, 83036, 80053",
      ],
    },
    historicalReports: [
      {
        name: "lab_report_nov2025.pdf",
        status: "done",
        date: "2025-11-18",
        results: [
          { test: "HbA1c",                value: "6.4", unit: "%",     range: "< 5.7",   range_low: 0,   range_high: 5.7,  numeric_value: 6.4, status: "high"   },
          { test: "Fasting Blood Glucose", value: "108", unit: "mg/dL", range: "70–100",  range_low: 70,  range_high: 100, numeric_value: 108, status: "high"   },
          { test: "Total Cholesterol",     value: "198", unit: "mg/dL", range: "< 200",   range_low: 0,   range_high: 200, numeric_value: 198, status: "normal" },
          { test: "TSH",                   value: "4.8", unit: "mIU/L", range: "0.4–4.0", range_low: 0.4, range_high: 4.0, numeric_value: 4.8, status: "high"   },
        ],
      },
    ],
    registrationInsights: {
      monitoring_priorities: [
        "Blood pressure management — hypertension with suboptimal control",
        "Glycaemic surveillance — pre-diabetes with upward HbA1c trend",
        "Thyroid function monitoring — hypothyroidism risk given symptoms",
      ],
      suggested_questions: [
        "Any family history of Type 2 diabetes or thyroid disorders?",
        "Current medication compliance and any side effects?",
        "Recent weight changes or dietary habits?",
      ],
      intake_note: "Profile complete — 3 active chronic conditions flagged; prioritise BP and metabolic workup at first encounter.",
    },
    aiBrief: {
      summary: "Priya Menon, 47F, presents for follow-up of uncontrolled hypertension (BP 152/94) and progressing pre-diabetes (HbA1c 6.8%). New labs confirm hypothyroidism (TSH 6.2). Medication adjustment and thyroid treatment initiation expected today.",
      alerts: [
        "BP uncontrolled — escalate antihypertensive",
        "HbA1c trending up — diabetes risk rising",
        "TSH elevated — initiate levothyroxine",
        "Cholesterol above target — consider statin",
      ],
    },
  },
];

const priorClaimsCorpus = [
  { case: "HTN follow-up + lipid review",   icd: ["I10", "E78.5"],  cpt: ["99213", "80061"], denialPatterns: ["Missing BP reading in note when billing E/M level 3"] },
  { case: "Diabetes review with labs",       icd: ["E11.9"],          cpt: ["99214", "83036", "80053"], denialPatterns: ["HbA1c billed without documented diabetes monitoring indication"] },
  { case: "Chest pain workup",               icd: ["R07.9"],          cpt: ["99214", "93000", "71046"], denialPatterns: ["ECG billed without cardiac symptom documentation"] }
];

// ─── CLAUDE API ───────────────────────────────────────────────
async function callClaude(prompt, systemPrompt = "") {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    if (!data.content) { console.error("Claude error:", data); return null; }
    return data.content.map(b => b.text || "").join("\n").trim();
  } catch (e) { console.error("Claude error:", e); return null; }
}

async function callClaudeWithFile(prompt, file, systemPrompt = "") {
  try {
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });
    const isPdf = file.type === "application/pdf";
    const content = [
      isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image",    source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
      { type: "text", text: prompt }
    ];
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 2000,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content }]
      })
    });
    const data = await res.json();
    if (!data.content) { console.error("Claude vision error:", data); return null; }
    return data.content.map(b => b.text || "").join("\n").trim();
  } catch (e) { console.error("Claude vision error:", e); return null; }
}

// ─── HELPERS ──────────────────────────────────────────────────
// Strips markdown fences and JS comments before parsing — Claude occasionally adds them
function parseJSON(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

async function copyText(text, toast) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch { toast("Copy failed", "error"); }
}

// ─── TOAST ────────────────────────────────────────────────────
function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
          t.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"
        }`}>
          {t.type === "error"
            ? <AlertCircle className="w-4 h-4 flex-shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-2xl mb-4 shadow-lg">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">MedAssist AI</h1>
          <p className="text-slate-400 mt-2">Claude-powered clinical workflow</p>
        </div>
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <p className="text-sm font-medium text-slate-300 mb-3">Select your role</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { r: "assistant", label: "Doctor Assistant", Icon: UserCog,     color: "teal" },
              { r: "doctor",    label: "Doctor",           Icon: Stethoscope, color: "indigo" }
            ].map(({ r, label, Icon, color }) => (
              <button key={r} onClick={() => setRole(r)}
                className={`p-4 rounded-xl border-2 transition-all ${role === r ? AC[color].roleSel : "border-slate-700 bg-slate-900/40 hover:border-slate-600"}`}>
                <Icon className={`w-6 h-6 mx-auto mb-2 ${role === r ? AC[color].roleIcon : "text-slate-400"}`} />
                <div className={`text-sm font-medium ${role === r ? AC[color].roleText : "text-slate-300"}`}>{label}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
            <input type="password" placeholder="Password (demo: any)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
            <button onClick={() => role && username && onLogin({ role, username })} disabled={!role || !username}
              className={`w-full py-2.5 rounded-lg font-medium transition-all ${role && username ? (AC[role]?.signIn || "") + " text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}>
              Sign In
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">Demo mode — any credentials accepted</p>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ user, screen, setScreen, onLogout, doctorPatientName }) {
  const isDoc = user.role === "doctor";
  const ac = isDoc ? "indigo" : "teal";
  const items = isDoc
    ? [
        { id: "patients", label: "Patient Details",    icon: User,         level: 0 },
        { id: "capture",  label: "Capture Details",    icon: Mic,          level: 1 },
        { id: "orders",   label: "Diagnostic Order",   icon: FlaskConical, level: 1 },
        { id: "results",  label: "Diagnostic Results", icon: Activity,     level: 1 },
      ]
    : [
        { id: "register",     label: "Patient Registration", icon: ClipboardList },
        { id: "appointments", label: "Appointments",          icon: Calendar },
        { id: "claims",       label: "Claim Generation",      icon: Receipt }
      ];
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AC[ac].gradient} flex items-center justify-center`}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">MedAssist AI</div>
            <div className="text-xs text-slate-500 capitalize">{user.role} Portal</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ id, label, icon: Icon, level = 0 }) => {
          const active = screen === id;
          const isSubItem = level === 1;
          return (
            <button key={id} onClick={() => setScreen(id)}
              className={`w-full flex items-center gap-3 px-3 rounded-lg text-sm transition-all border-l-2
                ${isSubItem ? "ml-4 py-2" : "py-2.5"}
                ${active
                  ? AC[ac].active
                  : `text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent${isSubItem && !doctorPatientName ? " opacity-50" : ""}`
                }`}>
              <Icon className={`flex-shrink-0 ${isSubItem ? "w-3.5 h-3.5" : "w-4 h-4"} ${active ? AC[ac].icon : ""}`} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </button>
          );
        })}
        {isDoc && doctorPatientName && (
          <div className="mt-2 mx-1 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-500 mb-0.5">Active Patient</div>
            <div className="text-xs text-indigo-300 font-medium truncate">{doctorPatientName}</div>
          </div>
        )}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-1 text-xs text-slate-500">Signed in as</div>
        <div className="px-3 text-sm text-slate-200 mb-2">{user.username}</div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── PATIENT SELECTOR ─────────────────────────────────────────
function PatientSelector({ patients, selectedId, onSelect, accent = "teal" }) {
  const [q, setQ] = useState("");
  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q)
  );
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input placeholder="Search patients..." value={q} onChange={e => setQ(e.target.value)}
          className="flex-1 text-sm outline-none" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {filtered.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className={`text-left p-3 rounded-lg border transition-all ${selectedId === p.id ? AC[accent].sel : "border-slate-200 hover:border-slate-300"}`}>
            <div className="text-sm font-medium text-slate-800">{p.name}</div>
            <div className="text-xs text-slate-500">{p.id} · {p.age}y · {p.gender}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PATIENT CONTEXT BAR (Doctor workflow) ────────────────────
function PatientContextBar({ patient, onChangePatient }) {
  if (!patient) return (
    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">No patient selected</p>
        <p className="text-xs text-amber-600 mt-0.5">Go to Patient Details first to select a patient.</p>
      </div>
      <button onClick={onChangePatient}
        className="text-xs text-amber-700 font-medium border border-amber-300 bg-white hover:bg-amber-50 rounded-md px-3 py-1.5 transition-colors">
        Select Patient →
      </button>
    </div>
  );
  return (
    <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl mb-5">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {patient.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-indigo-900 truncate">{patient.name}</div>
        <div className="text-xs text-indigo-600">{patient.id} · {patient.age}y · {patient.gender}</div>
      </div>
      <button onClick={onChangePatient}
        className="text-xs text-indigo-600 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-400 bg-white rounded-md px-2.5 py-1 transition-colors flex-shrink-0">
        Change Patient
      </button>
    </div>
  );
}

function Section({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 p-2 bg-slate-50 rounded">{value || "—"}</div>
    </div>
  );
}

// ─── ASSISTANT: REGISTRATION ──────────────────────────────────
function RegisterScreen({ patients, setPatients, toast }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "Female", phone: "", dob: "" });
  const [insightLoading, setInsightLoading] = useState(false);
  // flashInsight: shown for 10 s after registration — tied to the just-registered patient
  const [flashInsight, setFlashInsight] = useState(null); // { patientId, patientName, insights }
  // viewInsight: shown when user clicks "View AI Insight" from the patient list
  const [viewInsight, setViewInsight] = useState(null);   // { patientId, patientName, insights }
  // captureState: tracks in-progress intake detail capture
  const [captureState, setCaptureState] = useState(null); // { patientId, patientName, questions: [], answers: {} }
  const flashTimer = useRef(null);

  // Clear timers on unmount
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const save = async () => {
    if (!form.name || !form.age) return;
    const p = {
      id: `P${1000 + patients.length + 1}`,
      ...form, age: parseInt(form.age),
      history: [], pastVisits: [], appointments: [],
      capturedNote: null, diagnosticOrder: null, diagnosticResults: null,
      claim: null, historicalReports: [], registrationInsights: null, aiBrief: null,
    };
    setPatients(prev => [...prev, p]);
    setForm({ name: "", age: "", gender: "Female", phone: "", dob: "" });
    toast("Patient registered");

    // Clear any previously pinned insight
    setViewInsight(null);
    setFlashInsight(null);
    setInsightLoading(true);

    const raw = await callClaude(
      `A new patient has just been registered. Analyse their profile and return intake insights.
PATIENT: ${JSON.stringify({ name: p.name, age: p.age, gender: p.gender, dob: p.dob })}
Return ONLY JSON:
{
  "monitoring_priorities": ["health areas to prioritise for this age/gender profile"],
  "suggested_questions": ["important intake questions not yet captured"],
  "intake_note": "one sentence on completeness and any flags"
}`,
      "You are a clinical intake assistant. Output only valid JSON."
    );
    const insights = parseJSON(raw);
    setInsightLoading(false);
    if (insights) {
      setPatients(prev => prev.map(pt => pt.id === p.id ? { ...pt, registrationInsights: insights } : pt));
      // Show flash insight with patient name, auto-dismiss after 10 s
      setFlashInsight({ patientId: p.id, patientName: p.name, insights });
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashInsight(null), 10000);
    }
  };

  // The insight currently shown in the panel
  const activeInsight = flashInsight ?? viewInsight;
  const isFlash = !!flashInsight;

  const startCapture = ({ patientId, patientName, insights }) => {
    clearTimeout(flashTimer.current);
    setFlashInsight(null);
    setViewInsight(null);
    setCaptureState({
      patientId,
      patientName,
      questions: insights.suggested_questions || [],
      answers: {},
    });
  };

  const saveCapture = () => {
    if (!captureState) return;
    const intakeDetails = {
      answers: captureState.questions.map((q, i) => ({
        question: q,
        response: captureState.answers[i] || "",
      })),
      capturedAt: TODAY,
    };
    setPatients(prev => prev.map(p =>
      p.id === captureState.patientId ? { ...p, intakeDetails } : p
    ));
    setCaptureState(null);
    toast("Intake details saved");
  };

  const InsightsPanel = ({ data, patientId, patientName }) => (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Use these suggestions to capture details now or return later.</span>
        {!isFlash && (
          <button onClick={() => setViewInsight(null)}
            className="text-slate-400 hover:text-slate-600 text-xs underline">
            Close
          </button>
        )}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monitoring Priorities</div>
        <ul className="space-y-1.5">
          {data.monitoring_priorities?.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested Questions</div>
        <ul className="space-y-1.5">
          {data.suggested_questions?.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700">
              <span className="text-teal-500 font-bold mt-0.5 flex-shrink-0">?</span> {q}
            </li>
          ))}
        </ul>
      </div>
      {data.intake_note && (
        <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-xs text-teal-800">
          {data.intake_note}
        </div>
      )}
      <button
        onClick={() => startCapture({ patientId, patientName, insights: data })}
        className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
        <ClipboardList className="w-4 h-4" /> Capture Details Now
      </button>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Patient Registration</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 1 — Register a patient. Claude analyses the profile and surfaces intake priorities.</p>
      <div className="grid md:grid-cols-2 gap-5">

        {/* Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Demographics</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Full Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., Priya Menon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Age *</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={save} disabled={!form.name || !form.age}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm mt-2">
              Register Patient
            </button>
          </div>
        </div>

        {/* AI Intake Insights */}
        <div className={`bg-white rounded-xl border p-5 transition-all duration-300 ${isFlash ? "border-teal-300 shadow-md shadow-teal-50" : "border-slate-200"}`}>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 flex-wrap">
            <Brain className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span>
              AI Intake Insights
              {activeInsight && <span className="text-teal-600"> for {activeInsight.patientName}</span>}
            </span>
            {isFlash && <span className="ml-auto text-xs text-teal-500 animate-pulse">auto-closing…</span>}
          </h3>
          {insightLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              <span className="text-sm">Analysing patient profile…</span>
            </div>
          ) : activeInsight ? (
            <InsightsPanel data={activeInsight.insights} patientId={activeInsight.patientId} patientName={activeInsight.patientName} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Register a patient to see AI intake insights.</p>
            </div>
          )}
        </div>
      </div>

      {/* Intake Detail Capture Form */}
      {captureState && (
        <div className="mt-5 bg-white rounded-xl border border-teal-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-500" />
              Capture Intake Details — <span className="text-teal-600">{captureState.patientName}</span>
            </h3>
            <button onClick={() => setCaptureState(null)}
              className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-md px-2.5 py-1">
              Skip for now
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">Answer the AI-suggested intake questions below. These will be saved to the patient record.</p>
          <div className="space-y-3">
            {captureState.questions.map((q, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-slate-600 block mb-1">{q}</label>
                <textarea
                  value={captureState.answers[i] || ""}
                  onChange={e => setCaptureState(prev => ({ ...prev, answers: { ...prev.answers, [i]: e.target.value } }))}
                  placeholder="Enter response…"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-teal-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setCaptureState(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">
              Skip for now
            </button>
            <button onClick={saveCapture}
              className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Save Intake Details
            </button>
          </div>
        </div>
      )}

      {/* Registered Patients */}
      <div className="mt-5 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Registered Patients ({patients.length})</h3>
        <div className="space-y-2">
          {patients.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">{p.id} · {p.age}y · {p.gender} · {p.phone || "no phone"}</div>
              </div>
              <div className="flex items-center gap-3">
                {p.intakeDetails && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Details captured
                  </span>
                )}
                {p.registrationInsights && !p.intakeDetails && (
                  <button
                    onClick={() => {
                      clearTimeout(flashTimer.current);
                      setFlashInsight(null);
                      setViewInsight({ patientId: p.id, patientName: p.name, insights: p.registrationInsights });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs text-teal-600 hover:text-teal-800 border border-teal-200 hover:border-teal-400 bg-teal-50 hover:bg-teal-100 rounded-md px-2.5 py-1 transition-colors flex items-center gap-1"
                  >
                    <Brain className="w-3 h-3" /> View AI Insight
                  </button>
                )}
                {p.registrationInsights && p.intakeDetails && (
                  <button
                    onClick={() => {
                      clearTimeout(flashTimer.current);
                      setFlashInsight(null);
                      setViewInsight({ patientId: p.id, patientName: p.name, insights: p.registrationInsights });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-md px-2.5 py-1 transition-colors flex items-center gap-1"
                  >
                    <Brain className="w-3 h-3" /> View Insights
                  </button>
                )}
                <span className="text-xs text-slate-500">{p.pastVisits.length} visits</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ASSISTANT: APPOINTMENTS ──────────────────────────────────
function AppointmentScreen({ patients, setPatients, toast }) {
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const patient = patients.find(p => p.id === selectedId);

  const suggestSlots = async () => {
    if (!patient) return;
    setLoading(true);
    const raw = await callClaude(
      `Suggest 3 appointment time slots for the next 7 days starting ${TODAY}.
Patient: ${JSON.stringify({ name: patient.name, age: patient.age, history: patient.history, lastVisit: patient.pastVisits[0] })}.
Return ONLY JSON: { "suggestions": [{ "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "doctor": "Dr. Name", "reasoning": "brief why" }], "gaps": [] }`,
      "You are a clinic scheduling assistant. Output only valid JSON."
    );
    const parsed = parseJSON(raw);
    setSuggestions(parsed ?? { suggestions: [], gaps: ["Could not parse AI response"] });
    setLoading(false);
  };

  const bookSlot = slot => {
    setPatients(patients.map(p => p.id === selectedId ? { ...p, appointments: [...p.appointments, slot] } : p));
    toast(`Booked — ${slot.date} at ${slot.time}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Appointment Schedule</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 2 — AI-suggested time slots based on patient context.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={id => { setSelectedId(id); setSuggestions(null); }} accent="teal" />
      {!patient && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 mt-2">
          <Calendar className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Select a patient to view appointments</p>
          <p className="text-xs text-slate-400 mt-1">Choose a patient above to see existing bookings and get AI slot suggestions.</p>
        </div>
      )}
      {patient && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Book for {patient.name}</h3>
              <button onClick={suggestSlots} disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Suggest Slots
              </button>
            </div>
            {suggestions?.suggestions?.length > 0 ? (
              <div className="space-y-2">
                {suggestions.suggestions.map((s, i) => (
                  <div key={i} className="p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{s.date} · {s.time}</div>
                        <div className="text-xs text-slate-500">{s.doctor}</div>
                      </div>
                      <button onClick={() => bookSlot(s)} className="px-3 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium hover:bg-teal-200">Book</button>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 italic">{s.reasoning}</p>
                  </div>
                ))}
                {suggestions.gaps?.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Gaps flagged
                    </div>
                    <ul className="text-xs text-amber-700">{suggestions.gaps.map((g, i) => <li key={i}>• {g}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">Click "Suggest Slots" to get AI-powered recommendations.</p>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Existing Appointments</h3>
            {patient.appointments.length > 0
              ? patient.appointments.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{a.date} · {a.time}</div>
                      <div className="text-xs text-slate-500">{a.doctor}</div>
                    </div>
                  </div>
                ))
              : <p className="text-sm text-slate-500">No appointments booked.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ASSISTANT: CLAIMS ────────────────────────────────────────
function ClaimsScreen({ patients, setPatients, toast, doctorPatientId }) {
  const [selectedId, setSelectedId] = useState(doctorPatientId ?? null);
  const [loading, setLoading]       = useState(false);
  const patient = patients.find(p => p.id === selectedId);

  const generateClaim = async () => {
    if (!patient) return;
    setLoading(true);
    const raw = await callClaude(
      `Generate a medical claim (ICD-10 + CPT) for this patient.
PATIENT: ${JSON.stringify({ name: patient.name, age: patient.age, gender: patient.gender, history: patient.history })}
CLINICAL NOTE: ${JSON.stringify(patient.capturedNote || "Not captured")}
DIAGNOSTIC ORDERS: ${JSON.stringify(patient.diagnosticOrder || "None")}
DIAGNOSTIC RESULTS: ${JSON.stringify(patient.diagnosticResults || "None")}
PRIOR CLAIM PATTERNS: ${JSON.stringify(priorClaimsCorpus)}
Return ONLY JSON:
{
  "patient_id": "${patient.id}",
  "date_of_service": "${TODAY}",
  "diagnosis_codes": [{ "code": "", "description": "", "reason": "" }],
  "procedure_codes": [{ "code": "", "description": "", "units": 1, "modifier": null, "reason": "" }],
  "gaps_detected": [],
  "denial_risk_notes": [],
  "similar_prior_cases": []
}`,
      "You are a medical coding assistant. Output only valid JSON."
    );
    const claim = parseJSON(raw);
    if (claim) {
      setPatients(patients.map(p => p.id === selectedId ? { ...p, claim } : p));
      toast("Claim generated");
    } else {
      toast("Could not generate claim — please retry", "error");
    }
    setLoading(false);
  };

  const removeCode = (type, idx) => {
    const claim = { ...patient.claim, [type]: patient.claim[type].filter((_, i) => i !== idx) };
    setPatients(patients.map(p => p.id === selectedId ? { ...p, claim } : p));
  };

  const copyCodes = () => {
    if (!patient?.claim) return;
    const dx  = patient.claim.diagnosis_codes?.map(d => `${d.code}  ${d.description}`).join("\n") ?? "";
    const cpt = patient.claim.procedure_codes?.map(c => `${c.code}  ${c.description} ×${c.units}`).join("\n") ?? "";
    copyText(`DIAGNOSIS CODES (ICD-10)\n${dx}\n\nPROCEDURE CODES (CPT)\n${cpt}`, toast);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Claim Generation</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 6 — AI-suggested ICD-10/CPT codes with gap detection and editable review.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="teal" />
      {!patient && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 mt-2">
          <Receipt className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Select a patient to generate a claim</p>
          <p className="text-xs text-slate-400 mt-1">Choose a patient above to review their case summary and generate ICD-10 / CPT codes.</p>
        </div>
      )}
      {patient && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Case Summary — {patient.name}</h3>
                <div className="flex gap-4 mt-2 text-xs">
                  {["capturedNote", "diagnosticOrder", "diagnosticResults"].map((k, i) => (
                    <span key={k} className={patient[k] ? "text-emerald-600" : "text-slate-400"}>
                      {patient[k] ? "✓" : "○"} {["Clinical note", "Diagnostic order", "Results"][i]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {patient.claim && (
                  <button onClick={copyCodes}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">
                    <Copy className="w-3.5 h-3.5" /> Copy Codes
                  </button>
                )}
                <button onClick={generateClaim} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {patient.claim ? "Regenerate" : "Generate Claim"}
                </button>
              </div>
            </div>
          </div>

          {patient.claim && (
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-5">
                {[
                  { key: "diagnosis_codes",  label: "Diagnosis Codes (ICD-10)", icon: FileText, color: "text-indigo-700" },
                  { key: "procedure_codes",  label: "Procedure Codes (CPT)",    icon: Receipt,  color: "text-teal-700"   }
                ].map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {label}
                    </h3>
                    <div className="space-y-2">
                      {patient.claim[key]?.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-mono text-sm font-bold ${color}`}>
                              {d.code}{d.modifier ? <span className="text-xs text-slate-500 ml-1">mod {d.modifier}</span> : ""}
                            </span>
                            <div className="flex items-center gap-2">
                              {d.units && <span className="text-xs text-slate-500">×{d.units}</span>}
                              <button onClick={() => removeCode(key, i)} className="text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm text-slate-800">{d.description}</div>
                          <div className="text-xs text-slate-500 italic mt-1">↳ {d.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-5">
                {patient.claim.gaps_detected?.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Gaps Detected</h3>
                    <ul className="text-sm text-amber-800 space-y-1">{patient.claim.gaps_detected.map((g, i) => <li key={i}>• {g}</li>)}</ul>
                  </div>
                )}
                {patient.claim.denial_risk_notes?.length > 0 && (
                  <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                    <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Denial Risk Patterns</h3>
                    <ul className="text-sm text-red-800 space-y-1">{patient.claim.denial_risk_notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
                  </div>
                )}
                {patient.claim.similar_prior_cases?.length > 0 && (
                  <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
                    <h3 className="font-semibold text-indigo-900 mb-2">Similar Prior Cases</h3>
                    <ul className="text-sm text-indigo-800 space-y-1">{patient.claim.similar_prior_cases.map((c, i) => <li key={i}>• {c}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── DOCTOR: PATIENT DETAILS ──────────────────────────────────
function PatientDetailsScreen({ patients, setPatients, toast, doctorPatientId, setDoctorPatientId, setScreen }) {
  const [briefLoading, setBriefLoading]     = useState(false);
  const [showCloseVisit, setShowCloseVisit] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpSuggestion, setFollowUpSuggestion] = useState(null);
  const [followUpDate, setFollowUpDate]     = useState("");
  const [followUpTime, setFollowUpTime]     = useState("");
  const [followUpDoctor, setFollowUpDoctor] = useState("");
  const patient = patients.find(p => p.id === doctorPatientId);

  const generateBrief = async () => {
    if (!patient) return;
    setBriefLoading(true);
    const raw = await callClaude(
      `Write a concise pre-visit clinical brief for a doctor about to see this patient.
PATIENT: ${JSON.stringify({ name: patient.name, age: patient.age, gender: patient.gender, history: patient.history, pastVisits: patient.pastVisits })}
Return ONLY JSON: {
  "summary": "2–3 sentence clinical brief",
  "alerts": ["time-sensitive item or overdue screening — keep each under 10 words"]
}`,
      "You are a clinical assistant briefing a doctor before an encounter. Be concise. Output only valid JSON."
    );
    const brief = parseJSON(raw);
    if (brief) {
      setPatients(prev => prev.map(p => p.id === doctorPatientId ? { ...p, aiBrief: brief } : p));
    } else {
      toast("Could not generate brief — retry", "error");
    }
    setBriefLoading(false);
  };

  const loadFollowUpSuggestion = async () => {
    if (!patient || followUpLoading) return;
    setFollowUpLoading(true);
    const raw = await callClaude(
      `Suggest a follow-up appointment for this patient based on their history and recent consultation.
PATIENT: ${JSON.stringify({ name: patient.name, age: patient.age, gender: patient.gender, history: patient.history })}
RECENT NOTE: ${JSON.stringify(patient.capturedNote || "Not captured")}
Today: ${TODAY}
Return ONLY JSON: { "suggested_date": "YYYY-MM-DD", "suggested_time": "HH:MM AM/PM", "doctor": "Dr. Name", "reason": "1 sentence clinical reason for this follow-up timing" }`,
      "You are a clinical scheduling assistant. Output only valid JSON."
    );
    const suggestion = parseJSON(raw);
    if (suggestion) {
      setFollowUpSuggestion(suggestion);
      if (!followUpDate)   setFollowUpDate(suggestion.suggested_date || "");
      if (!followUpTime)   setFollowUpTime(suggestion.suggested_time || "");
      if (!followUpDoctor) setFollowUpDoctor(suggestion.doctor || "");
    }
    setFollowUpLoading(false);
  };

  const confirmCloseVisit = () => {
    const followUp = followUpDate
      ? { date: followUpDate, time: followUpTime || "TBD", doctor: followUpDoctor || "TBD", type: "Follow-up" }
      : null;
    setPatients(prev => prev.map(p => p.id === doctorPatientId
      ? { ...p, closedVisit: TODAY, appointments: followUp ? [...p.appointments, followUp] : p.appointments }
      : p
    ));
    setShowCloseVisit(false);
    toast("Visit closed — claim data ready for the assistant portal");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Patient Details</h2>
      <p className="text-slate-500 mb-5 text-sm">Select a patient to begin — context persists across Capture, Orders, and Results.</p>
      <PatientSelector patients={patients} selectedId={doctorPatientId} onSelect={id => { setDoctorPatientId(id); setShowCloseVisit(false); setFollowUpSuggestion(null); setFollowUpDate(""); setFollowUpTime(""); setFollowUpDoctor(""); }} accent="indigo" />
      {!patient && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 mt-2">
          <User className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-medium text-slate-500">Select a patient to view their details</p>
          <p className="text-xs text-slate-400 mt-1">Choose a patient above to see demographics, medical history, past visits, and generate a Pre-Visit AI Brief.</p>
        </div>
      )}
      {patient && (
        <>
          {/* AI Pre-Visit Brief */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4" /> Pre-Visit AI Brief
              </h3>
              <button onClick={generateBrief} disabled={briefLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-60">
                {briefLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {patient.aiBrief ? "Refresh" : "Generate Brief"}
              </button>
            </div>
            {patient.aiBrief ? (
              <div className="space-y-2">
                <p className="text-sm text-indigo-900">{patient.aiBrief.summary}</p>
                {patient.aiBrief.alerts?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {patient.aiBrief.alerts.map((a, i) => (
                      <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-indigo-600">Click "Generate Brief" for an AI summary before the encounter.</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {patient.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{patient.name}</h3>
                  <div className="text-xs text-slate-500">{patient.id}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {[["Age", patient.age], ["Gender", patient.gender], ["DOB", patient.dob || "—"], ["Phone", patient.phone || "—"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Medical History</h3>
              {patient.history.length > 0
                ? <ul className="space-y-2">{patient.history.map((h, i) => <li key={i} className="text-sm p-2 bg-slate-50 rounded-lg">{h}</li>)}</ul>
                : <p className="text-sm text-slate-500">No known conditions.</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Past Visits</h3>
              {patient.pastVisits.length > 0
                ? patient.pastVisits.map((v, i) => (
                    <div key={i} className="text-sm p-3 bg-slate-50 rounded-lg mb-2">
                      <div className="font-medium text-slate-800">{v.date}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{v.reason}</div>
                      <div className="text-xs text-indigo-600 mt-1">Dx: {v.diagnosis}</div>
                    </div>
                  ))
                : <p className="text-sm text-slate-500">No past visits.</p>}
            </div>
          </div>

          {/* Close Visit */}
          <div className="mt-5 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Close Visit
              </h3>
              {!patient.closedVisit && !showCloseVisit && (
                <button onClick={() => { setShowCloseVisit(true); loadFollowUpSuggestion(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Close Visit
                </button>
              )}
            </div>

            {patient.closedVisit && (
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-slate-600">Visit closed on <strong>{patient.closedVisit}</strong>. The assistant can now generate the claim in the Assistant Portal.</p>
              </div>
            )}

            {showCloseVisit && !patient.closedVisit && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  Closing today's visit for <strong>{patient.name}</strong>. Optionally schedule a follow-up below.
                </p>
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" /> Follow-up Appointment
                    </h4>
                    <button onClick={loadFollowUpSuggestion} disabled={followUpLoading}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-md px-2.5 py-1 transition-colors disabled:opacity-60">
                      {followUpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Suggest
                    </button>
                  </div>
                  {followUpSuggestion?.reason && (
                    <p className="text-xs text-indigo-600 bg-indigo-50 rounded p-2 mb-3 italic">
                      ✦ {followUpSuggestion.reason}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Date</label>
                      <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Time</label>
                      <input value={followUpTime} onChange={e => setFollowUpTime(e.target.value)}
                        placeholder="09:30 AM" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Doctor</label>
                      <input value={followUpDoctor} onChange={e => setFollowUpDoctor(e.target.value)}
                        placeholder="Dr. Name" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCloseVisit(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm">
                    Cancel
                  </button>
                  <button onClick={confirmCloseVisit}
                    className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Close — Generate Claim
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── DOCTOR: CAPTURE DETAILS ──────────────────────────────────
function CaptureScreen({ patients, setPatients, toast, doctorPatientId, setDoctorPatientId, setScreen }) {
  const [mode, setMode]             = useState("conversation");
  const [conversation, setConversation] = useState("");
  const [manual, setManual] = useState({ chief_complaint: "", history_of_present_illness: "", examination_findings: "", assessment: "", plan: "" });
  const [ocrFiles, setOcrFiles]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [listening, setListening]   = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef   = useRef(null);
  const patient = patients.find(p => p.id === doctorPatientId);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Speech recognition not supported", "error"); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    let final = conversation;
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setConversation(final + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };

  const extractFromConversation = async () => {
    if (!conversation) return;
    setLoading(true);
    const ocrCombined = ocrFiles.filter(f => f.extractedText).map(f => f.extractedText).join("\n\n");
    const raw = await callClaude(
      `Extract clinical details from this doctor-patient conversation into SOAP sections.
CONVERSATION: ${conversation}
${ocrCombined ? `OLD RECORDS (OCR):\n${ocrCombined}` : ""}
Return ONLY JSON: { "chief_complaint": "", "history_of_present_illness": "", "examination_findings": "", "assessment": "", "plan": "", "extracted_orders": { "medications": [], "procedures": [], "labs": [], "imaging": [] }, "patient_quotes": [], "gaps": [] }`,
      "You are a clinical scribe AI. Output only valid JSON."
    );
    const note = parseJSON(raw);
    if (note) {
      setPatients(patients.map(p => p.id === doctorPatientId ? { ...p, capturedNote: note } : p));
      toast("SOAP note extracted");
    } else {
      toast("Could not extract note — please retry", "error");
    }
    setLoading(false);
  };

  const saveManual = () => {
    const note = { ...manual, extracted_orders: { medications: [], procedures: [], labs: [], imaging: [] }, gaps: [], source: "manual" };
    setPatients(patients.map(p => p.id === doctorPatientId ? { ...p, capturedNote: note } : p));
    toast("Clinical note saved");
  };

  const handleFileUpload = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const entries = files.map(f => ({ file: f, name: f.name, status: "pending", extractedText: null }));
    setOcrFiles(prev => [...prev, ...entries]);
    setOcrLoading(true);
    for (const entry of entries) {
      const text = await callClaudeWithFile(
        "Extract all text from this medical document. Preserve structure. Output plain text only.",
        entry.file, "You are an OCR assistant for medical documents."
      );
      setOcrFiles(prev => prev.map(f =>
        f.name === entry.name && f.status === "pending"
          ? { ...f, status: text ? "done" : "error", extractedText: text || "" }
          : f
      ));
    }
    setOcrLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyNote = () => {
    if (!patient?.capturedNote) return;
    const n = patient.capturedNote;
    copyText([
      `CHIEF COMPLAINT\n${n.chief_complaint || "—"}`,
      `HISTORY OF PRESENT ILLNESS\n${n.history_of_present_illness || "—"}`,
      `EXAMINATION\n${n.examination_findings || "—"}`,
      `ASSESSMENT\n${n.assessment || "—"}`,
      `PLAN\n${n.plan || "—"}`,
    ].join("\n\n"), toast);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Capture Details</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 3 — Record conversation, upload old records, or enter manually.</p>
      <PatientContextBar patient={patient} onChangePatient={() => setScreen("patients")} />
      {patient && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex">
              {[["conversation", "Conversation", Mic], ["manual", "Manual Entry", ClipboardList]].map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${mode === m ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {mode === "conversation" ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Mic className="w-4 h-4" /> Doctor-Patient Conversation</h3>
                  <div className="flex items-center gap-2">
                    {conversation && <button onClick={() => setConversation("")} className="text-xs text-slate-500 hover:text-slate-800">Clear</button>}
                    <button onClick={toggleVoice}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${listening ? "bg-red-500 text-white animate-pulse" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                      {listening ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Record</>}
                    </button>
                  </div>
                </div>
                {listening && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live transcription active
                  </div>
                )}
                <textarea value={conversation} onChange={e => setConversation(e.target.value)}
                  placeholder={"Doctor: What brings you in today?\nPatient: I've had chest pain for about 2 days...\nDoctor: Any radiation to the arm or jaw?\nPatient: No, just in the center..."}
                  className="w-full h-48 p-3 border border-slate-200 rounded-lg text-sm font-mono" />
                <div className="text-xs text-slate-500 mt-2">
                  {conversation.trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Manual Entry</h3>
                {[
                  ["chief_complaint",            "Chief Complaint",            "Reason for visit"],
                  ["history_of_present_illness", "History of Present Illness", "Onset, duration, severity"],
                  ["examination_findings",        "Examination Findings",       "Vitals and physical exam"],
                  ["assessment",                  "Assessment / Diagnosis",     "Working diagnosis"],
                  ["plan",                        "Plan",                       "Medications, tests, follow-up"]
                ].map(([k, label, ph]) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                    <textarea value={manual[k]} onChange={e => setManual({ ...manual, [k]: e.target.value })}
                      placeholder={ph} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm h-14" />
                  </div>
                ))}
                <button onClick={saveManual} className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">
                  Save Manual Entry
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileUp className="w-4 h-4" /> Upload Old Reports (OCR)</h3>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-60">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
              {ocrFiles.length > 0 ? (
                <div className="space-y-2">
                  {ocrFiles.map(f => (
                    <div key={f.name} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <span className="text-sm truncate text-slate-800">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {f.status === "pending" && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                          {f.status === "done"    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {f.status === "error"   && <AlertCircle  className="w-4 h-4 text-red-500" />}
                          <button onClick={() => setOcrFiles(prev => prev.filter(x => x.name !== f.name))}
                            className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {f.extractedText && (
                        <details className="mt-2">
                          <summary className="text-xs text-indigo-600 cursor-pointer">View extracted text</summary>
                          <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap font-mono bg-white p-2 rounded border border-slate-200 max-h-40 overflow-auto">
                            {f.extractedText}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No files uploaded yet</p>
                </div>
              )}
            </div>

            {mode === "conversation" && (
              <button onClick={extractFromConversation} disabled={loading || !conversation}
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Extract Key Details with Claude
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Structured Clinical Note</h3>
              {patient.capturedNote && (
                <button onClick={copyNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm">
                  <Copy className="w-3.5 h-3.5" /> Copy Note
                </button>
              )}
            </div>
            {patient.capturedNote ? (
              <div className="space-y-3 text-sm">
                <Section label="Chief Complaint"            value={patient.capturedNote.chief_complaint} />
                <Section label="History of Present Illness" value={patient.capturedNote.history_of_present_illness} />
                <Section label="Examination"                value={patient.capturedNote.examination_findings} />
                <Section label="Assessment"                 value={patient.capturedNote.assessment} />
                <Section label="Plan"                       value={patient.capturedNote.plan} />
                {patient.capturedNote.patient_quotes?.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-400">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Notable Patient Quotes</div>
                    <ul className="text-xs text-slate-700 space-y-1 italic">
                      {patient.capturedNote.patient_quotes.map((q, i) => <li key={i}>"{q}"</li>)}
                    </ul>
                  </div>
                )}
                {Object.values(patient.capturedNote.extracted_orders || {}).some(a => a?.length > 0) && (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xs font-semibold text-indigo-900 mb-1">Extracted Orders</div>
                    <div className="text-xs text-indigo-700 space-y-0.5">
                      {Object.entries(patient.capturedNote.extracted_orders).map(([k, v]) =>
                        v?.length > 0 && <div key={k}><span className="font-medium capitalize">{k}:</span> {v.join(", ")}</div>
                      )}
                    </div>
                  </div>
                )}
                {patient.capturedNote.gaps?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Gaps Flagged
                    </div>
                    <ul className="text-xs text-amber-800">
                      {patient.capturedNote.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">Record a conversation, enter manually, or upload reports — then extract.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DOCTOR: DIAGNOSTIC ORDERS ────────────────────────────────
function OrdersScreen({ patients, setPatients, toast, doctorPatientId, setDoctorPatientId, setScreen }) {
  const [input, setInput]           = useState("");
  const [listening, setListening]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const recognitionRef = useRef(null);
  const patient = patients.find(p => p.id === doctorPatientId);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Speech recognition not supported", "error"); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    let final = input; // preserve existing text — same pattern as CaptureScreen
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setInput(final + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };

  const mapOrders = async () => {
    if (!input) return;
    if (!patient) return;
    setLoading(true);
    const raw = await callClaude(
      `Map this order dictation to standard test names and LOINC codes.
Patient: age ${patient.age}, ${patient.gender}, history: ${patient.history.join(", ")}.
Dictation: "${input}".
Return ONLY JSON: { "orders": [{ "test_name": "", "loinc_code": "", "category": "lab|imaging|other", "priority": "high|medium|low", "rationale": "" }], "gaps": [] }`,
      "You are a clinical order entry assistant. Output only valid JSON."
    );
    const order = parseJSON(raw);
    if (order) {
      setPatients(patients.map(p => p.id === doctorPatientId ? { ...p, diagnosticOrder: order } : p));
      toast("Orders mapped to LOINC codes");
    } else {
      toast("Could not map orders — retry", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Diagnostic Order</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 4 — Voice-dictated orders mapped to standard codes.</p>
      <PatientContextBar patient={patient} onChangePatient={() => setScreen("patients")} />
      {patient && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Dictation</h3>
              <button onClick={toggleVoice}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${listening ? "bg-red-500 text-white" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                {listening ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Record</>}
              </button>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              placeholder={`"Order a CBC, lipid profile, HbA1c, and a chest X-ray"`}
              className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm" />
            <button onClick={mapOrders} disabled={loading || !input}
              className="w-full mt-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Map to Standard Codes
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Prioritized Order List</h3>
            {patient.diagnosticOrder?.orders?.length > 0 ? (
              <div className="space-y-2">
                {patient.diagnosticOrder.orders.map((o, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800">{o.test_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.priority === "high" ? "bg-red-100 text-red-700" : o.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                        {o.priority}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">LOINC: <span className="font-mono">{o.loinc_code}</span> · {o.category}</div>
                    <div className="text-xs text-slate-600 italic mt-1">{o.rationale}</div>
                  </div>
                ))}
                {patient.diagnosticOrder.gaps?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-semibold text-amber-900 mb-1">Gaps</div>
                    <ul className="text-xs text-amber-800">
                      {patient.diagnosticOrder.gaps.map((g, i) => <li key={i}>• {g}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">Dictate or type orders, then click Map.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DOCTOR: DIAGNOSTIC RESULTS ───────────────────────────────
function ResultsScreen({ patients, setPatients, toast, doctorPatientId, setDoctorPatientId, setScreen }) {
  const [rawResults, setRawResults]       = useState("");
  const [loading, setLoading]             = useState(false);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const fileInputRef = useRef(null);
  const patient = patients.find(p => p.id === doctorPatientId);

  const analyze = async () => {
    if (!rawResults) return;
    setLoading(true);
    const raw = await callClaude(
      `Analyze these lab/imaging results. Return ONLY JSON:
{ "results": [{ "test": "", "value": "", "unit": "", "range": "", "range_low": 0, "range_high": 0, "numeric_value": 0, "status": "low|normal|high|critical", "read_aloud": "" }], "significant_findings": [], "follow_up_suggestions": [], "report_date": "${TODAY}" }
RESULTS TEXT:\n${rawResults}`,
      "You are a clinical results analysis assistant. Output only valid JSON."
    );
    const results = parseJSON(raw);
    if (results) {
      setPatients(prev => prev.map(p => p.id === doctorPatientId ? { ...p, diagnosticResults: results } : p));
      toast("Results analysed");
    } else {
      toast("Could not parse results — retry", "error");
    }
    setLoading(false);
  };

  // Historical reports stored in patient state — persists across patient switches
  const handleHistoricalUpload = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setHistoricalLoading(true);
    for (const file of files) {
      const text = await callClaudeWithFile(
        `Extract lab values from this report. Return ONLY JSON: { "report_date": "YYYY-MM-DD", "results": [{ "test": "", "value": "", "unit": "", "range": "", "range_low": 0, "range_high": 0, "numeric_value": 0, "status": "low|normal|high|critical" }] }`,
        file, "You are an OCR + medical report parser. Output only valid JSON."
      );
      const parsed = parseJSON(text);
      const entry = parsed
        ? { name: file.name, status: "done",  results: parsed.results || [], date: parsed.report_date }
        : { name: file.name, status: "error", results: [],                    date: null };
      setPatients(prev => prev.map(p =>
        p.id === doctorPatientId
          ? { ...p, historicalReports: [...(p.historicalReports || []).filter(r => r.name !== file.name), entry] }
          : p
      ));
    }
    setHistoricalLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast("Historical reports processed");
  };

  const removeHistorical = name =>
    setPatients(prev => prev.map(p =>
      p.id === doctorPatientId ? { ...p, historicalReports: p.historicalReports.filter(r => r.name !== name) } : p
    ));

  const buildTrendData = () => {
    const allReports = [
      ...(patient?.historicalReports?.filter(f => f.status === "done") || []).map(f => ({ date: f.date || "Unknown", results: f.results })),
      ...(patient?.diagnosticResults?.results ? [{ date: patient.diagnosticResults.report_date || "Today", results: patient.diagnosticResults.results }] : [])
    ];
    const testNames = [...new Set(allReports.flatMap(r => r.results?.map(v => v.test).filter(Boolean) || []))];
    const chartData = [...allReports]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(r => {
        const row = { date: r.date };
        r.results?.forEach(v => { if (v.numeric_value !== undefined) row[v.test] = v.numeric_value; });
        return row;
      });
    return { chartData, testNames };
  };

  const { chartData, testNames } = buildTrendData();
  const currentMetric = selectedMetric || testNames[0];
  const metricRef = [...(patient?.historicalReports || []), { results: patient?.diagnosticResults?.results || [] }]
    .flatMap(f => f.results || [])
    .find(r => r.test === currentMetric);

  const speak  = text => { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; window.speechSynthesis.speak(u); };
  const readAll = () => { if (!patient?.diagnosticResults?.results) return; speak(patient.diagnosticResults.results.map(r => r.read_aloud).join(" ")); };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Diagnostic Results</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 5 — Analyze results, upload historical reports, visualize trends.</p>
      <PatientContextBar patient={patient} onChangePatient={() => setScreen("patients")} />
      {patient && (
        <>
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Paste Current Results</h3>
              <textarea value={rawResults} onChange={e => setRawResults(e.target.value)}
                placeholder={"Hemoglobin: 11.2 g/dL (ref 13-17)\nFBS: 145 mg/dL (ref 70-100)\nTotal Cholesterol: 220 mg/dL (ref <200)"}
                className="w-full h-40 p-3 border border-slate-200 rounded-lg text-sm font-mono" />
              <button onClick={analyze} disabled={loading || !rawResults}
                className="w-full mt-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analyze Results
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileUp className="w-4 h-4" /> Upload Old Lab Reports</h3>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleHistoricalUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={historicalLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-60">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">Claude will OCR and extract values for trend analysis.</p>
              {patient.historicalReports?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {patient.historicalReports.map(f => (
                    <div key={f.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate text-slate-800">{f.name}</div>
                          {f.date && <div className="text-xs text-slate-500">{f.date} · {f.results.length} values</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.status === "pending" && <Loader2    className="w-4 h-4 animate-spin text-indigo-500" />}
                        {f.status === "done"    && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {f.status === "error"   && <AlertCircle  className="w-4 h-4 text-red-500" />}
                        <button onClick={() => removeHistorical(f.name)} className="text-slate-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Upload historical reports to see trends</p>
                </div>
              )}
            </div>
          </div>

          {chartData.length > 1 && testNames.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Trend Analysis</h3>
                <select value={currentMetric} onChange={e => setSelectedMetric(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                  {testNames.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend />
                  {metricRef?.range_low  && <ReferenceLine y={metricRef.range_low}  stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Low ${metricRef.range_low}`,  fontSize: 10, fill: "#f59e0b" }} />}
                  {metricRef?.range_high && <ReferenceLine y={metricRef.range_high} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `High ${metricRef.range_high}`, fontSize: 10, fill: "#f59e0b" }} />}
                  <Line type="monotone" dataKey={currentMetric} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5, fill: "#6366f1" }} activeDot={{ r: 7 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              {metricRef?.range && <p className="text-xs text-slate-500 mt-2 text-center">Reference range: {metricRef.range} {metricRef.unit}</p>}
            </div>
          )}

          {patient.diagnosticResults?.results && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Current Results Analysis</h3>
                <button onClick={readAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200">
                  <Volume2 className="w-3.5 h-3.5" /> Read All
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {patient.diagnosticResults.results.map((r, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${r.status === "low" || r.status === "high" ? "bg-amber-50 border-amber-200" : r.status === "critical" ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{r.test}: <span className="font-mono">{r.value} {r.unit}</span></div>
                        <div className="text-xs text-slate-600">Normal: {r.range} · <span className="capitalize font-semibold">{r.status}</span></div>
                      </div>
                      <button onClick={() => speak(r.read_aloud)} className="p-1.5 hover:bg-white rounded">
                        <Volume2 className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {patient.diagnosticResults.significant_findings?.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-semibold text-red-900 mb-1">Clinically Significant</div>
                  <ul className="text-xs text-red-800 space-y-0.5">
                    {patient.diagnosticResults.significant_findings.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>
              )}
              {patient.diagnosticResults.follow_up_suggestions?.length > 0 && (
                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-xs font-semibold text-indigo-900 mb-1">Follow-up Suggestions</div>
                  <ul className="text-xs text-indigo-800 space-y-0.5">
                    {patient.diagnosticResults.follow_up_suggestions.map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [patients, setPatients]   = useState(initialPatients);
  const [screen, setScreen]       = useState("register");
  const [toasts, setToasts]       = useState([]);
  const [doctorPatientId, setDoctorPatientId] = useState(null);

  const toast = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  const handleLogin = u => {
    setUser(u);
    setScreen(u.role === "doctor" ? "patients" : "register");
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const props    = { patients, setPatients, toast };
  const docProps = { ...props, doctorPatientId, setDoctorPatientId, setScreen };
  const doctorPatientName = patients.find(p => p.id === doctorPatientId)?.name ?? null;

  const screens = {
    doctor: {
      patients: <PatientDetailsScreen {...docProps} />,
      capture:  <CaptureScreen        {...docProps} />,
      orders:   <OrdersScreen         {...docProps} />,
      results:  <ResultsScreen        {...docProps} />,
    },
    assistant: {
      register:     <RegisterScreen     {...props} />,
      appointments: <AppointmentScreen  {...props} />,
      claims:       <ClaimsScreen       {...props} doctorPatientId={doctorPatientId} />,
    },
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} screen={screen} setScreen={setScreen} onLogout={() => setUser(null)} doctorPatientName={doctorPatientName} />
      <main className="flex-1 overflow-auto p-8">
        {screens[user.role]?.[screen] ?? null}
      </main>
      <Toast toasts={toasts} />
    </div>
  );
}
