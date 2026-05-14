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

const steps = [
  // ── 1. Login ──────────────────────────────────────────────────────────────
  {
    label: null,
    holdSecs: 3,
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await wait(600);
    },
  },
  // ── 2. Patient Registration + AI Intake Insights ─────────────────────────
  {
    label: {
      tag:     '🏥  Phase 1 — Patient Registration',
      ai:      'Claude analyses the profile and surfaces monitoring priorities, intake flags, and suggested questions',
      benefit: 'Zero manual data-entry errors — instant, structured patient intake',
    },
    action: async (page) => {
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
    },
  },
  // ── 3. Appointment Scheduling ─────────────────────────────────────────────
  {
    label: {
      tag:     '📅  Phase 2 — Appointment Scheduling',
      ai:      'Claude suggests optimal slots based on patient history, condition urgency, and workload',
      benefit: 'Smarter scheduling — fewer no-shows, less back-and-forth for staff',
    },
    action: async (page) => {
      await clickSidebar(page, 'Appointments');
      await selectPatient(page, 'Priya Menon');
    },
  },
  // ── 4. Patient Details + Pre-Visit Brief ─────────────────────────────────
  {
    label: {
      tag:     '👤  Phase 3 — Patient Details + Pre-Visit Brief',
      ai:      'Claude generates a concise brief — active conditions, medication changes, overdue screenings — before the encounter',
      benefit: 'Doctor walks in fully informed — no chart digging before the visit',
    },
    action: async (page) => {
      // Sign out and switch to Doctor
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')?.click()
      );
      await wait(700);
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
      await selectPatient(page, 'Priya Menon');
    },
  },
  // ── 5. Capture Details — SOAP Note ───────────────────────────────────────
  {
    label: {
      tag:     '🎙️  Phase 3 — Capture Details & SOAP Extraction',
      ai:      'Claude transcribes doctor-patient conversations and extracts structured SOAP notes with extracted orders and gap flags',
      benefit: 'Saves 2+ hours of daily documentation — doctor speaks, Claude writes',
    },
    action: async (page) => {
      await clickSidebar(page, 'Capture Details');
      await selectPatient(page, 'Priya Menon');
    },
  },
  // ── 6. Diagnostic Orders — LOINC mapping ─────────────────────────────────
  {
    label: {
      tag:     '🔬  Phase 4 — Diagnostic Orders',
      ai:      'Claude maps voice-dictated or typed orders to LOINC codes with priority ranking and clinical rationale',
      benefit: 'No manual code lookup — instant clinical standardisation at the point of care',
    },
    action: async (page) => {
      await clickSidebar(page, 'Diagnostic Order');
      await selectPatient(page, 'Priya Menon');
    },
  },
  // ── 7. Diagnostic Results — Analysis + Trends ────────────────────────────
  {
    label: {
      tag:     '📊  Phase 5 — Diagnostic Results',
      ai:      'Claude analyses lab values, flags abnormals, generates read-aloud summaries, and visualises trends across historical uploads',
      benefit: 'Faster clinical decisions — critical values surface instantly, nothing slips through',
    },
    action: async (page) => {
      await clickSidebar(page, 'Diagnostic Results');
      await selectPatient(page, 'Priya Menon');
      await wait(400);
    },
  },
  // ── 8. Claim Generation ───────────────────────────────────────────────────
  {
    label: {
      tag:     '🧾  Phase 6 — Claim Generation',
      ai:      'Claude auto-generates ICD-10 + CPT codes, detects documentation gaps, and flags denial risk patterns against a prior-claims corpus',
      benefit: 'Faster reimbursements — fewer rejections, compliance built in from the first draft',
    },
    action: async (page) => {
      await page.evaluate(() =>
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')?.click()
      );
      await wait(700);
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
      await clickSidebar(page, 'Claim Generation');
      await selectPatient(page, 'Priya Menon');
    },
  },
];

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
console.log(`\n🎬  Encoding ${frameIndex} frames → demo.mp4 …`);
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
console.log(`\n✅  Saved: docs/demo-assets/demo.mp4\n`);
