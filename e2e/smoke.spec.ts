/**
 * Simple smoke test to verify basics work
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('sollte App laden und Header anzeigen', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('PillTracker')).toBeVisible();
    await expect(page.getByTestId('add-medication-button')).toBeVisible();
  });

  test('sollte Medication Form öffnen und schließen', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('add-medication-button').click();
    await expect(page.getByTestId('medication-name-input')).toBeVisible();
    
    await page.getByTestId('cancel-button').click();
    await expect(page.getByTestId('medication-name-input')).not.toBeVisible();
  });

  test('sollte Group Button anzeigen', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('add-group-button')).toBeVisible();
  });
});
