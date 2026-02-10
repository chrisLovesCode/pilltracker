/**
 * Debug Test - Step by step medication creation
 */
import { test, expect } from '@playwright/test';
import { clearAllData } from './helpers/setup';

test.describe('Debug - Medication Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('🔴 PAGE ERROR:', err.message);
    });

    await clearAllData();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Debug: sollte Medication Formular öffnen und Felder ausfüllen', async ({ page }) => {
    // Step 1: Click add button
    const addButton = page.getByTestId('add-medication-button');
    await expect(addButton).toBeVisible();
    await addButton.click();
    console.log('✓ Add button clicked');

    // Step 2: Wait for form to appear
    const nameInput = page.getByTestId('medication-name-input');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Form appeared');

    // Step 3: Fill name
    await nameInput.fill('Test Medication');
    console.log('✓ Name filled');

    // Step 4: Fill dosage
    const dosageInput = page.getByTestId('dosage-amount-input');
    await dosageInput.fill('500');
    console.log('✓ Dosage filled');

    // Step 5: Select unit
    const unitSelect = page.getByTestId('dosage-unit-select');
    await unitSelect.selectOption('mg');
    console.log('✓ Unit selected');

    // Step 6: Fill schedule time
    const timeInput = page.getByTestId('schedule-time-0');
    await timeInput.fill('08:00');
    console.log('✓ Schedule time filled');

    // Step 7: Check if save button is enabled
    const saveButton = page.getByTestId('save-medication-button');
    await expect(saveButton).toBeVisible();
    console.log('✓ Save button visible');

    // Step 8: Click save
    await saveButton.click();
    console.log('✓ Save button clicked');

    // Step 9: Wait a bit
    await page.waitForTimeout(2000);

    // Step 10: Check if modal closed
    const isModalGone = await nameInput.isVisible().catch(() => false);
    console.log(`✓ Modal closed: ${!isModalGone}`);

    // Step 11: Take screenshot
    await page.screenshot({ path: '/tmp/after-save.png', fullPage: true });
    console.log('✓ Screenshot saved to /tmp/after-save.png');

    // Step 12: Check if we're back on medications tab
    const medsTab = page.getByTestId('medications-tab');
    await expect(medsTab).toBeVisible();
    console.log('✓ Back on medications tab');

    // Step 13: Wait longer for card to appear
    await page.waitForTimeout(3000);

    // Step 14: Check for medication card
    const card = page.getByTestId('medication-card');
    const hasCard = await card.count();
    console.log(`✓ Medication cards found: ${hasCard}`);

    if (hasCard === 0) {
      console.log('❌ No medication card found!');
      // Check if we have the empty state instead
      const emptyText = await page.getByText(/Noch keine Medikamente/i).isVisible();
      console.log(`Empty state visible: ${emptyText}`);
      
      // Let's see what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('Body content:', bodyText?.substring(0, 500));
    }

    await expect(card).toBeVisible({ timeout: 10000 });
  });
});
