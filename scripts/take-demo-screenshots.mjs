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
    const el = [...document.querySelectorAll('nav button, aside button')].find(
      b => b.textContent.trim().includes(t)
    );
    el?.click();
  }, text);
  await wait(700);
}

async function selectPatient(page, name) {
  await page.evaluate((n) => {
    const btn = [...document.querySelectorAll('button')].find(
      b => b.textContent.includes(n) && b.textContent.includes('P10')
    );
    btn?.click();
  }, name);
  await wait(500);
}

async function shot(page, filename, label) {
  process.stdout.write(`  📸  ${label} … `);
  await page.screenshot({ path: join(outDir, filename), type: 'png' });
  console.log('saved');
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log('\n🚀  Launching browser…');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });

// 01 — Login screen
await page.goto(BASE, { waitUntil: 'networkidle2' });
await wait(600);
await shot(page, '01-login.png', 'Login screen');

// ── Doctor Assistant flow ──────────────────────────────────────────────────
// Click Doctor Assistant role
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

// 02 — Registration + AI Intake Insights (pre-seeded from Priya Menon)
await shot(page, '02-registration-ai-insights.png', 'Registration + AI Intake Insights');

// 03 — Appointment Scheduling
await clickSidebar(page, 'Appointments');
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '03-appointment-scheduling.png', 'Appointment Scheduling');

// 04 — Claim Generation
await clickSidebar(page, 'Claim Generation');
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '04-claim-generation.png', 'Claim Generation');

// ── Doctor flow ────────────────────────────────────────────────────────────
// Sign out and switch to Doctor
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
await wait(1200);

// 05 — Patient Details (default is first patient, switch to Priya)
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '05-patient-details.png', 'Patient Details');

// 06 — Patient Details — Pre-Visit AI Brief visible
// Scroll down a little so the brief card is prominent
await page.evaluate(() => window.scrollTo(0, 80));
await wait(200);
await shot(page, '06-pre-visit-brief.png', 'Pre-Visit AI Brief');

// 07 — Capture Details — SOAP Note
await clickSidebar(page, 'Capture Details');
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '07-capture-soap-note.png', 'Capture Details — SOAP Note');

// 08 — Diagnostic Orders — LOINC mapped
await clickSidebar(page, 'Diagnostic Order');
await selectPatient(page, 'Priya Menon');
await wait(400);
await shot(page, '08-diagnostic-orders.png', 'Diagnostic Orders — LOINC codes');

// 09 — Diagnostic Results — Lab analysis
await clickSidebar(page, 'Diagnostic Results');
await selectPatient(page, 'Priya Menon');
await wait(500);
await shot(page, '09-diagnostic-results.png', 'Diagnostic Results — Lab analysis');

// 10 — Diagnostic Results — Trend chart (scroll down)
await page.evaluate(() => window.scrollTo(0, 500));
await wait(300);
await shot(page, '10-trend-chart.png', 'Diagnostic Results — Trend chart');

await browser.close();
console.log(`\n✅  All screenshots saved to docs/demo-assets/\n`);
