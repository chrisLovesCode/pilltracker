# PillTracker E2E Tests

Vollständige End-to-End Tests mit **Espresso + UIAutomator** für Android.

## ✅ Was wurde implementiert

### UI-Fixes:
1. **"Alle tracken" Slider bei Gruppen** - Jetzt ein vollwertiger Slider wie bei einzelnen Medikamenten
2. **Dropdown zum Hinzufügen von Medis zu Gruppen** - Steht jetzt direkt unter dem Gruppennamen

### E2E Tests:
12 automatisierte Tests die alle Funktionen testen:

1. **App Start** - Verifiziert dass App lädt
2. **DB Initialisierung** - Prüft Datenbank-Setup
3. **Medikament erstellen** - Formular ausfüllen und speichern
4. **Gruppe erstellen** - Gruppe mit Beschreibung anlegen
5. **Medi zu Gruppe hinzufügen** - Dropdown-Funktionalität
6. **Einzelnes Medi tracken** - Slide-to-Track Geste
7. **Alle in Gruppe tracken** - Gruppen-Slider Funktion
8. **Medikament bearbeiten** - Änderungen speichern
9. **Medikament löschen** - Mit Bestätigungs-Dialog
10. **PDF Export** - Generierung testen
11. **Sprache wechseln** - DE ↔ EN Toggle
12. **Notifications aktivieren** - Switch im Formular

## 🚀 Tests ausführen

### Option 1: Mit Script
```bash
./run-e2e-tests.sh
```

### Option 2: Manuell
```bash
# 1. Build
npm run build

# 2. Sync
npx cap sync android

# 3. Tests ausführen
cd android
./gradlew connectedAndroidTest
```

## 📊 Test-Ergebnisse

Nach dem Durchlauf findest du einen HTML-Report:
```
android/app/build/reports/androidTests/connected/index.html
```

Öffne ihn im Browser:
```bash
open android/app/build/reports/androidTests/connected/index.html
```

## 📱 Voraussetzungen

- ✅ Android Emulator läuft (z.B. Medium_Phone_API_36.1)
- ✅ Java 21 konfiguriert
- ✅ App wurde bereits mit `./run-android.sh` deployed

## 🔍 Test-Details

Die Tests verwenden:
- **UIAutomator** - Für UI-Interaktionen (swipe, click, text input)
- **AndroidJUnit4** - Test-Framework
- **Espresso** - Android UI Testing

### Test-Strategie:
- Jeder Test ist unabhängig lauffähig
- `testFullE2EFlow()` führt alle wichtigen Tests nacheinander aus
- Wartezeiten (`Thread.sleep`) für Animationen und Datenbank-Operationen

## 🐛 Debugging

### Tests schlagen fehl?

1. **Emulator prüfen:**
   ```bash
   adb devices
   ```

2. **App neu installieren:**
   ```bash
   ./run-android.sh
   ```

3. **Tests einzeln ausführen:**
   ```bash
   cd android
   ./gradlew connectedAndroidTest --tests "com.pilltracker.app.PillTrackerE2ETest.test03_createMedication"
   ```

4. **Logs anschauen:**
   ```bash
   cd android && ./gradlew --no-daemon -q app:logcatDebug
   ```

## 📝 Eigene Tests hinzufügen

Test-Datei: `android/app/src/androidTest/java/com/pilltracker/app/PillTrackerE2ETest.kt`

Beispiel:
```kotlin
@Test
fun testMyFeature() {
    // UI Element finden
    val button = device.wait(
        Until.findObject(By.text("Button Text")),
        3000
    )
    
    // Klicken
    button?.click()
    
    // Verifizieren
    val result = device.wait(
        Until.findObject(By.text("Erfolgsmeldung")),
        3000
    )
    assert(result != null) { "Feature funktioniert nicht" }
}
```

## 🎯 Best Practices

1. **Wartezeiten**: Nutze `device.wait()` statt `Thread.sleep()` wo möglich
2. **Selektoren**: Verwende `By.desc()` für accessibility IDs, `By.text()` für sichtbaren Text
3. **Assertions**: Immer mit aussagekräftiger Fehlermeldung
4. **Cleanup**: Tests sollten keine Daten hinterlassen (oder vorhandene nutzen)

## 📚 Weitere Infos

- [UIAutomator Docs](https://developer.android.com/training/testing/other-components/ui-automator)
- [Espresso Docs](https://developer.android.com/training/testing/espresso)
