/**
 * Groups CRUD E2E Tests
 * 
 * Tests all group management features:
 * - Create group
 * - List groups
 * - Add medications to group
 * - Track all medications in group
 * - Edit group
 * - Delete group
 */
import { test, expect } from '@playwright/test';
import { clearAllData, createTestMedication, createTestGroup } from './helpers/setup';

test.describe('Groups CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllData();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('sollte zur Groups Tab wechseln', async ({ page }) => {
    await page.getByTestId('groups-tab').click();
    await expect(page.getByText(/Noch keine Gruppen|No groups yet/i)).toBeVisible();
  });

  test('sollte neue Gruppe erstellen', async ({ page }) => {
    await page.getByTestId('groups-tab').click();

    // Open form
    await page.getByTestId('add-group-button').click();
    await expect(page.getByTestId('group-name-input')).toBeVisible();

    // Fill form
    await page.getByTestId('group-name-input').fill('Morgen Medikamente');
    await page.getByTestId('group-interval-select').selectOption('DAILY');
    await page.getByTestId('group-notes-textarea').fill('Alle morgens nehmen');

    await page.getByTestId('save-group-button').click();

    // Wait for modal to close
    await expect(page.getByTestId('group-name-input')).not.toBeVisible({ timeout: 5000 });

    // Verify group appears
    await expect(page.getByTestId('group-card')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('group-name')).toHaveText('Morgen Medikamente');
  });

  test('sollte Gruppe mit Schedule Override erstellen', async ({ page }) => {
    await page.getByTestId('groups-tab').click();
    await page.getByTestId('add-group-button').click();

    await page.getByTestId('group-name-input').fill('Abend Gruppe');

    // Add schedule times
    await page.getByTestId('group-schedule-time-0').fill('20:00');
    await page.getByTestId('add-group-time-button').click();
    await page.getByTestId('group-schedule-time-1').fill('21:00');

    await page.getByTestId('save-group-button').click();

    // Wait for modal to close
    await expect(page.getByTestId('group-name-input')).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId('group-card')).toBeVisible({ timeout: 5000 });
  });

  test('sollte Gruppe bearbeiten', async ({ page }) => {
    // Create via API
    await createTestGroup({
      name: 'Test Group',
      notes: 'Original notes',
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    // Edit
    await page.getByTestId('edit-group-button').click();
    await expect(page.getByTestId('group-name-input')).toBeVisible();

    await page.getByTestId('group-name-input').fill('Updated Group');
    await page.getByTestId('group-notes-textarea').fill('Updated notes');

    await page.getByTestId('save-group-button').click();

    // Verify changes
    await expect(page.getByTestId('group-name')).toHaveText('Updated Group', { timeout: 5000 });
  });

  test('sollte Gruppe löschen', async ({ page }) => {
    await createTestGroup({ name: 'Delete Me' });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    await expect(page.getByTestId('group-card')).toBeVisible();

    // Delete with confirmation
    page.on('dialog', dialog => dialog.accept());
    await page.getByTestId('delete-group-button').click();

    await page.waitForTimeout(1000);
    await expect(page.getByTestId('group-card')).not.toBeVisible();
  });

  test('sollte Track All für Gruppe funktionieren', async ({ page }) => {
    // Create group with medications
    const group = await createTestGroup({ name: 'Morning Meds' });
    
    await createTestMedication({
      name: 'Med 1',
      dosageAmount: 100,
      groupId: group.id,
    });
    
    await createTestMedication({
      name: 'Med 2',
      dosageAmount: 200,
      groupId: group.id,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    // Find track-all button
    const trackAllButton = page.locator('[data-testid^="track-all-slide"]').first();
    await expect(trackAllButton).toBeVisible();

    // Click at end to trigger
    const box = await trackAllButton.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
    }

    // Wait for tracking
    await page.waitForTimeout(2000);

    // Reload and verify both medications have intakes
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    // Should show last intake times for medications in group
    const lastIntakeTexts = page.locator('text=/Zuletzt|Last taken/i');
    await expect(lastIntakeTexts.first()).toBeVisible({ timeout: 5000 });
  });

  test('sollte Gruppe mit Medications Anzahl anzeigen', async ({ page }) => {
    const group = await createTestGroup({ name: 'Test Group' });
    
    await createTestMedication({
      name: 'Med 1',
      dosageAmount: 100,
      groupId: group.id,
    });
    
    await createTestMedication({
      name: 'Med 2',
      dosageAmount: 200,
      groupId: group.id,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    // Verify medication count is shown
    const countText = page.locator('text=/2.*Medikamente|2.*medications/i');
    await expect(countText).toBeVisible({ timeout: 5000 });
  });

  test('sollte einzelne Medications in Gruppe anzeigen', async ({ page }) => {
    const group = await createTestGroup({ name: 'Vitamins' });
    
    await createTestMedication({
      name: 'Vitamin C',
      dosageAmount: 1000,
      dosageUnit: 'mg',
      groupId: group.id,
    });
    
    await createTestMedication({
      name: 'Vitamin D',
      dosageAmount: 2000,
      dosageUnit: 'mg',
      groupId: group.id,
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('groups-tab').click();

    // Verify both medications are listed in the group card
    await expect(page.getByText('Vitamin C')).toBeVisible();
    await expect(page.getByText('Vitamin D')).toBeVisible();
  });

  test('sollte Benachrichtigungen für Gruppe aktivieren', async ({ page }) => {
    await page.getByTestId('groups-tab').click();
    await page.getByTestId('add-group-button').click();

    await page.getByTestId('group-name-input').fill('Notification Group');
    await page.getByTestId('group-notifications-checkbox').check();

    await page.getByTestId('save-group-button').click();

    await page.waitForTimeout(1000);
    
    // Verify notification icon is visible
    const bellIcon = page.locator('[class*="mdi-bell"]').first();
    await expect(bellIcon).toBeVisible();
  });
});
