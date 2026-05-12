# 🩺 MedAssist AI   https://medassistaipoc.netlify.app/

> **Claude-powered clinical workflow platform** — built as a product prototype by [Krishna Chowdari Paruchuri](https://github.com/krishnaparuchuri-productmanager), Product Manager.

## 🎬 Product Walkthrough

<video src="docs/walkthrough.mp4" controls width="100%" style="border-radius:12px"></video>

> Can't see the video? [Download walkthrough.mp4](docs/walkthrough.mp4)

A full-stack React web application that uses Anthropic's Claude API to automate and augment every stage of a clinical encounter — from patient registration through to insurance claim generation.

---

## 📸 Screenshots

### Login
![Login Screen](docs/screenshots/01_login.png)

### 👩‍💼 Doctor Assistant Portal

**Patient Registration** — Register patients; Claude generates AI Intake Insights (monitoring priorities, suggested questions, intake note)
![Patient Registration](docs/screenshots/02_assistant_patient_registration.png)

**Appointment Schedule** — AI-suggested time slots based on patient context
![Appointments](docs/screenshots/03_assistant_appointments.png)

**Claim Generation** — Auto-generates ICD-10/CPT codes with gap detection
![Claim Generation](docs/screenshots/04_assistant_claim_generation.png)

### 🩺 Doctor Portal

**Patient Details** — Full demographics, medical history, and past visits
![Patient Details](docs/screenshots/05_doctor_patient_details.png)

**Capture Details** — Voice transcription and SOAP note extraction
![Capture Details](docs/screenshots/06_doctor_capture_details.png)

**Diagnostic Order** — Voice-dictated orders mapped to LOINC codes
![Diagnostic Order](docs/screenshots/07_doctor_diagnostic_order.png)

**Diagnostic Results** — Lab analysis, abnormality flagging, and trend charts
![Diagnostic Results](docs/screenshots/08_doctor_diagnostic_results.png)

---

## ✨ What It Does

MedAssist AI covers **6 phases** of the clinical workflow across two role-based portals:

### 👩‍💼 Doctor Assistant Portal
| Screen | What Claude Does |
|--------|-----------------|
| **Patient Registration** | Registers patients and generates AI Intake Insights — monitoring priorities, suggested questions, and an intake note |
| **Appointment Scheduling** | Suggests time slots with AI rationale based on patient history |
| **Claim Generation** | Auto-generates ICD-10 + CPT codes, flags denial risks, compares against prior cases |

### 🩺 Doctor Portal
| Screen | What Claude Does |
|--------|-----------------|
| **Patient Details** | Displays full demographics, medical history, past visits, and generates a Pre-Visit AI Brief |
| **Capture Details** | Transcribes doctor-patient conversations (live mic or text), extracts SOAP notes via Claude, OCRs uploaded medical reports |
| **Diagnostic Orders** | Maps voice-dictated orders to LOINC codes with priority and rationale |
| **Diagnostic Results** | Analyzes lab values, flags abnormals, reads results aloud, visualizes trends across historical uploads |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| API Proxy | Netlify Functions (server-side — key never reaches the browser) |
| Voice | Web Speech API (built-in browser) |
| OCR | Claude Vision (PDF + image) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An [Anthropic API key])

### Installation

```bash
git clone https://github.com/krishnaparuchuri-productmanager/medassist-ai.git
cd medassist-ai
npm install
```

### Configuration

All API calls go through a Netlify serverless function (`netlify/functions/claude.js`) — the API key **never reaches the browser**.

For **local development**, create a `.env.local` file in the root:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then run with the Netlify CLI so the function is available locally:

```bash
npx netlify dev
```

Or, if you just want to run the frontend without the Netlify function layer:

```bash
npm run dev
```

> ⚠️ With `npm run dev` alone, Claude features won't work because `/.netlify/functions/claude` isn't served. Use `npx netlify dev` for full local functionality.

For **Netlify deployment**, set `ANTHROPIC_API_KEY` in your Netlify site's **Environment Variables** (Site Settings → Environment Variables). Do **not** use the `VITE_` prefix — that would expose the key in the browser bundle.

Open [http://localhost:8888](http://localhost:8888) when using `netlify dev`, or [http://localhost:5173](http://localhost:5173) for frontend-only.

---

## 📁 Project Structure

```
medassist-ai/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── netlify/
│   └── functions/
│       └── claude.js   # Secure server-side proxy — API key lives here only
└── src/
    ├── main.jsx        # React entry point
    ├── index.css       # Tailwind base styles
    └── App.jsx         # All screens, components, and Claude API logic
```

---

## 🎯 Key Features

- **Role-based login** — Doctor vs. Doctor Assistant, each with a tailored sidebar and workflow
- **Live voice transcription** — Real-time mic capture using the Web Speech API
- **Claude-powered SOAP extraction** — Converts raw conversation text into structured clinical notes
- **OCR via Claude Vision** — Upload handwritten or printed lab reports (PDF/image) and extract values automatically
- **Trend visualization** — Line charts with reference range overlays across historical lab uploads
- **Text-to-speech readout** — Results read aloud using the browser's Speech Synthesis API
- **ICD-10 / CPT claim generation** — AI-coded claims with gap detection and denial risk analysis
- **LOINC code mapping** — Voice-dictated diagnostic orders mapped to standard codes with rationale

---

## 🔒 Security Note

This is a **prototype / demo application**. Patient data is held in React state only (no database).

**What's already secured:**
- All Claude API calls are proxied through `netlify/functions/claude.js` — the API key is a server-side environment variable and is never bundled into the browser JavaScript
- The proxy whitelists allowed models and caps `max_tokens` to prevent cost abuse
- CORS headers are enforced on the function

**For any real clinical use, additionally:**
- Implement proper authentication and session management
- Use HIPAA-compliant infrastructure and data storage
- Do not store real patient data in browser state

---

## 👤 About

Built by **Krishna Chowdari Paruchuri** as an AI product prototype demonstrating how large language models can streamline clinical workflows for doctors and medical staff.

- GitHub: [@krishnaparuchuri-productmanager](https://github.com/krishnaparuchuri-productmanager)
- Email: krishna1parchuri@gmail.com

---

## 📄 License

MIT — free to use, fork, and build upon.
