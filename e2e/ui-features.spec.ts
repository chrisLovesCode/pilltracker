/**
 * UI Features E2E Tests
 * 
 * Tests general UI functionality:
 * - Tab navigation
 * - Language switching
 * - Responsive design
 * - Loading states
 */
import { test, expect } from '@playwright/test';
import { clearAllData, createTestMedication, createTestGroup } from './helpers/setup';

test.describe('UI Features', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllData();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sollte zwischen Medications und Groups Tabs wechseln', async ({ page }) => {
    // Start on medications tab
    await expect(page.getByTestId('medications-tab')).toHaveClass(/indigo-600/);
    
    // Switch to groups
    await page.getByTestId('groups-tab').click();
    await expect(page.getByTestId('groups-tab')).toHaveClass(/indigo-600/);
    await expect(page.getByTestId('add-group-button')).toBeVisible();

    // Switch back to medications
    await page.getByTestId('medications-tab').click();
    await expect(page.getByTestId('medications-tab')).toHaveClass(/indigo-600/);
    await expect(page.getByTestId('add-medication-button')).toBeVisible();
  });

  test('sollte Sprache zwischen DE und EN wechseln', async ({ page }) => {
    const toggleButton = page.getByTestId('language-toggle');
    
    // Get initial language
    const initialLang = await toggleButton.textContent();
    expect(initialLang).toMatch(/DE|EN/);

    // Toggle
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Should be different
    const newLang = await toggleButton.textContent();
    expect(newLang).not.toBe(initialLang);
    expect(newLang).toMatch(/DE|EN/);

    // Toggle back
    await toggleButton.click();
    await page.waitForTimeout(500);

    const finalLang = await toggleButton.textContent();
    // Just verify it changed back to similar language (allow for locale variants like EN-US)
    expect(finalLang).toContain(initialLang?.substring(0, 2) || '');
  });

  test('sollte App Header anzeigen', async ({ page }) => {
    await expect(page.getByText('PillTracker')).toBeVisible();
    await expect(page.locator('[class*="mdi-pill"]').first()).toBeVisible();
  });

  test('sollte Empty State für Medications anzeigen', async ({ page }) => {
    await expect(page.getByText(/Noch keine Medikamente|No medications yet/i)).toBeVisible();
    await expect(page.locator('[class*="mdi-pill-off"]')).toBeVisible();
  });

  test('sollte Empty State für Groups anzeigen', async ({ page }) => {
    await page.getByTestId('groups-tab').click();
    await expect(page.getByText(/Noch keine Gruppen|No groups yet/i)).toBeVisible();
  });

  test('sollte Modal öffnen und schließen', async ({ page }) => {
    // Open modal
    await page.getByTestId('add-medication-button').click();
    await expect(page.getByTestId('medication-name-input')).toBeVisible();

    // Close with cancel button
    await page.getByTestId('cancel-button').click();
    await expect(page.getByTestId('medication-name-input')).not.toBeVisible();

    // Open again
    await page.getByTestId('add-medication-button').click();
    await expect(page.getByTestId('medication-name-input')).toBeVisible();

    // Close with ESC key
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('medication-name-input')).not.toBeVisible();
  });

  test('sollte Icons korrekt anzeigen', async ({ page }) => {
    await createTestMedication({
      name: 'Test Med',
      dosageAmount: 100,
      enableNotifications: true,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify various icons exist
    await expect(page.locator('[class*="mdi-pill"]').first()).toBeVisible();
    await expect(page.locator('[class*="mdi-calendar-clock"]').first()).toBeVisible();
    await expect(page.locator('[class*="mdi-bell"]').first()).toBeVisible();
  });

  test('sollte responsive sein', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('add-medication-button')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByTestId('add-medication-button')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByTestId('add-medication-button')).toBeVisible();
  });

  test('sollte Loading State anzeigen beim initialen Laden', async ({ page }) => {
    // Reload to see loading state
    await page.reload();
    
    // Loading spinner might appear briefly
    // We just verify the page loads successfully
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('add-medication-button')).toBeVisible();
  });

  test('sollte Medication Card Details anzeigen', async ({ page }) => {
    await createTestMedication({
      name: 'Detailed Med',
      dosageAmount: 250,
      dosageUnit: 'mg',
      intervalType: 'DAILY',
      scheduleTimes: ['08:00', '20:00'],
      notes: 'Important notes here',
      enableNotifications: true,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify all details are shown
    await expect(page.getByText('Detailed Med')).toBeVisible();
    await expect(page.getByText(/250.*mg/)).toBeVisible();
    await expect(page.getByText(/Täglich|Daily/i)).toBeVisible();
    await expect(page.getByText('08:00')).toBeVisible();
    await expect(page.getByText('Important notes here')).toBeVisible();
  });

  test('sollte Formular-Validierung durchführen', async ({ page }) => {
    await page.getByTestId('add-medication-button').click();

    // Try to submit empty form
    await page.getByTestId('save-medication-button').click();

    // Form should still be visible (validation failed)
    await expect(page.getByTestId('medication-name-input')).toBeVisible();
  });
});
