import { test } from '@playwright/test';

test('Debug App - Check Console & Errors', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  // Capture console
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${text}`);
    } else if (text.includes('[DB') || text.includes('Init') || text.includes('Migration')) {
      logs.push(`[${msg.type().toUpperCase()}] ${text}`);
    }
  });

  // Capture page errors
  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  console.log('\n=== OPENING APP ===\n');
  
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000);

  console.log('\n=== CONSOLE LOGS ===');
  logs.forEach(log => console.log(log));

  console.log('\n=== ERRORS ===');
  if (errors.length === 0) {
    console.log('✓ No errors!');
  } else {
    errors.forEach(err => console.log(err));
  }

  console.log('\n=== PAGE STATE ===');
  const title = await page.title();
  console.log('Title:', title);

  const bodyText = await page.locator('body').textContent();
  console.log('Body preview:', bodyText?.substring(0, 200));

  await page.screenshot({ path: 'debug-app.png', fullPage: true });
  console.log('\n✓ Screenshot saved: debug-app.png\n');
});
