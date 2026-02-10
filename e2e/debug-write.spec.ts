/**
 * Simple Manual Test - Database Write & Read
 * 
 * Zum manuellen Testen im Browser öffnen: http://localhost:5174
 */
import { test, expect } from '@playwright/test';

test.describe('DB Write Test', () => {
  test('sollte Medication speichern und anzeigen', async ({ page }) => {
    // Enable console logs
    page.on('console', msg => console.log('[Browser]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[Browser Error]', err));
    
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    console.log('=== Step 1: App loaded ===');
    
    // Verify app loaded
    await expect(page.getByText('PillTracker')).toBeVisible();
    console.log('✓ Header visible');
    
    // Open form
    await page.getByTestId('add-medication-button').click();
    console.log('✓ Form opened');
    
    await page.waitForTimeout(500);
    await expect(page.getByTestId('medication-name-input')).toBeVisible();
    console.log('✓ Form inputs visible');
    
    // Fill form
    await page.getByTestId('medication-name-input').fill('TestMed');
    await page.getByTestId('dosage-amount-input').fill('100');
    await page.getByTestId('dosage-unit-select').selectOption('mg');
    await page.getByTestId('interval-select').selectOption('DAILY');
    await page.getByTestId('schedule-time-0').fill('08:00');
    console.log('✓ Form filled');
    
    // Save
    await page.getByTestId('save-medication-button').click();
    console.log('=== Step 2: Save button clicked ===');
    
    // Wait for form to close
    await page.waitForTimeout(2000);
    
    // Check if form is closed
    const formVisible = await page.getByTestId('medication-name-input').isVisible().catch(() => false);
    console.log('Form still visible after save?', formVisible);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-after-save.png', fullPage: true });
    console.log('Screenshot saved: debug-after-save.png');
    
    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('=== Page content after save ===');
    console.log(bodyText);
    
    // Check for medication card
    const cards = await page.locator('[data-testid^="medication-card"]').count();
    console.log(`Found ${cards} medication cards`);
    
    // Check for medication name anywhere on page
    const hasTestMed = await page.getByText('TestMed').isVisible().catch(() => false);
    console.log('TestMed visible on page?', hasTestMed);
    
    // Fail with info
    if (cards === 0) {
      throw new Error('No medication cards found after saving. Check screenshot: debug-after-save.png');
    }
  });
});
