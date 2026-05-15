import puppeteer from 'puppeteer';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = dirname(fileURLToPath(import.meta.url));
const framesDir = join(__dirname, '..', 'docs', '_demo_frames');
const outDir    = join(__dirname, '..', 'docs', 'demo-assets');
const outPath   = join(outDir, 'demo.mp4');
mkdirSync(framesDir, { recursive: true });
mkdirSync(outDir,    { recursive: true });

const BASE = 'http://localhost:5173';
const W = 1280, H = 800;
const FPS = 30;
const HOLD  = 5.0;   // seconds each screen is held
const FADE  = 0.4;   // fade-to-black transition

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── helpers ──────────────────────────────────────────────────────────────────
async function clickSidebar(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('nav button, aside button')]
      .find(b => b.textContent.trim().includes(t));
    el?.click();
  }, text);
  await wait(700);
}

async function selectPatient(page, name) {
  await page.evaluate((n) => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent.includes(n) && b.textContent.includes('P10'));
    btn?.click();
  }, name);
  await wait(500);
}

async function injectOverlay(page, label) {
  await page.evaluate((l) => {
    document.getElementById('__overlay')?.remove();
    const style = document.createElement('style');
    style.textContent = `@keyframes fadein{from{opacity:0;transform:translateX(-50%) translateY(14px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);
    const d = document.createElement('div');
    d.id = '__overlay';
    d.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%);
      background:rgba(8,16,36,0.94);border:1.5px solid rgba(100,200,255,0.28);
      border-radius:16px;padding:18px 28px;z-index:99999;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      max-width:920px;width:88%;box-shadow:0 14px 52px rgba(0,0,0,0.72);
      backdrop-filter:blur(12px);animation:fadein .35s ease;
    `;
    d.innerHTML = `
      <div style="font-size:15px;font-weight:700;color:#7dd3fc;margin-bottom:7px;letter-spacing:.01em">${l.tag}</div>
      <div style="font-size:13px;color:#e2e8f0;margin-bottom:5px;line-height:1.55">
        <span style="color:#34d399;font-weight:600">✦ AI &nbsp;</span>${l.ai}
      </div>
      <div style="font-size:13px;color:#e2e8f0;line-height:1.55">
        <span style="color:#fbbf24;font-weight:600">✦ Benefit &nbsp;</span>${l.benefit}
      </div>
    `;
    document.body.appendChild(d);
  }, label);
  await wait(380);
}

async function removeOverlay(page) {
  await page.evaluate(() => document.getElementById('__overlay')?.remove());
}

let frameIndex = 0;
async function captureFrames(page, durationSecs) {
  const count = Math.round(durationSecs * FPS);
  for (let i = 0; i < count; i++) {
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(join(framesDir, `frame_${String(frameIndex).padStart(6, '0')}.png`), buf);
    frameIndex++;
    if (i < count - 1) await wait(1000 / FPS);
  }
}

async function crossFade(page) {
  const fadeFrames = Math.round(FADE * FPS);
  for (let i = 0; i < fadeFrames; i++) {
    const alpha = (i + 1) / fadeFrames;
    await page.evaluate((a) => {
      let el = document.getElementById('__fade');
      if (!el) {
        el = document.createElement('div');
        el.id = '__fade';
        el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:999998;pointer-events:none;transition:none;';
        document.body.appendChild(el);
      }
      el.style.opacity = String(a);
    }, alpha);
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(join(framesDir, `frame_${String(frameIndex).padStart(6, '0')}.png`), buf);
    frameIndex++;
    await wait(1000 / FPS);
  }
  await page.evaluate(() => document.getElementById('__fade')?.remove());
}

