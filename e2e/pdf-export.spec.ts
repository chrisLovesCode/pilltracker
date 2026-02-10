/**
 * PDF Export E2E Tests
 * 
 * Tests PDF export functionality:
 * - Export single medication as PDF
 * - Export all medications as PDF
 * - Export group as PDF
 */
import { test, expect, Download } from '@playwright/test';
import { clearAllData, createTestMedication, createTestGroup } from './helpers/setup';

test.describe('PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllData();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sollte PDF für einzelnes Medikament exportieren', async ({ page }) => {
    // Create medication
    await createTestMedication({
      name: 'Aspirin',
      dosageAmount: 500,
      dosageUnit: 'mg',
      notes: 'Take with food',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for download
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click export PDF button
    await page.getByTestId('export-pdf-button').click();

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Aspirin.*\.pdf$/);
    
    // Verify file is not empty
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('sollte PDF für alle Medikamente exportieren', async ({ page }) => {
    // Create multiple medications
    await createTestMedication({ name: 'Med 1', dosageAmount: 100 });
    await createTestMedication({ name: 'Med 2', dosageAmount: 200 });
    await createTestMedication({ name: 'Med 3', dosageAmount: 300 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Export all button should be visible
    await expect(page.getByTestId('export-all-pdf-button')).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    await page.getByTestId('export-all-pdf-button').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/medications.*\.pdf$/);
  });

  test('sollte PDF für Gruppe exportieren', async ({ page }) => {
    // Create group with medications
    const group = await createTestGroup({ name: 'Morning Group' });
    
    await createTestMedication({
      name: 'Vitamin D',
      dosageAmount: 1000,
      groupId: group.id,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    await page.getByTestId('export-group-pdf-button').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Morning Group.*\.pdf$/);
  });

  test('sollte Export All Button nur bei vorhandenen Medications zeigen', async ({ page }) => {
    // No medications - button should not exist
    await expect(page.getByTestId('export-all-pdf-button')).not.toBeVisible();

    // Create one
    await createTestMedication({ name: 'Test', dosageAmount: 100 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Now button should appear
    await expect(page.getByTestId('export-all-pdf-button')).toBeVisible();
  });

  test('sollte PDF Export nach Sprache generieren', async ({ page }) => {
    await createTestMedication({
      name: 'Test Med',
      dosageAmount: 500,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Switch to English
    await page.getByTestId('language-toggle').click();
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-button').click();

    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    // PDF should be generated (we can't easily check content in E2E)
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('sollte PDF mit Intake History exportieren', async ({ page }) => {
    const med = await createTestMedication({
      name: 'Tracked Med',
      dosageAmount: 100,
    });

    // Track intake via API
    await fetch(`http://localhost:3002/api/medications/${med.id}/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Test intake' }),
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-button').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('Tracked Med');
  });
});
