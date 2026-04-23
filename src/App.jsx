import React, { useState, useRef } from "react";
import {
  Stethoscope, UserCog, LogOut, User, Calendar, FileText,
  ClipboardList, Mic, FlaskConical, Activity, Receipt,
  AlertCircle, CheckCircle2, Loader2, Volume2, Trash2,
  Search, ChevronRight, Sparkles, Square, Upload, X, TrendingUp,
  Image as ImageIcon, FileUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── SHARED SEED DATA ────────────────────────────────────────
const initialPatients = [
  {
    id: "P1001",
    name: "Anita Sharma",
    age: 54,
    gender: "Female",
    phone: "+91-98xxxxxx12",
    dob: "1971-03-14",
    history: ["Hypertension (2018)", "Type 2 Diabetes (2020)"],
    pastVisits: [
      { date: "2026-01-12", reason: "Follow-up HTN", diagnosis: "Essential hypertension" },
      { date: "2025-09-03", reason: "Diabetic review", diagnosis: "T2DM controlled" }
    ],
    appointments: [{ date: "2026-04-22", time: "10:30 AM", doctor: "Dr. Rao" }],
    capturedNote: null, diagnosticOrder: null, diagnosticResults: null, claim: null
  },
  {
    id: "P1002",
    name: "Ravi Kumar",
    age: 42,
    gender: "Male",
    phone: "+91-99xxxxxx45",
    dob: "1983-07-22",
    history: ["Dyslipidemia (2022)"],
    pastVisits: [
      { date: "2025-12-10", reason: "Chest discomfort eval", diagnosis: "Atypical chest pain, R/O ACS" }
    ],
    appointments: [],
    capturedNote: null, diagnosticOrder: null, diagnosticResults: null, claim: null
  }
];

const priorClaimsCorpus = [
  { case: "HTN follow-up + lipid review", icd: ["I10", "E78.5"], cpt: ["99213", "80061"], denialPatterns: ["Missing BP reading in note when billing E/M level 3"] },
  { case: "Diabetes review with labs", icd: ["E11.9"], cpt: ["99214", "83036", "80053"], denialPatterns: ["HbA1c billed without documented diabetes monitoring indication"] },
  { case: "Chest pain workup", icd: ["R07.9"], cpt: ["99214", "93000", "71046"], denialPatterns: ["ECG billed without cardiac symptom documentation"] }
];

// ─── CLAUDE API HELPERS ───────────────────────────────────────
// All API calls go through the secure Netlify serverless proxy (netlify/functions/claude.js).
// The Anthropic API key is stored as an environment variable on the server — never in the browser.

async function callClaude(prompt, systemPrompt = "") {
  try {
    const res = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content.map(b => b.text || "").join("\n").replace(/```json|```/g, "").trim();
  } catch (e) {
    console.error("Claude API error:", e);
    return null;
  }
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
        : { type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
      { type: "text", text: prompt }
    ];
    const res = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content }]
      })
    });
    const data = await res.json();
    return data.content.map(b => b.text || "").join("\n").replace(/```json|```/g, "").trim();
  } catch (e) {
    console.error("Claude vision error:", e);
    return null;
  }
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
              { r: "assistant", label: "Doctor Assistant", Icon: UserCog, color: "teal" },
              { r: "doctor", label: "Doctor", Icon: Stethoscope, color: "indigo" }
            ].map(({ r, label, Icon, color }) => (
              <button key={r} onClick={() => setRole(r)}
                className={`p-4 rounded-xl border-2 transition-all ${role === r ? `border-${color}-400 bg-${color}-400/10` : "border-slate-700 bg-slate-900/40 hover:border-slate-600"}`}>
                <Icon className={`w-6 h-6 mx-auto mb-2 ${role === r ? `text-${color}-400` : "text-slate-400"}`} />
                <div className={`text-sm font-medium ${role === r ? `text-${color}-300` : "text-slate-300"}`}>{label}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
            <input type="password" placeholder="Password (demo: any)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500" />
            <button onClick={() => role && username && onLogin({ role, username })} disabled={!role || !username}
              className={`w-full py-2.5 rounded-lg font-medium transition-all ${role && username ? (role === "doctor" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-teal-500 hover:bg-teal-600") + " text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}>
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
function Sidebar({ user, screen, setScreen, onLogout }) {
  const isDoc = user.role === "doctor";
  const items = isDoc
    ? [
        { id: "patients", label: "Patient Details", icon: User },
        { id: "capture", label: "Capture Details", icon: Mic },
        { id: "orders", label: "Diagnostic Order", icon: FlaskConical },
        { id: "results", label: "Diagnostic Results", icon: Activity }
      ]
    : [
        { id: "register", label: "Patient Registration", icon: ClipboardList },
        { id: "appointments", label: "Appointments", icon: Calendar },
        { id: "claims", label: "Claim Generation", icon: Receipt }
      ];
  const ac = isDoc ? "indigo" : "teal";
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${isDoc ? "from-indigo-400 to-indigo-600" : "from-teal-400 to-teal-600"} flex items-center justify-center`}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">MedAssist AI</div>
            <div className="text-xs text-slate-500 capitalize">{user.role} Portal</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = screen === id;
          return (
            <button key={id} onClick={() => setScreen(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all border-l-2 ${active ? `bg-${ac}-500/15 text-${ac}-300 border-${ac}-400` : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-transparent"}`}>
              <Icon className={`w-4 h-4 ${active ? `text-${ac}-400` : ""}`} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-4 h-4" />}
            </button>
          );
        })}
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
  const filtered = patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input placeholder="Search patients..." value={q} onChange={e => setQ(e.target.value)} className="flex-1 text-sm outline-none" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {filtered.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className={`text-left p-3 rounded-lg border transition-all ${selectedId === p.id ? `border-${accent}-400 bg-${accent}-50` : "border-slate-200 hover:border-slate-300"}`}>
            <div className="text-sm font-medium text-slate-800">{p.name}</div>
            <div className="text-xs text-slate-500">{p.id} · {p.age}y · {p.gender}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION HELPER ───────────────────────────────────────────
function Section({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 p-2 bg-slate-50 rounded">{value || "—"}</div>
    </div>
  );
}

// ─── ASSISTANT: REGISTRATION ──────────────────────────────────
function RegisterScreen({ patients, setPatients }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "Female", phone: "", dob: "" });
  const [payload, setPayload] = useState(null);
  const save = () => {
    if (!form.name || !form.age) return;
    const p = { id: `P${1000 + patients.length + 1}`, ...form, age: parseInt(form.age), history: [], pastVisits: [], appointments: [], capturedNote: null, diagnosticOrder: null, diagnosticResults: null, claim: null };
    setPatients([...patients, p]);
    setPayload({ screen: "Patient Registration", phase: 1, patient: p });
    setForm({ name: "", age: "", gender: "Female", phone: "", dob: "" });
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Patient Registration</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 1 — Register a new patient and generate a structured payload.</p>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Demographics</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Full Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g., Priya Menon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Age *</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={save} className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium text-sm mt-2">Register Patient</button>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-5 text-slate-100">
          <h3 className="font-semibold text-teal-300 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Screen Payload (JSON)</h3>
          {payload ? <pre className="text-xs overflow-auto max-h-96 font-mono">{JSON.stringify(payload, null, 2)}</pre> : <p className="text-sm text-slate-400">Register a patient to see the structured payload.</p>}
        </div>
      </div>
      <div className="mt-5 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Registered Patients ({patients.length})</h3>
        <div className="space-y-2">
          {patients.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">{p.id} · {p.age}y · {p.gender} · {p.phone || "no phone"}</div>
              </div>
              <span className="text-xs text-slate-500">{p.pastVisits.length} visits</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ASSISTANT: APPOINTMENTS ──────────────────────────────────
function AppointmentScreen({ patients, setPatients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const patient = patients.find(p => p.id === selectedId);
  const suggestSlots = async () => {
    if (!patient) return;
    setLoading(true);
    const raw = await callClaude(
      `Suggest 3 appointment time slots for the next 7 days starting April 22 2026. Patient: ${JSON.stringify({ name: patient.name, age: patient.age, history: patient.history, lastVisit: patient.pastVisits[0] })}. Return ONLY JSON: { "suggestions": [{ "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "doctor": "Dr. Name", "reasoning": "brief why" }], "gaps": [] }`,
      "You are a clinic scheduling assistant. Output only valid JSON."
    );
    try { setSuggestions(JSON.parse(raw)); } catch { setSuggestions({ suggestions: [], gaps: ["Could not parse AI response"] }); }
    setLoading(false);
  };
  const bookSlot = slot => setPatients(patients.map(p => p.id === selectedId ? { ...p, appointments: [...p.appointments, slot] } : p));
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Appointment Schedule</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 1 — AI-suggested time slots based on patient context.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="teal" />
      {patient && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Book for {patient.name}</h3>
              <button onClick={suggestSlots} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm disabled:opacity-60">
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
                    <div className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gaps flagged</div>
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
                    <div><div className="text-sm font-medium text-slate-800">{a.date} · {a.time}</div><div className="text-xs text-slate-500">{a.doctor}</div></div>
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
function ClaimsScreen({ patients, setPatients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const [loading, setLoading] = useState(false);
  const patient = patients.find(p => p.id === selectedId);
  const generateClaim = async () => {
    if (!patient) return;
    setLoading(true);
    const prompt = `Generate a medical claim (ICD-10 + CPT) for this patient.
PATIENT: ${JSON.stringify({ name: patient.name, age: patient.age, gender: patient.gender, history: patient.history })}
CLINICAL NOTE: ${JSON.stringify(patient.capturedNote || "Not captured")}
DIAGNOSTIC ORDERS: ${JSON.stringify(patient.diagnosticOrder || "None")}
DIAGNOSTIC RESULTS: ${JSON.stringify(patient.diagnosticResults || "None")}
PRIOR CLAIM PATTERNS: ${JSON.stringify(priorClaimsCorpus)}
Return ONLY JSON:
{
  "patient_id": "${patient.id}",
  "date_of_service": "2026-04-22",
  "diagnosis_codes": [{ "code": "", "description": "", "reason": "" }],
  "procedure_codes": [{ "code": "", "description": "", "units": 1, "modifier": null, "reason": "" }],
  "gaps_detected": [],
  "denial_risk_notes": [],
  "similar_prior_cases": []
}`;
    const raw = await callClaude(prompt, "You are a medical coding assistant. Output only valid JSON.");
    try {
      const claim = JSON.parse(raw);
      setPatients(patients.map(p => p.id === selectedId ? { ...p, claim } : p));
    } catch { alert("Could not parse claim. Please retry."); }
    setLoading(false);
  };
  const removeCode = (type, idx) => {
    const claim = { ...patient.claim, [type]: patient.claim[type].filter((_, i) => i !== idx) };
    setPatients(patients.map(p => p.id === selectedId ? { ...p, claim } : p));
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Claim Generation</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 5 — AI-suggested ICD-10/CPT codes with gap detection and editable review.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="teal" />
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
              <button onClick={generateClaim} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {patient.claim ? "Regenerate" : "Generate Claim"}
              </button>
            </div>
          </div>
          {patient.claim && (
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-5">
                {[
                  { key: "diagnosis_codes", label: "Diagnosis Codes (ICD-10)", icon: FileText, color: "indigo" },
                  { key: "procedure_codes", label: "Procedure Codes (CPT)", icon: Receipt, color: "teal" }
                ].map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Icon className="w-4 h-4" /> {label}</h3>
                    <div className="space-y-2">
                      {patient.claim[key]?.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-mono text-sm font-bold text-${color}-700`}>{d.code}{d.modifier ? <span className="text-xs text-slate-500 ml-1">mod {d.modifier}</span> : ""}</span>
                            <div className="flex items-center gap-2">
                              {d.units && <span className="text-xs text-slate-500">×{d.units}</span>}
                              <button onClick={() => removeCode(key, i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <div className="bg-slate-900 rounded-xl p-5">
                  <h3 className="font-semibold text-teal-300 mb-2 text-sm">Full Claim Payload</h3>
                  <pre className="text-xs text-slate-300 overflow-auto max-h-64 font-mono">{JSON.stringify(patient.claim, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── DOCTOR: PATIENT DETAILS ──────────────────────────────────
function PatientDetailsScreen({ patients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const patient = patients.find(p => p.id === selectedId);
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Patient Details</h2>
      <p className="text-slate-500 mb-5 text-sm">Full patient context — demographics, history, and visits.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="indigo" />
      {patient && (
        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">{patient.name[0]}</div>
              <div><h3 className="font-semibold text-slate-800">{patient.name}</h3><div className="text-xs text-slate-500">{patient.id}</div></div>
            </div>
            <div className="space-y-2 text-sm">
              {[["Age", patient.age], ["Gender", patient.gender], ["DOB", patient.dob || "—"], ["Phone", patient.phone || "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-800">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Medical History</h3>
            {patient.history.length > 0 ? <ul className="space-y-2">{patient.history.map((h, i) => <li key={i} className="text-sm p-2 bg-slate-50 rounded-lg">{h}</li>)}</ul> : <p className="text-sm text-slate-500">No known conditions.</p>}
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
      )}
    </div>
  );
}

// ─── DOCTOR: CAPTURE DETAILS ──────────────────────────────────
function CaptureScreen({ patients, setPatients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const [mode, setMode] = useState("conversation");
  const [conversation, setConversation] = useState("");
  const [manual, setManual] = useState({ chief_complaint: "", history_of_present_illness: "", examination_findings: "", assessment: "", plan: "" });
  const [ocrFiles, setOcrFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const patient = patients.find(p => p.id === selectedId);
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
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
    rec.onend = () => setListening(false);
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
    try {
      const note = JSON.parse(raw);
      setPatients(patients.map(p => p.id === selectedId ? { ...p, capturedNote: note } : p));
    } catch { alert("Could not parse response, try again."); }
    setLoading(false);
  };
  const saveManual = () => {
    const note = { ...manual, extracted_orders: { medications: [], procedures: [], labs: [], imaging: [] }, gaps: [], source: "manual" };
    setPatients(patients.map(p => p.id === selectedId ? { ...p, capturedNote: note } : p));
  };
  const handleFileUpload = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const entries = files.map(f => ({ file: f, name: f.name, status: "pending", extractedText: null }));
    setOcrFiles(prev => [...prev, ...entries]);
    setOcrLoading(true);
    for (const entry of entries) {
      const text = await callClaudeWithFile("Extract all text from this medical document. Preserve structure. Output plain text only.", entry.file, "You are an OCR assistant for medical documents.");
      setOcrFiles(prev => prev.map(f => f.name === entry.name && f.status === "pending" ? { ...f, status: text ? "done" : "error", extractedText: text || "" } : f));
    }
    setOcrLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Capture Details</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 2 — Record conversation, upload old records, or enter manually.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="indigo" />
      {patient && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex">
              {[["conversation", "Conversation", Mic], ["manual", "Manual Entry", ClipboardList]].map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${mode === m ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
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
                    <button onClick={toggleVoice} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${listening ? "bg-red-500 text-white animate-pulse" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                      {listening ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Record</>}
                    </button>
                  </div>
                </div>
                {listening && <div className="flex items-center gap-2 mb-2 text-xs text-red-600"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> Live transcription active</div>}
                <textarea value={conversation} onChange={e => setConversation(e.target.value)} placeholder={"Doctor: What brings you in today?\nPatient: I've had chest pain for about 2 days...\nDoctor: Any radiation to the arm or jaw?\nPatient: No, just in the center..."} className="w-full h-48 p-3 border border-slate-200 rounded-lg text-sm font-mono" />
                <div className="text-xs text-slate-500 mt-2">{conversation.trim().split(/\s+/).filter(Boolean).length} words</div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Manual Entry</h3>
                {[["chief_complaint", "Chief Complaint", "Reason for visit"], ["history_of_present_illness", "History of Present Illness", "Onset, duration, severity"], ["examination_findings", "Examination Findings", "Vitals and physical exam"], ["assessment", "Assessment / Diagnosis", "Working diagnosis"], ["plan", "Plan", "Medications, tests, follow-up"]].map(([k, label, ph]) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
                    <textarea value={manual[k]} onChange={e => setManual({ ...manual, [k]: e.target.value })} placeholder={ph} className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm h-14" />
                  </div>
                ))}
                <button onClick={saveManual} className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Manual Entry</button>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileUp className="w-4 h-4" /> Upload Old Reports (OCR)</h3>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-60">
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
                          {f.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {f.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                          <button onClick={() => setOcrFiles(prev => prev.filter(x => x.name !== f.name))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {f.extractedText && (
                        <details className="mt-2">
                          <summary className="text-xs text-indigo-600 cursor-pointer">View extracted text</summary>
                          <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap font-mono bg-white p-2 rounded border border-slate-200 max-h-40 overflow-auto">{f.extractedText}</pre>
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
              <button onClick={extractFromConversation} disabled={loading || !conversation} className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Extract Key Details with Claude
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Structured Clinical Note</h3>
            {patient.capturedNote ? (
              <div className="space-y-3 text-sm">
                <Section label="Chief Complaint" value={patient.capturedNote.chief_complaint} />
                <Section label="History of Present Illness" value={patient.capturedNote.history_of_present_illness} />
                <Section label="Examination" value={patient.capturedNote.examination_findings} />
                <Section label="Assessment" value={patient.capturedNote.assessment} />
                <Section label="Plan" value={patient.capturedNote.plan} />
                {patient.capturedNote.patient_quotes?.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-lg border-l-4 border-slate-400">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Notable Patient Quotes</div>
                    <ul className="text-xs text-slate-700 space-y-1 italic">{patient.capturedNote.patient_quotes.map((q, i) => <li key={i}>"{q}"</li>)}</ul>
                  </div>
                )}
                {Object.values(patient.capturedNote.extracted_orders || {}).some(a => a?.length > 0) && (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xs font-semibold text-indigo-900 mb-1">Extracted Orders</div>
                    <div className="text-xs text-indigo-700 space-y-0.5">
                      {Object.entries(patient.capturedNote.extracted_orders).map(([k, v]) => v?.length > 0 && <div key={k}><span className="font-medium capitalize">{k}:</span> {v.join(", ")}</div>)}
                    </div>
                  </div>
                )}
                {patient.capturedNote.gaps?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gaps Flagged</div>
                    <ul className="text-xs text-amber-800">{patient.capturedNote.gaps.map((g, i) => <li key={i}>• {g}</li>)}</ul>
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
function OrdersScreen({ patients, setPatients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const patient = patients.find(p => p.id === selectedId);
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " "; setInput(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };
  const mapOrders = async () => {
    if (!input) return;
    setLoading(true);
    const raw = await callClaude(
      `Map this order dictation to standard test names and LOINC codes. Patient: age ${patient.age}, ${patient.gender}, history: ${patient.history.join(", ")}. Dictation: "${input}". Return ONLY JSON: { "orders": [{ "test_name": "", "loinc_code": "", "category": "lab|imaging|other", "priority": "high|medium|low", "rationale": "" }], "gaps": [] }`,
      "You are a clinical order entry assistant. Output only valid JSON."
    );
    try {
      const order = JSON.parse(raw);
      setPatients(patients.map(p => p.id === selectedId ? { ...p, diagnosticOrder: order } : p));
    } catch { alert("Parse error."); }
    setLoading(false);
  };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Diagnostic Order</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 3 — Voice-dictated orders mapped to standard codes.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="indigo" />
      {patient && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Dictation</h3>
              <button onClick={toggleVoice} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${listening ? "bg-red-500 text-white" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                {listening ? <><Square className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Record</>}
              </button>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={`"Order a CBC, lipid profile, HbA1c, and a chest X-ray"`} className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm" />
            <button onClick={mapOrders} disabled={loading || !input} className="w-full mt-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.priority === "high" ? "bg-red-100 text-red-700" : o.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>{o.priority}</span>
                    </div>
                    <div className="text-xs text-slate-500">LOINC: <span className="font-mono">{o.loinc_code}</span> · {o.category}</div>
                    <div className="text-xs text-slate-600 italic mt-1">{o.rationale}</div>
                  </div>
                ))}
                {patient.diagnosticOrder.gaps?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-semibold text-amber-900 mb-1">Gaps</div>
                    <ul className="text-xs text-amber-800">{patient.diagnosticOrder.gaps.map((g, i) => <li key={i}>• {g}</li>)}</ul>
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
function ResultsScreen({ patients, setPatients }) {
  const [selectedId, setSelectedId] = useState(patients[0]?.id);
  const [rawResults, setRawResults] = useState("");
  const [loading, setLoading] = useState(false);
  const [historicalFiles, setHistoricalFiles] = useState([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const fileInputRef = useRef(null);
  const patient = patients.find(p => p.id === selectedId);
  const analyze = async () => {
    if (!rawResults) return;
    setLoading(true);
    const raw = await callClaude(
      `Analyze these lab/imaging results. Return ONLY JSON:
{ "results": [{ "test": "", "value": "", "unit": "", "range": "", "range_low": 0, "range_high": 0, "numeric_value": 0, "status": "low|normal|high|critical", "read_aloud": "" }], "significant_findings": [], "follow_up_suggestions": [], "report_date": "YYYY-MM-DD" }
RESULTS TEXT:\n${rawResults}`,
      "You are a clinical results analysis assistant. Output only valid JSON."
    );
    try {
      const results = JSON.parse(raw);
      setPatients(patients.map(p => p.id === selectedId ? { ...p, diagnosticResults: results } : p));
    } catch { alert("Parse error."); }
    setLoading(false);
  };
  const handleHistoricalUpload = async e => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const entries = files.map(f => ({ file: f, name: f.name, status: "pending", results: [], date: null }));
    setHistoricalFiles(prev => [...prev, ...entries]);
    setHistoricalLoading(true);
    for (const entry of entries) {
      const text = await callClaudeWithFile(
        `Extract lab values from this report. Return ONLY JSON: { "report_date": "YYYY-MM-DD", "results": [{ "test": "", "value": "", "unit": "", "range": "", "range_low": 0, "range_high": 0, "numeric_value": 0, "status": "low|normal|high|critical" }] }`,
        entry.file, "You are an OCR + medical report parser. Output only valid JSON."
      );
      try {
        const parsed = JSON.parse(text);
        setHistoricalFiles(prev => prev.map(f => f.name === entry.name && f.status === "pending" ? { ...f, status: "done", results: parsed.results || [], date: parsed.report_date } : f));
      } catch {
        setHistoricalFiles(prev => prev.map(f => f.name === entry.name && f.status === "pending" ? { ...f, status: "error" } : f));
      }
    }
    setHistoricalLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const buildTrendData = () => {
    const allReports = [
      ...historicalFiles.filter(f => f.status === "done").map(f => ({ date: f.date || "Unknown", results: f.results })),
      ...(patient?.diagnosticResults?.results ? [{ date: patient.diagnosticResults.report_date || "Today", results: patient.diagnosticResults.results }] : [])
    ];
    const testNames = [...new Set(allReports.flatMap(r => r.results?.map(v => v.test).filter(Boolean) || []))];
    const chartData = [...allReports].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map(r => {
      const row = { date: r.date };
      r.results?.forEach(v => { if (v.numeric_value !== undefined) row[v.test] = v.numeric_value; });
      return row;
    });
    return { chartData, testNames };
  };
  const { chartData, testNames } = buildTrendData();
  const currentMetric = selectedMetric || testNames[0];
  const metricRef = [...historicalFiles, { results: patient?.diagnosticResults?.results || [] }].flatMap(f => f.results || []).find(r => r.test === currentMetric);
  const speak = text => { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; window.speechSynthesis.speak(u); };
  const readAll = () => { if (!patient?.diagnosticResults?.results) return; speak(patient.diagnosticResults.results.map(r => r.read_aloud).join(" ")); };
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Diagnostic Results</h2>
      <p className="text-slate-500 mb-5 text-sm">Phase 4 — Analyze results, upload historical reports, visualize trends.</p>
      <PatientSelector patients={patients} selectedId={selectedId} onSelect={setSelectedId} accent="indigo" />
      {patient && (
        <>
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Paste Current Results</h3>
              <textarea value={rawResults} onChange={e => setRawResults(e.target.value)} placeholder={"Hemoglobin: 11.2 g/dL (ref 13-17)\nFBS: 145 mg/dL (ref 70-100)\nTotal Cholesterol: 220 mg/dL (ref <200)"} className="w-full h-40 p-3 border border-slate-200 rounded-lg text-sm font-mono" />
              <button onClick={analyze} disabled={loading || !rawResults} className="w-full mt-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analyze Results
              </button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileUp className="w-4 h-4" /> Upload Old Lab Reports</h3>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple onChange={handleHistoricalUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={historicalLoading} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm disabled:opacity-60">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">Claude will OCR and extract values for trend analysis.</p>
              {historicalFiles.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {historicalFiles.map(f => (
                    <div key={f.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0"><div className="truncate text-slate-800">{f.name}</div>{f.date && <div className="text-xs text-slate-500">{f.date} · {f.results.length} values</div>}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.status === "pending" && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                        {f.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {f.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <button onClick={() => setHistoricalFiles(prev => prev.filter(x => x.name !== f.name))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
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
                <select value={currentMetric} onChange={e => setSelectedMetric(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
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
                  {metricRef?.range_low && <ReferenceLine y={metricRef.range_low} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Low ${metricRef.range_low}`, fontSize: 10, fill: "#f59e0b" }} />}
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
                      <button onClick={() => speak(r.read_aloud)} className="p-1.5 hover:bg-white rounded"><Volume2 className="w-4 h-4 text-slate-600" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {patient.diagnosticResults.significant_findings?.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-xs font-semibold text-red-900 mb-1">Clinically Significant</div>
                  <ul className="text-xs text-red-800 space-y-0.5">{patient.diagnosticResults.significant_findings.map((f, i) => <li key={i}>• {f}</li>)}</ul>
                </div>
              )}
              {patient.diagnosticResults.follow_up_suggestions?.length > 0 && (
                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-xs font-semibold text-indigo-900 mb-1">Follow-up Suggestions</div>
                  <ul className="text-xs text-indigo-800 space-y-0.5">{patient.diagnosticResults.follow_up_suggestions.map((f, i) => <li key={i}>• {f}</li>)}</ul>
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
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState(initialPatients);
  const [screen, setScreen] = useState("register");
  const handleLogin = u => {
    setUser(u);
    setScreen(u.role === "doctor" ? "patients" : "register");
  };
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  const screens = {
    doctor: {
      patients: <PatientDetailsScreen patients={patients} />,
      capture: <CaptureScreen patients={patients} setPatients={setPatients} />,
      orders: <OrdersScreen patients={patients} setPatients={setPatients} />,
      results: <ResultsScreen patients={patients} setPatients={setPatients} />
    },
    assistant: {
      register: <RegisterScreen patients={patients} setPatients={setPatients} />,
      appointments: <AppointmentScreen patients={patients} setPatients={setPatients} />,
      claims: <ClaimsScreen patients={patients} setPatients={setPatients} />
    }
  };
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} screen={screen} setScreen={setScreen} onLogout={() => setUser(null)} />
      <main className="flex-1 overflow-auto p-8">
        {screens[user.role]?.[screen] || null}
      </main>
    </div>
  );
}
