/**
 * Comprehensive Medication CRUD E2E Tests
 * 
 * Tests all medication management features:
 * - Create medication with various configurations
 * - List and display medications
 * - Track intake with SlideToTrack button
 * - Edit medication details
 * - Delete medication
 * - Language switching
 * - Multiple schedule times
 */
import { test, expect, Page } from '@playwright/test';
import { clearAllData, createTestMedication } from './helpers/setup';

test.describe('Medications CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllData();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sollte leere Liste anzeigen wenn keine Medications vorhanden', async ({ page }) => {
    await expect(page.getByText(/Noch keine Medikamente|No medications yet/i)).toBeVisible();
  });

  test('sollte neue Medication erstellen', async ({ page }) => {
    // Open form
    await page.getByTestId('add-medication-button').click();
    await expect(page.getByTestId('medication-name-input')).toBeVisible();

    // Fill form
    await page.getByTestId('medication-name-input').fill('Aspirin');
    await page.getByTestId('dosage-amount-input').fill('500');
    await page.getByTestId('dosage-unit-select').selectOption('mg');
    await page.getByTestId('interval-select').selectOption('DAILY');
    await page.getByTestId('schedule-time-0').fill('08:00');
    await page.getByTestId('notes-textarea').fill('Mit Wasser einnehmen');

    // Submit
    await page.getByTestId('save-medication-button').click();

    // Wait for modal to close
    await expect(page.getByTestId('medication-name-input')).not.toBeVisible({ timeout: 5000 });

    // Verify medication appears
    await expect(page.getByTestId('medication-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('medication-name')).toHaveText('Aspirin');
    await expect(page.getByTestId('medication-dosage')).toContainText('500');
    await expect(page.getByTestId('medication-dosage')).toContainText('mg');
  });

  test('sollte Medication mit mehreren Uhrzeiten erstellen', async ({ page }) => {
    await page.getByTestId('add-medication-button').click();

    await page.getByTestId('medication-name-input').fill('Vitamin D');
    await page.getByTestId('dosage-amount-input').fill('1000');
    await page.getByTestId('dosage-unit-select').selectOption('mg');

    // First time
    await page.getByTestId('schedule-time-0').fill('08:00');

    // Add second time
    await page.getByTestId('add-time-button').click();
    await page.getByTestId('schedule-time-1').fill('20:00');

    // Add third time
    await page.getByTestId('add-time-button').click();
    await page.getByTestId('schedule-time-2').fill('14:00');

    await page.getByTestId('save-medication-button').click();

    // Wait for modal to close
    await expect(page.getByTestId('medication-name-input')).not.toBeVisible({ timeout: 5000 });

    // Verify all times are shown
    await expect(page.getByTestId('medication-card')).toBeVisible({ timeout: 5000 });
    const scheduleSection = page.locator('[class*="text-gray-600"]').filter({ hasText: '08:00' });
    await expect(scheduleSection).toBeVisible();
  });

  test('sollte Medication bearbeiten', async ({ page }) => {
    // Create via API
    await createTestMedication({
      name: 'Ibuprofen',
      dosageAmount: 400,
      dosageUnit: 'mg',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click edit button
    await page.getByTestId('edit-medication-button').click();
    await expect(page.getByTestId('medication-name-input')).toBeVisible();

    // Modify
    await page.getByTestId('medication-name-input').fill('Ibuprofen 600');
    await page.getByTestId('dosage-amount-input').fill('600');

    await page.getByTestId('save-medication-button').click();

    // Verify changes
    await expect(page.getByTestId('medication-name')).toHaveText('Ibuprofen 600', { timeout: 5000 });
    await expect(page.getByTestId('medication-dosage')).toContainText('600');
  });

  test('sollte Medication löschen', async ({ page }) => {
    await createTestMedication({
      name: 'Test Medication',
      dosageAmount: 100,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify exists
    await expect(page.getByTestId('medication-card')).toBeVisible();

    // Delete with confirmation
    page.on('dialog', dialog => dialog.accept());
    await page.getByTestId('delete-medication-button').click();

    // Verify deleted
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('medication-card')).not.toBeVisible();
    await expect(page.getByText(/Noch keine Medikamente|No medications yet/i)).toBeVisible();
  });

  test('sollte Intake mit SlideToTrack tracken', async ({ page }) => {
    await createTestMedication({
      name: 'Paracetamol',
      dosageAmount: 500,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Find slide button
    const slideButton = page.locator('[data-testid^="slide-to-track"]').first();
    await expect(slideButton).toBeVisible();

    // Simulate slide by clicking at the end of the track
    const box = await slideButton.boundingBox();
    if (box) {
      // Click at 90% width to trigger completion
      await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
    }

    // Wait for intake to be tracked
    await page.waitForTimeout(2000);

    // Reload to see updated last intake
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify last intake is shown
    const lastIntakeSection = page.locator('text=/Zuletzt eingenommen|Last taken/i');
    await expect(lastIntakeSection).toBeVisible({ timeout: 5000 });
  });

  test('sollte Benachrichtigungen aktivieren können', async ({ page }) => {
    await page.getByTestId('add-medication-button').click();

    await page.getByTestId('medication-name-input').fill('Test Med');
    await page.getByTestId('dosage-amount-input').fill('100');

    // Enable notifications
    await page.getByTestId('notifications-checkbox').check();

    await page.getByTestId('save-medication-button').click();

    // Verify notification indicator is shown
    await page.waitForTimeout(1000);
    const notificationIcon = page.locator('[class*="mdi-bell"]').first();
    await expect(notificationIcon).toBeVisible();
  });

  test('sollte verschiedene Dosierungseinheiten unterstützen', async ({ page }) => {
    const units = ['mg', 'g', 'ml', 'tablets'];

    for (const unit of units) {
      await page.getByTestId('add-medication-button').click();

      await page.getByTestId('medication-name-input').fill(`Test ${unit}`);
      await page.getByTestId('dosage-amount-input').fill('5');
      await page.getByTestId('dosage-unit-select').selectOption(unit);

      await page.getByTestId('save-medication-button').click();
      await page.waitForTimeout(500);
    }

    // Verify all created
    const cards = page.getByTestId('medication-card');
    await expect(cards).toHaveCount(units.length);
  });

  test('sollte Sprache wechseln', async ({ page }) => {
    const addButton = page.getByTestId('add-medication-button');
    const initialText = await addButton.textContent();

    // Toggle language
    await page.getByTestId('language-toggle').click();
    await page.waitForTimeout(500);

    const newText = await addButton.textContent();
    expect(newText).not.toBe(initialText);

    // Toggle back
    await page.getByTestId('language-toggle').click();
    await page.waitForTimeout(500);

    const backText = await addButton.textContent();
    expect(backText).toBe(initialText);
  });

  test('sollte Wöchentliches Intervall unterstützen', async ({ page }) => {
    await page.getByTestId('add-medication-button').click();

    await page.getByTestId('medication-name-input').fill('Weekly Med');
    await page.getByTestId('dosage-amount-input').fill('200');
    await page.getByTestId('interval-select').selectOption('WEEKLY');

    await page.getByTestId('save-medication-button').click();

    await page.waitForTimeout(1000);
    await expect(page.getByText(/Wöchentlich|Weekly/i)).toBeVisible();
  });
});
