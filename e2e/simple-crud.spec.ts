/**
 * Simpler CRUD Test - nur CREATE und READ
 */
import { test, expect } from '@playwright/test';

test('CREATE & READ: Medication erstellen und anzeigen', async ({ page }) => {
  // Enable all logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DB Stub]') || text.includes('[useMedications]')) {
      console.log(`[Browser ${msg.type()}]`, text);
    }
  });
  page.on('pageerror', err => {
    console.error('[Browser ERROR]', err.message);
    console.error('[Stack]', err.stack);
  });

  await page.goto('http://localhost:5174');
  await page.waitForLoadState('networkidle');

  console.log('\n✓ App geladen\n');

  // Öffne Form
  await page.getByTestId('add-medication-button').click();
  await expect(page.getByTestId('medication-name-input')).toBeVisible();

  console.log('✓ Form geöffnet\n');

  // Fülle minimale Daten
  await page.getByTestId('medication-name-input').fill('TestMed');
  await page.getByTestId('dosage-amount-input').fill('100');
  await page.getByTestId('dosage-unit-select').selectOption('mg');
  await page.getByTestId('interval-select').selectOption('DAILY');
  await page.getByTestId('schedule-time-0').fill('08:00');

  console.log('✓ Form ausgefüllt\n');
  console.log('=== SAVING ===\n');

  // Speichern
  await page.getByTestId('save-medication-button').click();

  // Warte bis Form geschlossen
  await expect(page.getByTestId('medication-name-input')).not.toBeVisible({ timeout: 5000 });

  console.log('\n✓ Form geschlossen\n');
  console.log('=== CHECKING IF CARD APPEARS ===\n');

  // Warte ein bisschen
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: 'simple-crud-test.png', fullPage: true });

  // Check für Card
  const cardCount = await page.locator('[data-testid^="medication-card-"]').count();
  console.log(`\nFound ${cardCount} card(s)\n`);

  if (cardCount === 0) {
    // Debugging info
    const bodyText = await page.locator('body').textContent();
    console.log('=== PAGE CONTENT ===');
    console.log(bodyText);
    console.log('=== END PAGE CONTENT ===\n');

    // Fail
    throw new Error('❌ No medication card found! Check simple-crud-test.png');
  }

  // Verify card content
  const card = page.locator('[data-testid^="medication-card-"]').first();
  await expect(card).toBeVisible();

  const name = card.locator('[data-testid="medication-name"]');
  await expect(name).toHaveText('TestMed');

  console.log('\n✅ SUCCESS: Medication created and displayed!\n');
});