const steps = [
  // ── 1. Login ─────────────────────────────────────────────────────────────────
  {
    label: null,
    holdSecs: 3,
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await wait(600);
    },
  },

  // ── 2. Patient Registration + AI Intake Insights for Priya Menon ─────────────
  {
    label: {
      tag:     '🏥  Phase 1 — Patient Registration + AI Intake Insights',
      ai:      'Claude analyses the patient profile and surfaces monitoring priorities, flagged conditions, and suggested intake questions',
      benefit: 'Zero manual triage errors — instant, structured patient intake from the first touch',
    },
    action: async (page) => {
      // Login as Doctor Assistant
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor Assistant')?.click()
      );
      await wait(300);
      await page.type('input[placeholder="Username"]', 'admin');
      await page.type('input[placeholder*="Password"]', 'demo');
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click()
      );
      await wait(1400);

      // Click "View AI Insight" for Priya Menon to populate the insights panel
      await page.evaluate(() => {
        const rows = [...document.querySelectorAll('div')]
          .filter(d => d.textContent.includes('Priya Menon') && d.textContent.includes('P1003'));
        for (const row of rows) {
          const btn = row.querySelector('button');
          if (btn && (btn.textContent.includes('View AI Insight') || btn.textContent.includes('View Insights'))) {
            btn.click();
            return;
          }
        }
        // fallback
        const btn = [...document.querySelectorAll('button')]
          .find(b => b.textContent.includes('View AI Insight'));
        btn?.click();
      });
      await wait(800);
    },
  },

  // ── 3. Intake Capture Form ────────────────────────────────────────────────────
  {
    label: {
      tag:     '📋  Phase 1 (cont.) — Intake Detail Capture',
      ai:      'Claude-suggested questions are pre-populated into a structured form — staff fill in answers in one step',
      benefit: 'Complete, consistent intake every time — no sticky notes, no missing data',
    },
    action: async (page) => {
      // Click "Capture Details Now" inside the insights panel
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(b => b.textContent.includes('Capture Details Now'));
        btn?.click();
      });
      await wait(500);
      // Scroll down slightly so the form is visible
      await page.evaluate(() => window.scrollTo(0, 200));
      await wait(300);

      // Type a sample answer into the first textarea if present
      const firstTextarea = await page.$('textarea');
      if (firstTextarea) {
        await firstTextarea.click();
        await firstTextarea.type('Patient reports mild breathlessness on exertion for the past 2 weeks.', { delay: 18 });
        await wait(400);
      }
    },
  },

  // ── 4. Appointment Scheduling ─────────────────────────────────────────────────
  {
    label: {
      tag:     '📅  Phase 2 — Appointment Scheduling',
      ai:      'Claude suggests optimal slots based on patient history, condition urgency, and existing workload',
      benefit: 'Smarter scheduling — fewer no-shows, less back-and-forth for staff',
    },
    action: async (page) => {
      // Dismiss intake form first (Skip for now)
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')]
          .find(b => b.textContent.trim() === 'Skip for now');
        btn?.click();
      });
      await wait(400);

      await clickSidebar(page, 'Appointments');
      await selectPatient(page, 'Priya Menon');
    },
  },

  // ── 5. Doctor Login + Patient Details ────────────────────────────────────────
  {
    label: {
      tag:     '👤  Phase 3 — Doctor Portal: Patient Details + Pre-Visit Brief',
      ai:      'Claude generates a concise brief — active conditions, medication alerts, overdue screenings — before the encounter begins',
      benefit: 'Doctor walks in fully informed — no chart digging, no missed flags',
    },
    action: async (page) => {
      // Sign out from Assistant
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')?.click()
      );
      await wait(700);

      // Login as Doctor
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor')?.click()
      );
      await wait(300);
      await page.type('input[placeholder="Username"]', 'doctor');
      await page.type('input[placeholder*="Password"]', 'demo');
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click()
      );
      await wait(1400);

      // Select Priya once — context persists across all doctor screens
      await selectPatient(page, 'Priya Menon');
      await wait(400);
      // Scroll slightly to show the Pre-Visit AI Brief
      await page.evaluate(() => window.scrollTo(0, 80));
      await wait(200);
    },
  },

  // ── 6. Capture Details — SOAP Note ───────────────────────────────────────────
  {
    label: {
      tag:     '🎙️  Phase 3 — Capture Details & SOAP Extraction',
      ai:      'Claude transcribes doctor-patient conversations and extracts structured SOAP notes with orders and gap flags',
      benefit: 'Saves 2+ hours of daily documentation — doctor speaks, Claude writes the note',
    },
    action: async (page) => {
      // PatientContextBar carries Priya forward — no re-selection needed
      await clickSidebar(page, 'Capture Details');
      // No selectPatient call — context is inherited from Patient Details
    },
  },

  // ── 7. Diagnostic Orders — LOINC Mapping ─────────────────────────────────────
  {
    label: {
      tag:     '🔬  Phase 4 — Diagnostic Orders',
      ai:      'Claude maps voice-dictated or typed orders to LOINC codes with priority ranking and clinical rationale',
      benefit: 'No manual code lookup — instant clinical standardisation at the point of care',
    },
    action: async (page) => {
      // PatientContextBar carries Priya forward — no re-selection needed
      await clickSidebar(page, 'Diagnostic Order');
    },
  },

  // ── 8. Diagnostic Results — Analysis + Trends ────────────────────────────────
  {
    label: {
      tag:     '📊  Phase 5 — Diagnostic Results',
      ai:      'Claude analyses lab values, flags abnormals, generates read-aloud summaries, and visualises trends across historical uploads',
      benefit: 'Critical values surface instantly — faster clinical decisions, nothing slips through',
    },
    action: async (page) => {
      // PatientContextBar carries Priya forward — no re-selection needed
      await clickSidebar(page, 'Diagnostic Results');
      await wait(500);
    },
  },

  // ── 9. Close Visit ────────────────────────────────────────────────────────────
  {
    label: {
      tag:     '✅  Phase 5 — Close Visit + AI Follow-Up Scheduling',
      ai:      'Claude suggests a follow-up appointment date, specialist, and clinical reason based on the completed encounter',
      benefit: 'One click closes the visit, books the follow-up, and queues the claim — zero admin handoff',
    },
    action: async (page) => {
      // Navigate back to Patient Details to show Close Visit panel
      await clickSidebar(page, 'Patient Details');
      await wait(400);
      // Scroll to bottom where Close Visit panel lives
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await wait(500);
    },
  },

  // ── 10. Claim Generation ──────────────────────────────────────────────────────
  {
    label: {
      tag:     '🧾  Phase 6 — Claim Generation',
      ai:      'Claude auto-generates ICD-10 + CPT codes, detects documentation gaps, and flags denial risk patterns against a prior-claims corpus',
      benefit: 'Faster reimbursements — fewer rejections, compliance built in from the very first draft',
    },
    action: async (page) => {
      // Sign out from Doctor portal
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')?.click()
      );
      await wait(700);

      // Login as Doctor Assistant
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor Assistant')?.click()
      );
      await wait(300);
      await page.type('input[placeholder="Username"]', 'admin');
      await page.type('input[placeholder*="Password"]', 'demo');
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click()
      );
      await wait(1400);

      // Navigate to Claim Generation — Priya is pre-selected from the closed visit
      await clickSidebar(page, 'Claim Generation');
      await wait(400);
      // Ensure Priya is selected (fallback if state was not preserved across login)
      await selectPatient(page, 'Priya Menon');
    },
  },
];

