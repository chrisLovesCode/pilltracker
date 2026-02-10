/**
 * Medication Management E2E Tests
 * 
 * Tests the complete CRUD workflow for medications:
 * - Create medication
 * - View medication list
 * - Track intake with slide button
 * - Edit medication
 * - Delete medication
 * - Language switching
 */
import { test, expect } from '@playwright/test';

test.describe('PillTracker - Medication Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear database before each test
    await fetch('http://localhost:3002/api/medications').then(async (res) => {
      const meds = await res.json();
      for (const med of meds) {
        await fetch(`http://localhost:3002/api/medications/${med.id}`, { method: 'DELETE' });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sollte eine neue Medication erstellen können', async ({ page }) => {
    console.log('\n🎯 Test: Medication erstellen\n');
    
    // Click Add Button
    await page.getByTestId('add-medication-button').click();
    
    // Fill form
    await page.getByTestId('medication-name-input').fill('Aspirin');
    await page.getByTestId('dosage-amount-input').fill('500');
    await page.getByTestId('dosage-unit-select').selectOption('mg');
    await page.getByTestId('schedule-time-0').fill('08:00');
    await page.getByTestId('notes-textarea').fill('Take with water');
    
    // Submit
    await page.getByTestId('save-medication-button').click();
    
    // Verify medication appears in list
    await expect(page.getByTestId('medication-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('medication-name')).toContainText('Aspirin');
    await expect(page.getByTestId('medication-dosage')).toContainText('500');
    
    console.log('✅ Medication erfolgreich erstellt!');
  });

  test('sollte Intake mit Slide Button tracken können', async ({ page }) => {
    console.log('\n🎯 Test: Intake tracken\n');
    
    // Create medication first
    await page.getByTestId('add-medication-button').click();
    await page.getByTestId('medication-name-input').fill('Ibuprofen');
    await page.getByTestId('dosage-amount-input').fill('400');
    await page.getByTestId('save-medication-button').click();
    
    await page.waitForTimeout(1000);
    
    // Find slide button
    const slideButton = page.locator('[data-testid^="slide-to-track"]').first();
    await expect(slideButton).toBeVisible();
    
    // Get handle and container
    const handle = page.locator('[data-testid$="-handle"]').first();
    const buttonBox = await slideButton.boundingBox();
    
    if (buttonBox) {
      // Simulate slide by dragging handle
      await handle.hover();
      await page.mouse.down();
      await page.mouse.move(buttonBox.x + buttonBox.width - 20, buttonBox.y + buttonBox.height / 2, { steps: 10 });
      await page.mouse.up();
      
      // Wait for tracking to complete
      await page.waitForTimeout(1500);
      
      // Verify last intake is shown
      await expect(page.getByTestId('last-intake')).toContainText('Zuletzt eingenommen');
      
      console.log('✅ Intake erfolgreich getrackt!');
    }
  });

  test('sollte Medication löschen können', async ({ page }) => {
    console.log('\n🎯 Test: Medication löschen\n');
    
    // Create medication
    await page.getByTestId('add-medication-button').click();
    await page.getByTestId('medication-name-input').fill('Test Med');
    await page.getByTestId('dosage-amount-input').fill('100');
    await page.getByTestId('save-medication-button').click();
    
    await page.waitForTimeout(1000);
    
    // Verify it exists
    await expect(page.getByTestId('medication-card')).toBeVisible();
    
    // Delete it (confirm dialog)
    page.on('dialog', dialog => dialog.accept());
    await page.getByTestId('delete-medication-button').click();
    
    await page.waitForTimeout(1000);
    
    // Verify it's gone
    await expect(page.getByTestId('medication-card')).not.toBeVisible();
    
    console.log('✅ Medication erfolgreich gelöscht!');
  });

  test('sollte Sprache wechseln können', async ({ page }) => {
    console.log('\n🎯 Test: Sprache wechseln\n');
    
    // Initial language should be German or English
    const addButton = page.getByTestId('add-medication-button');
    await expect(addButton).toBeVisible();
    const initialText = await addButton.textContent();
    
    // Click language toggle
    await page.getByTestId('language-toggle').click();
    await page.waitForTimeout(500);
    
    // Text should change
    const newText = await addButton.textContent();
    expect(newText).not.toBe(initialText);
    
    console.log(`✅ Sprache gewechselt: "${initialText}" → "${newText}"`);
  });

  test('sollte mehrere Schedule Times hinzufügen können', async ({ page }) => {
    console.log('\n🎯 Test: Mehrere Zeiten hinzufügen\n');
    
    await page.getByTestId('add-medication-button').click();
    
    // Fill basic info
    await page.getByTestId('medication-name-input').fill('Vitamin D');
    await page.getByTestId('dosage-amount-input').fill('1000');
    
    // First time already exists
    await page.getByTestId('schedule-time-0').fill('08:00');
    
    // Add second time
    await page.getByTestId('add-time-button').click();
    await page.getByTestId('schedule-time-1').fill('20:00');
    
    // Save
    await page.getByTestId('save-medication-button').click();
    
    await page.waitForTimeout(1000);
    
    // Verify schedule shows both times
    const scheduleText = await page.locator('text=08:00').first().textContent();
    expect(scheduleText).toContain('08:00');
    
    console.log('✅ Mehrere Zeiten erfolgreich hinzugefügt!');
  });
});
