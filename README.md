# PillTracker

Offline-first Medikamenten-Tracking-App (React + Capacitor + native SQLite).

## Stack

- React + Vite + TypeScript
- Capacitor (Android/iOS WebView Shell)
- Native SQLite via `@capacitor-community/sqlite`
- Local Notifications via `@capacitor/local-notifications`

## Entwicklung (Web)

```bash
npm install
npm run dev
```

Hinweis: Die SQLite DB ist nur auf nativen Plattformen verfuegbar (Android/iOS).

## Android (Build/Deploy)

```bash
./run-android.sh
```

## Android E2E (Android Studio / Console) + Logs

Ziel: App bedienen ohne manuelles rumklicken und dabei SQL/Crash-Fehler sofort sehen.

1. Emulator starten (am einfachsten ueber Android Studio: Device Manager).
2. App deployen: `./run-android.sh`
3. E2E laufen lassen: `./run-e2e-tests.sh`
4. Live-Logs: `./watch-logs.sh`
5. Report (HTML): `android/app/build/reports/androidTests/connected/debug/index.html`

Die Instrumentation-Tests sind hier:
`android/app/src/androidTest/java/com/pilltracker/app/PillTrackerE2ETest.kt`
