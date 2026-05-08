import puppeteer from 'puppeteer';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __dirname = dirname(fileURLToPath(import.meta.url));
const framesDir = join(__dirname, '..', 'docs', '_frames');
const outPath   = join(__dirname, '..', 'docs', 'walkthrough.mp4');
mkdirSync(framesDir, { recursive: true });

const BASE = 'http://localhost:5175';
const W = 1280, H = 800;
const FPS = 30;
const HOLD_SECS = 3.5;   // seconds each annotated screen is held
const FADE_SECS = 0.4;   // fade-to-black transition duration

const steps = [
  {
    label: null,
    holdSecs: 2.5,
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await wait(500);
    },
  },
  {
    label: {
      tag:     '🩺  Patient Registration',
      ai:      'Claude generates structured JSON payloads from patient demographics',
      benefit: 'Zero manual data-entry errors — instant EHR-ready records',
    },
    action: async (page) => {
      await page.goto(BASE, { waitUntil: 'networkidle2' });
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
  {
    label: {
      tag:     '📅  Appointment Scheduling',
      ai:      'Claude suggests optimal time slots based on patient history & urgency',
      benefit: 'Smarter scheduling, reduced no-shows, less back-and-forth',
    },
    action: async (page) => { await clickText(page, 'Appointments'); },
  },
  {
    label: {
      tag:     '🧾  Claim Generation',
      ai:      'Claude auto-generates ICD-10 + CPT codes and flags denial risks',
      benefit: 'Faster reimbursements, fewer claim rejections, compliance built-in',
    },
    action: async (page) => { await clickText(page, 'Claim Generation'); },
  },
  {
    label: {
      tag:     '👤  Patient Details',
      ai:      'Full patient context — demographics, medical history, past visits at a glance',
      benefit: 'Complete picture before every encounter — no chart digging',
    },
    action: async (page) => {
      await clickText(page, 'Sign out');
      await wait(600);
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
    },
  },
  {
    label: {
      tag:     '🎙️  Capture Details — SOAP Notes',
      ai:      'Claude transcribes doctor-patient conversations and extracts SOAP notes in real-time',
      benefit: 'Saves 2+ hours of daily documentation per physician',
    },
    action: async (page) => { await clickText(page, 'Capture Details'); },
  },
  {
    label: {
      tag:     '🔬  Diagnostic Orders',
      ai:      'Claude maps voice-dictated orders to LOINC codes with priority & rationale',
      benefit: 'No manual code lookup — instant clinical standardisation',
    },
    action: async (page) => { await clickText(page, 'Diagnostic Order'); },
  },
  {
    label: {
      tag:     '📊  Diagnostic Results',
      ai:      'Claude analyses lab values, flags abnormals, reads results aloud & visualises trends',
      benefit: 'Faster clinical decisions — nothing slips through the cracks',
    },
    action: async (page) => { await clickText(page, 'Diagnostic Results'); },
  },
];

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickText(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('*')].find(
      e => e.textContent.trim() === t && e.offsetParent &&
           ['BUTTON','LI','A','SPAN','DIV'].includes(e.tagName)
    );
    el?.click();
  }, text);
  await wait(900);
}

async function injectOverlay(page, label) {
  await page.evaluate((l) => {
    document.getElementById('__overlay')?.remove();
    const d = document.createElement('div');
    d.id = '__overlay';
    d.style.cssText = `
      position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
      background:rgba(8,18,38,0.93);border:1.5px solid rgba(100,200,255,0.3);
      border-radius:16px;padding:18px 28px;z-index:99999;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      max-width:900px;width:88%;box-shadow:0 12px 48px rgba(0,0,0,0.7);
      backdrop-filter:blur(10px);animation:fadein .35s ease;
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes fadein{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(style);
    d.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#7dd3fc;margin-bottom:8px;letter-spacing:.01em">${l.tag}</div>
      <div style="font-size:13.5px;color:#e2e8f0;margin-bottom:5px;line-height:1.5">
        <span style="color:#34d399;font-weight:600">✦ AI &nbsp;</span>${l.ai}
      </div>
      <div style="font-size:13.5px;color:#e2e8f0;line-height:1.5">
        <span style="color:#fbbf24;font-weight:600">✦ Benefit &nbsp;</span>${l.benefit}
      </div>
    `;
    document.body.appendChild(d);
  }, label);
  await wait(400); // let CSS animation settle
}

async function removeOverlay(page) {
  await page.evaluate(() => document.getElementById('__overlay')?.remove());
}

// capture N frames at 1000/FPS ms apart, save to disk
let frameIndex = 0;
async function captureFrames(page, durationSecs) {
  const count = Math.round(durationSecs * FPS);
  for (let i = 0; i < count; i++) {
    const buf = await page.screenshot({ type: 'png' });
    const filename = join(framesDir, `frame_${String(frameIndex).padStart(6, '0')}.png`);
    writeFileSync(filename, buf);
    frameIndex++;
    if (i < count - 1) await wait(1000 / FPS);
  }
}

// black fade-out then fade-in between screens
async function crossFade(page) {
  const fadeFrames = Math.round(FADE_SECS * FPS);
  const screen = await page.screenshot({ type: 'png' });
  for (let i = 0; i < fadeFrames; i++) {
    const alpha = i / fadeFrames;
    // inject darkening overlay
    await page.evaluate((a) => {
      let el = document.getElementById('__fade');
      if (!el) {
        el = document.createElement('div');
        el.id = '__fade';
        el.style.cssText = 'position:fixed;inset:0;background:#000;z-index:999998;pointer-events:none;';
        document.body.appendChild(el);
      }
      el.style.opacity = String(a);
    }, alpha);
    const buf = await page.screenshot({ type: 'png' });
    writeFileSync(join(framesDir, `frame_${String(frameIndex).padStart(6, '0')}.png`), buf);
    frameIndex++;
    await wait(1000 / FPS);
  }
  // remove fade overlay
  await page.evaluate(() => document.getElementById('__fade')?.remove());
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log('Launching browser…');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const name = step.label?.tag ?? 'Login';
  process.stdout.write(`  [${i+1}/${steps.length}] ${name} … `);

  await step.action(page);
  if (step.label) await injectOverlay(page, step.label);

  await captureFrames(page, step.holdSecs ?? HOLD_SECS);

  if (step.label) await removeOverlay(page);
  if (i < steps.length - 1) await crossFade(page);

  console.log(`done (total frames: ${frameIndex})`);
}

await browser.close();

// ── encode MP4 via ffmpeg ─────────────────────────────────────────────────────
console.log(`\nEncoding ${frameIndex} frames → MP4…`);
await new Promise((resolve, reject) => {
  ffmpeg()
    .input(join(framesDir, 'frame_%06d.png'))
    .inputFPS(FPS)
    .videoCodec('libx264')
    .outputOptions([
      '-pix_fmt yuv420p',   // broad compatibility
      '-crf 20',            // quality (lower = better)
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

// cleanup frames
rmSync(framesDir, { recursive: true, force: true });

console.log(`\n✅  Saved: docs/walkthrough.mp4`);
