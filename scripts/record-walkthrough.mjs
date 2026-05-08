import puppeteer from 'puppeteer';
import GIFEncoder from 'gif-encoder-2';
import { createCanvas, loadImage } from 'canvas';
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5175';
const W = 1280, H = 800;
const FPS = 4;           // frames per second
const HOLD_SECS = 2.5;   // seconds to hold each annotated screen

// ── annotation cards per screen ──────────────────────────────────────────────
const steps = [
  {
    label: null, // no overlay on login, just show it clean
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
    },
    holdSecs: 2,
  },
  {
    label: {
      tag:     '🩺 Patient Registration',
      ai:      'Claude generates structured JSON payloads from patient demographics',
      benefit: 'Zero manual data-entry errors, instant EHR-ready records',
    },
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor Assistant')?.click();
      });
      await wait(300);
      await page.type('input[placeholder="Username"]', 'admin');
      await page.type('input[placeholder*="Password"]', 'demo');
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click();
      });
      await wait(1200);
    },
  },
  {
    label: {
      tag:     '📅 Appointment Scheduling',
      ai:      'Claude suggests optimal time slots based on patient history & urgency',
      benefit: 'Smarter scheduling, reduced no-shows, less back-and-forth',
    },
    action: async (page) => {
      await clickText(page, 'Appointments');
    },
  },
  {
    label: {
      tag:     '🧾 Claim Generation',
      ai:      'Claude auto-generates ICD-10 + CPT codes and flags denial risks',
      benefit: 'Faster reimbursements, fewer claim rejections, compliance built-in',
    },
    action: async (page) => {
      await clickText(page, 'Claim Generation');
    },
  },
  {
    label: {
      tag:     '👤 Patient Details',
      ai:      'Full patient context — demographics, medical history, past visits',
      benefit: 'Complete picture before every encounter, no chart digging',
    },
    action: async (page) => {
      await clickText(page, 'Sign out');
      await wait(600);
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor')?.click();
      });
      await wait(300);
      await page.type('input[placeholder="Username"]', 'doctor');
      await page.type('input[placeholder*="Password"]', 'demo');
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click();
      });
      await wait(1200);
    },
  },
  {
    label: {
      tag:     '🎙️ Capture Details — SOAP Notes',
      ai:      'Claude transcribes doctor-patient conversations and extracts SOAP notes in real-time',
      benefit: 'Saves 2+ hours of daily documentation per physician',
    },
    action: async (page) => {
      await clickText(page, 'Capture Details');
    },
  },
  {
    label: {
      tag:     '🔬 Diagnostic Orders',
      ai:      'Claude maps voice-dictated orders to LOINC codes with priority & rationale',
      benefit: 'No manual code lookup — instant clinical standardisation',
    },
    action: async (page) => {
      await clickText(page, 'Diagnostic Order');
    },
  },
  {
    label: {
      tag:     '📊 Diagnostic Results',
      ai:      'Claude analyses lab values, flags abnormals, reads results aloud & visualises trends',
      benefit: 'Faster clinical decisions — nothing slips through the cracks',
    },
    action: async (page) => {
      await clickText(page, 'Diagnostic Results');
    },
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickText(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('*')].find(
      e => e.textContent.trim() === t && e.offsetParent &&
           ['BUTTON','LI','A','SPAN','DIV'].includes(e.tagName)
    );
    if (el) el.click();
  }, text);
  await wait(900);
}

async function injectOverlay(page, label) {
  await page.evaluate((l) => {
    document.getElementById('__walkthrough_overlay')?.remove();
    const d = document.createElement('div');
    d.id = '__walkthrough_overlay';
    d.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
      background:rgba(10,20,40,0.92); border:1.5px solid rgba(100,200,255,0.35);
      border-radius:14px; padding:16px 24px; z-index:99999;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      max-width:860px; width:90%; box-shadow:0 8px 40px rgba(0,0,0,0.6);
      backdrop-filter:blur(8px);
    `;
    d.innerHTML = `
      <div style="font-size:15px;font-weight:700;color:#7dd3fc;margin-bottom:6px;">${l.tag}</div>
      <div style="font-size:13px;color:#e2e8f0;margin-bottom:4px;">
        <span style="color:#34d399;font-weight:600;">✦ AI: </span>${l.ai}
      </div>
      <div style="font-size:13px;color:#e2e8f0;">
        <span style="color:#fbbf24;font-weight:600;">✦ Benefit: </span>${l.benefit}
      </div>
    `;
    document.body.appendChild(d);
  }, label);
}

async function removeOverlay(page) {
  await page.evaluate(() => {
    document.getElementById('__walkthrough_overlay')?.remove();
  });
}

async function captureFrames(page, count) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const buf = await page.screenshot({ type: 'png' });
    frames.push(buf);
    if (i < count - 1) await wait(1000 / FPS);
  }
  return frames;
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log('Launching browser…');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

const allFrames = [];

for (const step of steps) {
  process.stdout.write(`  → ${step.label?.tag ?? 'Login'} … `);
  await step.action(page);

  if (step.label) await injectOverlay(page, step.label);

  const holdFrames = Math.round((step.holdSecs ?? HOLD_SECS) * FPS);
  const frames = await captureFrames(page, holdFrames);
  allFrames.push(...frames);

  if (step.label) await removeOverlay(page);

  // Short transition pause (1 frame)
  const transFrame = await page.screenshot({ type: 'png' });
  allFrames.push(transFrame);

  console.log(`${frames.length} frames`);
}

await browser.close();

// ── encode GIF ────────────────────────────────────────────────────────────────
console.log(`\nEncoding ${allFrames.length} frames into GIF…`);
const encoder = new GIFEncoder(W, H, 'octree', true);
const outPath = join(outDir, 'walkthrough.gif');
const stream = createWriteStream(outPath);
encoder.createReadStream().pipe(stream);

encoder.start();
encoder.setRepeat(0);
encoder.setDelay(Math.round(1000 / FPS));
encoder.setQuality(12);

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

for (let i = 0; i < allFrames.length; i++) {
  if (i % 10 === 0) process.stdout.write(`  frame ${i}/${allFrames.length}\r`);
  const img = await loadImage(allFrames[i]);
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  encoder.addFrame(ctx);
}

encoder.finish();

await new Promise(resolve => stream.on('finish', resolve));
console.log(`\n✅ Saved: docs/walkthrough.gif`);
