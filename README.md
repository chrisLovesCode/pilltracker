# PillTracker

Eine moderne Medikamenten-Tracking-App gebaut mit React, Capacitor, Prisma und SQLite.

## 🚀 Features

- ⚛️ **React 18.3** - Moderne React-Entwicklung
- 🎨 **TailwindCSS 3.4** - Utility-First CSS Framework
- 🎭 **Iconify React** - Zugriff auf tausende Icons
- 📱 **Capacitor 6.1** - Native Mobile Apps (iOS/Android)
- 🗄️ **Prisma 5.22** - Type-safe ORM
- 💾 **SQLite** - Lokale Datenbank
- 🐳 **Docker** - Containerisierte Entwicklung und Deployment
- ⚡ **Vite 5.4** - Schneller Build-Tool

## 📋 Voraussetzungen

- Docker & Docker Compose
- Node.js 20+ (für lokale Entwicklung ohne Docker)
- npm oder yarn

## 🛠️ Installation & Setup

### Mit Docker (Empfohlen)

1. **Development-Umgebung starten:**
```bash
docker-compose up dev
```

Die App ist dann verfügbar unter: http://localhost:5173

2. **Production-Build:**
```bash
docker-compose up prod
```

Die App ist dann verfügbar unter: http://localhost:4173

### Lokale Entwicklung (ohne Docker)

1. **Dependencies installieren:**
```bash
npm install
```

2. **Prisma initialisieren:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

3. **Development-Server starten:**
```bash
npm run dev
```

## 📱 Capacitor Setup

### iOS/Android Plattformen hinzufügen:

```bash
# Build erstellen
npm run build

# iOS hinzufügen
npx cap add ios

# Android hinzufügen
npx cap add android

# Assets synchronisieren
npx cap sync
```

### App auf Gerät/Simulator ausführen:

```bash
# iOS
npx cap open ios

# Android
npx cap open android
```

## 🗄️ Datenbank

Das Projekt nutzt SQLite mit Prisma als ORM. Das Schema befindet sich in `prisma/schema.prisma`.

### Prisma Befehle:

```bash
# Prisma Client generieren
npx prisma generate

# Migration erstellen
npx prisma migrate dev --name migration_name

# Datenbank zurücksetzen
npx prisma migrate reset

# Prisma Studio öffnen (GUI für Datenbank)
npx prisma studio
```

## 📂 Projektstruktur

```
pilltracker/
├── prisma/
│   └── schema.prisma          # Datenbank-Schema
├── src/
│   ├── lib/
│   │   └── prisma.ts          # Prisma Client Setup
│   ├── App.tsx                # Haupt-App-Komponente
│   ├── main.tsx               # App-Einstiegspunkt
│   └── index.css              # TailwindCSS Imports
├── Dockerfile                 # Production Docker Image
├── Dockerfile.dev             # Development Docker Image
├── docker-compose.yml         # Docker Compose Config
├── capacitor.config.json      # Capacitor Konfiguration
├── vite.config.ts             # Vite Konfiguration
├── tailwind.config.js         # TailwindCSS Konfiguration
└── package.json               # Dependencies
```

## 🔧 Verfügbare Scripts

```bash
npm run dev          # Development-Server starten
npm run build        # Production-Build erstellen
npm run preview      # Production-Build lokal testen
npm run lint         # Code-Linting
```

## 🌟 Best Practices 2025/2026

- **Prisma**: Nutzt die neueste Version mit optimiertem SQLite-Support
- **React**: Funktionale Komponenten mit Hooks
- **TypeScript**: Vollständige Type-Safety
- **Capacitor**: Neueste Version für beste Mobile-Performance
- **Docker**: Multi-Stage Builds für optimierte Images
- **TailwindCSS**: Utility-First Approach für schnelle UI-Entwicklung

## 📝 Nächste Schritte

1. Passe das Datenbank-Schema in `prisma/schema.prisma` an deine Bedürfnisse an
2. Entwickle die App-Komponenten in `src/`
3. Füge native Funktionen über Capacitor Plugins hinzu
4. Baue und teste die App auf iOS/Android

## 📄 Lizenz

MIT
