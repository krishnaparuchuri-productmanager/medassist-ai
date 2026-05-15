import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs', 'demo-assets');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5173';
const W = 1280, H = 800;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickSidebar(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('nav button, aside button')]
      .find(b => b.textContent.trim().includes(t));
    el?.click();
  }, text);
  await wait(800);
}

async function selectPatient(page, name) {
  await page.evaluate((n) => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => b.textContent.includes(n) && b.textContent.includes('P10'));
    btn?.click();
  }, name);
  await wait(600);
}

async function shot(page, filename, label) {
  process.stdout.write(`  📸  ${label} … `);
  await page.screenshot({ path: join(outDir, filename), type: 'png' });
  console.log('saved');
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log('\n🚀  Launching browser…');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

// ── 01 Login ─────────────────────────────────────────────────────────────────
await page.goto(BASE, { waitUntil: 'networkidle2' });
await wait(600);
await shot(page, '01-login.png', 'Login screen');

// ── Login as Doctor Assistant ─────────────────────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor Assistant')?.click();
});
await wait(300);
await page.type('input[placeholder="Username"]', 'admin');
await page.type('input[placeholder*="Password"]', 'demo');
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click();
});
await wait(1400);

// ── 02 Registration — View AI Insight for Priya ───────────────────────────────
// Click "View AI Insight" button in Priya's row to populate the insights panel
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter(d => d.textContent.includes('Priya Menon') && d.textContent.includes('P1003'));
  for (const row of rows) {
    const btn = row.querySelector('button');
    if (btn && (btn.textContent.includes('View AI Insight') || btn.textContent.includes('View Insights'))) {
      btn.click();
      return;
    }
  }
  // fallback: find any button with "View AI Insight" text
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('View AI Insight'));
  btn?.click();
});
await wait(600);
await shot(page, '02-registration-ai-insights.png', 'Registration + AI Intake Insights for Priya Menon');

// ── 03 Intake Capture Form (click "Capture Details Now") ─────────────────────
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Capture Details Now'));
  btn?.click();
});
await wait(500);
await page.evaluate(() => window.scrollTo(0, 200));
await wait(300);
await shot(page, '03-intake-capture-form.png', 'Intake Detail Capture Form');

// scroll back up and dismiss form
await page.evaluate(() => window.scrollTo(0, 0));
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Skip for now');
  btn?.click();
});
await wait(400);

// ── 04 Appointment Scheduling ─────────────────────────────────────────────────
await clickSidebar(page, 'Appointments');
await selectPatient(page, 'Priya Menon');
await shot(page, '04-appointment-scheduling.png', 'Appointment Scheduling — Priya Menon');

// ── 05 Claim Generation ───────────────────────────────────────────────────────
await clickSidebar(page, 'Claim Generation');
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '05-claim-generation.png', 'Claim Generation — Priya Menon');

// ── Switch to Doctor ──────────────────────────────────────────────────────────
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign out')?.click();
});
await wait(700);
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Doctor')?.click();
});
await wait(300);
await page.type('input[placeholder="Username"]', 'doctor');
await page.type('input[placeholder*="Password"]', 'demo');
await page.evaluate(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In')?.click();
});
await wait(1400);

// ── 06 Patient Details — select Priya ────────────────────────────────────────
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '06-patient-details.png', 'Patient Details — Priya Menon');

// ── 07 Pre-Visit AI Brief ─────────────────────────────────────────────────────
await page.evaluate(() => window.scrollTo(0, 80));
await wait(200);
await shot(page, '07-pre-visit-brief.png', 'Pre-Visit AI Brief');

// ── 08 Capture Details — PatientContextBar shows Priya (no re-select needed) ──
await clickSidebar(page, 'Capture Details');
await shot(page, '08-capture-soap-note.png', 'Capture Details — SOAP Note (patient context persists)');

// ── 09 Diagnostic Orders ──────────────────────────────────────────────────────
await clickSidebar(page, 'Diagnostic Order');
await shot(page, '09-diagnostic-orders.png', 'Diagnostic Orders — LOINC mapping');

// ── 10 Diagnostic Results ─────────────────────────────────────────────────────
await clickSidebar(page, 'Diagnostic Results');
await wait(500);
await shot(page, '10-diagnostic-results.png', 'Diagnostic Results — Lab analysis');

// ── 11 Trend Chart ────────────────────────────────────────────────────────────
await page.evaluate(() => window.scrollTo(0, 500));
await wait(300);
await shot(page, '11-trend-chart.png', 'Diagnostic Results — Trend chart');

// ── 12 Close Visit — scroll to bottom of Patient Details ─────────────────────
await clickSidebar(page, 'Patient Details');
await wait(400);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(400);
await shot(page, '12-close-visit.png', 'Close Visit + Follow-up Scheduling panel');

await browser.close();
console.log(`\n✅  12 screenshots saved to docs/demo-assets/\n`);
