# 🩺 MedAssist AI   https://medassistaipoc.netlify.app/

> **Claude-powered clinical workflow platform** — built as a product prototype by [Krishna Chowdari Paruchuri](https://github.com/krishnaparuchuri-productmanager), Product Manager.

A full-stack React web application that uses Anthropic's Claude API to automate and augment every stage of a clinical encounter — from patient registration through to insurance claim generation.

---

## ✨ What It Does

MedAssist AI covers **5 phases** of the clinical workflow across two role-based portals:

### 👩‍💼 Doctor Assistant Portal
| Screen | What Claude Does |
|--------|-----------------|
| **Patient Registration** | Registers patients and generates structured JSON payloads |
| **Appointment Scheduling** | Suggests time slots with AI rationale based on patient history |
| **Claim Generation** | Auto-generates ICD-10 + CPT codes, flags denial risks, compares against prior cases |

### 🩺 Doctor Portal
| Screen | What Claude Does |
|--------|-----------------|
| **Patient Details** | Displays full demographics, medical history, and past visits |
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
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Voice | Web Speech API (built-in browser) |
| OCR | Claude Vision (PDF + image) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
git clone https://github.com/krishnaparuchuri-productmanager/medassist-ai.git
cd medassist-ai
npm install
```

### Configuration

Create a `.env.local` file in the root:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> ⚠️ **Note:** This prototype calls the Anthropic API directly from the browser. In production, API calls should be proxied through a secure backend to protect your key.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

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

This is a **prototype / demo application**. Patient data is held in React state only (no database). For any real clinical use:
- Proxy all Claude API calls through a server-side endpoint
- Implement proper authentication and HIPAA-compliant data handling
- Do not store real patient data in browser state

---

## 👤 About

Built by **Krishna Chowdari Paruchuri** as an AI product prototype demonstrating how large language models can streamline clinical workflows for doctors and medical staff.

- GitHub: [@krishnaparuchuri-productmanager](https://github.com/krishnaparuchuri-productmanager)
- Email: krishna1parchuri@gmail.com

---

## 📄 License

MIT — free to use, fork, and build upon.
