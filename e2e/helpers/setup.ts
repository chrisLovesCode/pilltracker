/**
 * E2E Test Helpers
 * 
 * Utility functions for setting up and cleaning up test data
 * Updated for offline-first architecture (no API server needed)
 */

/**
 * Clear all data by reloading the page (in-memory DB resets)
 */
export async function clearAllData() {
  // With in-memory SQLite in web dev mode, data clears on page reload
  // For E2E tests, we rely on IndexedDB or localStorage if implemented
  // For now, each test should start with a fresh page load
}

/**
 * Clear medications (deprecated - use clearAllData)
 */
export async function clearMedications() {
  // No-op in offline mode - data clears on page reload
}

/**
 * Clear groups (deprecated - use clearAllData)
 */
export async function clearGroups() {
  // No-op in offline mode - data clears on page reload
}

/**
 * Create a test medication via UI
 */
export async function createTestMedication(page: any, data: {
  name: string;
  dosageAmount: number;
  dosageUnit?: string;
  scheduleTimes?: string[];
  notes?: string;
  intervalType?: string;
  enableNotifications?: boolean;
  groupId?: string;
}) {
  // Open medication form
  await page.getByTestId('add-medication-button').click();
  await page.waitForTimeout(300);
  
  // Fill form
  await page.getByTestId('medication-name-input').fill(data.name);
  await page.getByTestId('dosage-amount-input').fill(data.dosageAmount.toString());
  
  if (data.dosageUnit) {
    await page.getByTestId('dosage-unit-input').fill(data.dosageUnit);
  }
  
  if (data.notes) {
    await page.getByTestId('notes-input').fill(data.notes);
  }
  
  // Submit form
  await page.getByTestId('save-medication-button').click();
  await page.waitForTimeout(500);
}

/**
 * Create a test group via UI
 */
export async function createTestGroup(page: any, data: {
  name: string;
  notes?: string;
  intervalType?: string;
  enableNotifications?: boolean;
}) {
  // Switch to groups tab
  await page.getByTestId('groups-tab').click();
  await page.waitForTimeout(300);
  
  // Open group form
  await page.getByTestId('add-group-button').click();
  await page.waitForTimeout(300);
  
  // Fill form
  await page.getByTestId('group-name-input').fill(data.name);
  
  if (data.notes) {
    await page.getByTestId('group-notes-input').fill(data.notes);
  }
  
  // Submit form
  await page.getByTestId('save-group-button').click();
  await page.waitForTimeout(500);
}

/**
 * Wait for element with custom retry logic
 */
export async function waitForElement(page: any, selector: string, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        return element;
      }
    } catch (err) {
      // Continue waiting
    }
    await page.waitForTimeout(100);
  }
  
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}
