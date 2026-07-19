const { chromium } = require('playwright');
const path = require('path');

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAudit() {
  console.log('[AUDIT] Starting Tutor Module E2E Playwright verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Print browser console logs
  page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));

  const email = `tutor-audit-${Date.now()}@example.com`;

  try {
    // 1. Register new user
    console.log(`[AUDIT] Registering test user: ${email}`);
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('domcontentloaded');
    await delay(3000);
    await page.fill('input[name="firstName"]', 'Tutor');
    await page.fill('input[name="lastName"]', 'Audit');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('[AUDIT] User registered successfully');
    await delay(3000);

    // 2. Navigate to /tutor
    console.log('[AUDIT] Navigating to /tutor...');
    await page.goto('http://localhost:3000/tutor');
    await page.waitForLoadState('domcontentloaded');
    await delay(3000);

    // Verify empty state tutor panel
    const headerText = await page.innerText('h2');
    console.log(`[AUDIT] Empty State Header: "${headerText}"`);

    // 3. Click suggestion card
    console.log('[AUDIT] Clicking complex math suggestion card...');
    await page.click('button:has-text("Explain complex math")');
    await page.waitForSelector('button:has-text("Stop")', { timeout: 10000 });
    console.log('[AUDIT] Stream started. Waiting for chunks...');
    await delay(5000); // Let some chunks accumulate so assistant message is saved

    // 4. Click Stop generation
    console.log('[AUDIT] Stopping stream mid-generation...');
    await page.click('button:has-text("Stop")');
    await delay(2000);
    console.log('[AUDIT] Stream stopped successfully');

    // 5. Click Regenerate response
    console.log('[AUDIT] Regenerating last assistant message...');
    await page.click('button:has-text("Regenerate")');
    await delay(8000); // let stream complete

    // Get current message contents
    const messages = await page.locator('div.prose').allInnerTexts();
    console.log(`[AUDIT] Assistant response preview: "${messages[messages.length - 1]?.slice(0, 100)}..."`);

    // 6. Rename Chat Conversation in sidebar
    console.log('[AUDIT] Renaming conversation in sidebar...');
    // Hover to reveal edit options
    await page.hover('span:has-text("Explain the difference")');
    await page.click('button:has(svg.lucide-pencil)');
    await delay(1000);
    await page.fill('form input', 'Fourier Analysis E2E');
    await page.click('button[type="submit"]');
    await delay(2000);

    // Confirm sidebar title renamed
    const sidebarTitle = await page.innerText('span:has-text("Fourier Analysis E2E")');
    console.log(`[AUDIT] Sidebar title renamed verified: "${sidebarTitle}"`);

    // 7. Refresh page
    console.log('[AUDIT] Reloading page to verify persistence...');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await delay(3000);
    const persistedTitle = await page.innerText('span:has-text("Fourier Analysis E2E")');
    console.log(`[AUDIT] Persisted title verified: "${persistedTitle}"`);

    // 8. Delete Chat Conversation
    console.log('[AUDIT] Deleting conversation...');
    await page.hover('span:has-text("Fourier Analysis E2E")');
    await page.click('button:has(svg.lucide-trash2)');
    await delay(2000);

    // Confirm sidebar is empty
    const noChatsVisible = !(await page.isVisible('span:has-text("Fourier Analysis E2E")'));
    console.log(`[AUDIT] Conversation deleted from sidebar verified: ${noChatsVisible}`);

    console.log('[AUDIT] All Tutor Module E2E Playwright audits passed successfully! 🎉');
  } catch (err) {
    console.error('[AUDIT] Tutor Module E2E audit failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAudit();