// ── main ──────────────────────────────────────────────────────────────────────
console.log('\n🚀  Launching browser…\n');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const name = step.label?.tag ?? '  Login';
  process.stdout.write(`  [${i + 1}/${steps.length}] ${name} … `);

  await step.action(page);
  if (step.label) await injectOverlay(page, step.label);

  await captureFrames(page, step.holdSecs ?? HOLD);

  if (step.label) await removeOverlay(page);
  if (i < steps.length - 1) await crossFade(page);

  console.log(`done  (frames so far: ${frameIndex})`);
}

await browser.close();

// ── encode ────────────────────────────────────────────────────────────────────
const totalSecs = Math.round(frameIndex / FPS);
console.log(`\n🎬  Encoding ${frameIndex} frames (≈ ${totalSecs}s) → demo.mp4 …`);
await new Promise((resolve, reject) => {
  ffmpeg()
    .input(join(framesDir, 'frame_%06d.png'))
    .inputFPS(FPS)
    .videoCodec('libx264')
    .outputOptions([
      '-pix_fmt yuv420p',
      '-crf 18',
      '-preset slow',
      '-movflags +faststart',
      `-vf scale=${W}:${H}`,
    ])
    .output(outPath)
    .on('progress', p => process.stdout.write(`  encode ${Math.round(p.percent ?? 0)}%\r`))
    .on('end', resolve)
    .on('error', reject)
    .run();
});

rmSync(framesDir, { recursive: true, force: true });
console.log(`\n✅  Saved: docs/demo-assets/demo.mp4  (${totalSecs}s)\n`);
