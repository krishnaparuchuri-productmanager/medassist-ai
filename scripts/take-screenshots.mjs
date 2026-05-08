import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:5175';

async function shot(page, filename) {
  await page.screenshot({ path: join(outDir, filename), fullPage: false });
  console.log('Saved:', filename);
}

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('*')].find(
      e => e.textContent.trim() === t && e.offsetParent && (e.tagName === 'BUTTON' || e.tagName === 'LI' || e.tagName === 'A' || e.tagName === 'SPAN')
    );
    if (el) el.click();
  }, text);
  await new Promise(r => setTimeout(r, 900));
}

async function login(page, role) {
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('button');
  const roleText = role === 'assistant' ? 'Doctor Assistant' : 'Doctor';
  // Click role selector button
  await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t);
    if (btn) btn.click();
  }, roleText);
  await new Promise(r => setTimeout(r, 300));
  await page.type('input[placeholder="Username"]', role);
  await page.type('input[placeholder*="Password"]', 'demo');
  // Click Sign In button
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign In');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

// --- Login screen ---
await page.goto(BASE, { waitUntil: 'networkidle2' });
await shot(page, '01_login.png');

// --- Doctor Assistant Portal ---
await login(page, 'assistant');
await shot(page, '02_assistant_patient_registration.png');

// Appointments
await clickByText(page, 'Appointments');
await shot(page, '03_assistant_appointments.png');

// Claim Generation
await clickByText(page, 'Claim Generation');
await shot(page, '04_assistant_claim_generation.png');

// Sign out
await clickByText(page, 'Sign out');
await new Promise(r => setTimeout(r, 800));

// --- Doctor Portal ---
await login(page, 'doctor');
await shot(page, '05_doctor_patient_details.png');

// Capture Details
await clickByText(page, 'Capture Details');
await shot(page, '06_doctor_capture_details.png');

// Diagnostic Order
await clickByText(page, 'Diagnostic Order');
await shot(page, '07_doctor_diagnostic_order.png');

// Diagnostic Results
await clickByText(page, 'Diagnostic Results');
await shot(page, '08_doctor_diagnostic_results.png');

await browser.close();
console.log('All screenshots saved to docs/screenshots/');
