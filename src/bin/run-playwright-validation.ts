import 'dotenv/config';
import { chromium } from 'playwright';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:/Users/Aryan/.gemini/antigravity-ide/brain/f0d3b0e5-6bb0-4ece-b62d-3305316c5ea6/screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('=== STARTING PLAYWRIGHT MANUAL UI VALIDATION ===');
  
  // Find a business with website to use for /[id] and audits
  const biz = await prisma.business.findFirst({
    where: { website: { not: null } }
  }) || await prisma.business.findFirst();
  
  if (!biz) {
    console.error('No business records found in the database. Cannot perform audits/dossier tests.');
    process.exit(1);
  }
  
  const bizId = biz.id;
  console.log(`Using Business ID: ${bizId} (${biz.name}) for detail & audit tests.`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Logging helpers
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`Console error on ${page.url()}: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(`Page error on ${page.url()}: ${err.message}`);
  });

  page.on('requestfailed', req => {
    requestFailures.push(`Request failed: ${req.method()} ${req.url()} (${req.failure()?.errorText})`);
  });

  const pagesToTest = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'discovery', path: '/discovery' },
    { name: 'leads', path: '/leads' },
    { name: 'business_detail', path: `/business/${bizId}` },
    { name: 'opportunities', path: '/opportunities' },
    { name: 'audits', path: '/audits' },
    { name: 'crm', path: '/crm' },
    { name: 'tasks', path: '/tasks' },
    { name: 'settings', path: '/settings' },
  ];

  console.log('\n--- STEP 2: Navigating through all pages & Capturing Screenshots ---');
  for (const p of pagesToTest) {
    console.log(`Navigating to ${p.path}...`);
    consoleErrors.length = 0;
    pageErrors.length = 0;
    requestFailures.length = 0;

    try {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'load', timeout: 30000 });
      // Wait for content to stabilize
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(SCREENSHOT_DIR, `${p.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[OK] Page ${p.path} loaded. Screenshot: ${screenshotPath}`);

      if (consoleErrors.length > 0) {
        console.log(`  - Console errors found:`, consoleErrors);
      }
      if (pageErrors.length > 0) {
        console.log(`  - Page errors found:`, pageErrors);
      }
      if (requestFailures.length > 0) {
        console.log(`  - Network failures found:`, requestFailures);
      }
    } catch (err: any) {
      console.error(`[ERROR] Failed to load ${p.path}: ${err.message}`);
    }
  }

  // --- STEP 3: Run a real search ---
  console.log('\n--- STEP 3: Triggering Search via UI ---');
  try {
    await page.goto(`${BASE_URL}/discovery`);
    await page.waitForTimeout(2000);

    // Type query
    await page.fill('input[placeholder="e.g. Dental Clinic, Salon, Restaurant"]', 'Dentists');
    await page.fill('input[placeholder="e.g. Delhi, Rajouri Garden"]', 'Delhi');
    
    // Click submit button
    console.log('Clicking "Start Search"...');
    await page.click('button[type="submit"]');

    // Wait for search confirmation toast or message
    await page.waitForTimeout(4000);
    const screenshotPath = path.join(SCREENSHOT_DIR, 'discovery_search_queued.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`[OK] Search triggered. Screenshot saved: ${screenshotPath}`);
  } catch (err: any) {
    console.error(`[ERROR] Search trigger failed: ${err.message}`);
  }

  // --- STEP 5: CRM Validation (Create deal and verify logs) ---
  console.log('\n--- STEP 5: Creating Deal via UI ---');
  try {
    await page.goto(`${BASE_URL}/business/${bizId}`);
    await page.waitForTimeout(2000);

    // Wait for and click "Convert to Deal" button if visible
    // First take a screenshot of detail page before deal creation
    const detailScreenshotBefore = path.join(SCREENSHOT_DIR, 'business_detail_before_deal.png');
    await page.screenshot({ path: detailScreenshotBefore });

    const createDealBtn = page.locator('button:has-text("Convert to Deal")').first();
    if (await createDealBtn.count() > 0) {
      console.log('Clicking "Convert to Deal" button on lead page...');
      await createDealBtn.click();
      await page.waitForTimeout(3000);
      const detailScreenshotAfter = path.join(SCREENSHOT_DIR, 'business_detail_after_deal.png');
      await page.screenshot({ path: detailScreenshotAfter });
      console.log(`[OK] Deal creation triggered on lead profile. Screenshot: ${detailScreenshotAfter}`);
    } else {
      console.log('[WARN] "Convert to Deal" button not found on business detail page.');
    }
  } catch (err: any) {
    console.error(`[ERROR] Deal creation trigger failed: ${err.message}`);
  }

  // --- STEP 6: Audit Validation ---
  console.log('\n--- STEP 6: Triggering Scraper Audits via UI ---');
  try {
    await page.goto(`${BASE_URL}/audits`);
    await page.waitForTimeout(2000);

    const fastScanBtn = page.locator('button:has-text("FAST Scan")').first();
    if (await fastScanBtn.count() > 0) {
      console.log('Clicking "FAST Scan" button...');
      await fastScanBtn.click();
      await page.waitForTimeout(3000);
      const fastAuditScreenshot = path.join(SCREENSHOT_DIR, 'audits_fast_scan_triggered.png');
      await page.screenshot({ path: fastAuditScreenshot });
      console.log(`[OK] FAST Scan clicked. Screenshot: ${fastAuditScreenshot}`);
    } else {
      console.log('[WARN] FAST Scan button not found.');
    }
  } catch (err: any) {
    console.error(`[ERROR] FAST Scan click failed: ${err.message}`);
  }

  await browser.close();
  console.log('\n=== PLAYWRIGHT MANUAL UI VALIDATION COMPLETED ===');
}

run().catch(err => {
  console.error('Fatal Validation Script Error:', err);
  process.exit(1);
});
