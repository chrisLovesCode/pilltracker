# E2E Tests - MediRoutine

## Übersicht

Die E2E Tests sind vollständig lokalisiert und unterstützen mehrere Sprachen.

## Sprache ändern

Um die Test-Sprache zu ändern:

1. Öffne `MediRoutineE2ETest.kt`
2. Ändere die `TEST_LANGUAGE` Konstante:
   ```kotlin
   companion object {
       private const val TEST_LANGUAGE = "de"  // oder "en"
   }
   ```

## Neue Sprache hinzufügen

1. **TestStrings.kt** öffnen
2. Neues String-Objekt erstellen:
   ```kotlin
   object TestStringsFr : TestStrings() {
       override val appTitle = "MediRoutine"
       override val tabMedications = "Médicaments"
       // ... alle anderen Strings übersetzen
   }
   ```

3. In `getTestStrings()` Funktion hinzufügen:
   ```kotlin
   fun getTestStrings(language: String = "de"): TestStrings {
       return when (language.lowercase()) {
           "en" -> TestStringsEn
           "fr" -> TestStringsFr  // Neu
           "de" -> TestStringsDe
           else -> TestStringsDe
       }
   }
   ```

4. Test-Sprache in `MediRoutineE2ETest.kt` setzen:
   ```kotlin
   private const val TEST_LANGUAGE = "fr"
   ```

## Tests ausführen

```bash
# Mit Script (empfohlen)
./run-e2e-tests.sh

# Manuell
cd android
./gradlew connectedDebugAndroidTest
```

## Test-Report

Nach den Tests öffnen:
```
android/app/build/reports/androidTests/connected/debug/index.html
```

## Verfügbare Sprachen

- ✅ Deutsch (`de`) - Standard
- ✅ Englisch (`en`) - Beispiel-Implementation

## Test-Struktur

- `TestStrings.kt` - Zentrale String-Verwaltung
- `MediRoutineE2ETest.kt` - Test-Implementation
- Alle UI-Strings werden über `strings.*` referenziert

## Beispiel

```kotlin
// Statt:
device.findObject(By.text("Hinzufügen"))

// Verwenden wir:
device.findObject(By.text(strings.buttonAdd))
```

Dies ermöglicht einfaches Testen in verschiedenen Sprachen ohne Code-Änderungen.
