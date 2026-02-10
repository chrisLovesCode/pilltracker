import { test, expect } from '@playwright/test';

test.describe('PillTracker - Timestamp Button Test', () => {
  test.beforeEach(async ({ page }) => {
    // Fange Console-Messages ab
    page.on('console', msg => console.log('🌐 BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('❌ PAGE ERROR:', err.message));
    page.on('requestfailed', req => console.log('🔴 REQUEST FAILED:', req.url(), req.failure()?.errorText));
    
    // Lösche alte Timestamps vor jedem Test
    await fetch('http://localhost:3002/api/timestamps', { method: 'DELETE' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('KERNFUNKTION: Button drücken und Timestamp anzeigen', async ({ page }) => {
    console.log('\n🎯 STARTE KERNTEST: Button drücken und Timestamp prüfen\n');
    
    // Prüfe Button ist da
    const button = page.getByTestId('add-timestamp-button');
    await expect(button).toBeVisible();
    console.log('✅ Button gefunden und sichtbar');
    
    // DRÜCKE DEN VERDAMMTEN BUTTON!
    console.log('🖱️  KLICKE JETZT DEN BUTTON...');
    await button.click();
    
    // Warte dass Timestamp erscheint - OHNE auf API zu warten
    console.log('⏳ Warte auf Timestamp in UI...');
    const timestampItem = page.getByTestId('timestamp-item').first();
    await expect(timestampItem).toBeVisible({ timeout: 10000 });
    
    console.log('✅ TIMESTAMP IST ERSCHIENEN!');
    
    // Prüfe Format
    const timestampValue = page.getByTestId('timestamp-value').first();
    const text = await timestampValue.textContent();
    
    console.log('📅 Timestamp Wert:', text);
    
    // Format prüfen: YYYY-MM-DD HH:MM
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    console.log('✅ Format ist korrekt: YYYY-MM-DD HH:MM');
    
    // Jahr prüfen
    expect(text).toContain('2026');
    console.log('✅ Jahr ist 2026');
    
    console.log('\n🎉 KERNFUNKTION FUNKTIONIERT!\n');
  });

  test('sollte mehrere Timestamps erstellen', async ({ page }) => {
    console.log('\n🎯 Teste mehrere Button-Klicks\n');
    
    const button = page.getByTestId('add-timestamp-button');
    
    // Drücke Button 3 mal
    for (let i = 1; i <= 3; i++) {
      console.log(`🖱️  Klick ${i}/3...`);
      await button.click();
      
      // Warte kurz dass UI aktualisiert
      await page.waitForTimeout(500);
    }
    
    // Prüfe dass Timestamps erscheinen
    console.log('⏳ Prüfe ob Timestamps erschienen sind...');
    const items = page.getByTestId('timestamp-item');
    await expect(items).toHaveCount(3, { timeout: 10000 });
    
    console.log('✅ Alle 3 Timestamps sind da!');
    
    // Zeige alle Werte
    const values = await page.getByTestId('timestamp-value').allTextContents();
    console.log('📅 Timestamps:', values);
  });
});
