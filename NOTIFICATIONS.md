# 🔔 Benachrichtigungen - Implementierung & Best Practices

## ✅ Was wurde implementiert

### 1. **Capacitor Local Notifications Plugin**
- Offizielles Plugin: `@capacitor/local-notifications@8.0.0`
- Best Practice für Capacitor-Apps
- Läuft nativ auf Android & iOS

### 2. **Wochentag-basierte Planung**
```typescript
// Für jede Kombination aus Wochentag + Uhrzeit wird eine Benachrichtigung erstellt
scheduleDays: [1, 2, 3, 4, 5, 6, 0]  // Mo-So
scheduleTimes: ['08:00', '20:00']     // 2 Uhrzeiten

// = 14 Benachrichtigungen (7 Tage × 2 Zeiten)
```

### 3. **Wöchentliche Wiederholung**
```typescript
schedule: {
  at: date,                    // Nächster Termin (z.B. "Montag 08:00")
  every: 'week',               // Wiederholt sich jede Woche
  allowWhileIdle: true,        // Funktioniert auch im Doze Mode
}
```

## 🎯 Wie es funktioniert

### Schritt 1: Berechnung des nächsten Termins
```typescript
const now = new Date();
const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
let daysUntil = dayOfWeek - currentDay;

// Wenn heute aber Zeit vorbei → nächste Woche
if (daysUntil === 0 && date <= now) {
  daysUntil = 7;
}

// Wenn Tag in Vergangenheit → nächste Woche
if (daysUntil < 0) {
  daysUntil += 7;
}
```

### Schritt 2: Notification-ID generieren
```typescript
// Eindeutige ID pro Notification (wichtig für Canceling)
const notificationId = parseInt(medication.id.replace(/\D/g, '').slice(0, 8)) * 1000 + notificationIndex;
```

### Schritt 3: Scheduling mit `every: 'week'`
```typescript
await LocalNotifications.schedule({
  notifications: [{
    id: notificationId,
    title: `💊 ${medication.name}`,
    body: `Zeit für deine Medikation: ${dosageAmount} ${dosageUnit}`,
    schedule: {
      at: date,           // Z.B. "Montag, 10:00"
      every: 'week',      // Wiederholt sich jede Woche
      allowWhileIdle: true
    }
  }]
});
```

## 📱 Android-Spezifika

### Permissions (Android 13+)
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

### Doze Mode
- **Problem**: Android versetzt Apps in "Doze Mode" um Akku zu sparen
- **Lösung**: `allowWhileIdle: true` (max 1 Notification alle 9 Minuten)
- **Best Practice**: Für Medikamenten-Erinnerungen ist das OK

### Battery Optimization
- User kann Battery Optimization pro App deaktivieren
- Einstellungen → Apps → PillTracker → Battery → Unrestricted

## 🧪 Debug-Tools

### Notifications Debug Page
Erreichbar über Footer: **🔔 Notifications**

**Features:**
- ✅ Permissions prüfen
- ✅ Geplante Benachrichtigungen anzeigen
- ✅ Test-Benachrichtigung (in 30s)
- ✅ Detailliertes Logging

### Console Output
```typescript
[Notifications] Scheduling for medication "Aspirin"
[Notifications] Days: 1, 2, 3, 4, 5, 6, 0 (0=Sun, 1=Mon, ..., 6=Sat)
[Notifications] Times: 8:0, 20:0
[Notifications] ✅ Scheduled 14 notifications for Aspirin
[Notifications] First notification at: Mo., 10.02.2026, 08:00:00
```

## ⚡ Best Practices die wir nutzen

### 1. Cancel before Schedule
```typescript
// Immer erst alte Notifications löschen
await cancelMedicationNotifications(medication.id);
// Dann neu planen
await LocalNotifications.schedule({ ... });
```

### 2. Eindeutige IDs
```typescript
// Pro Medikament + Time-Slot eine eindeutige ID
const notificationId = medicationId * 1000 + index;
```

### 3. Extra-Data für Tracking
```typescript
extra: {
  medicationId: medication.id,
  medicationName: medication.name,
  dayOfWeek: dayOfWeek,
}
```

### 4. Notification Listener
```typescript
LocalNotifications.addListener('localNotificationActionPerformed', notification => {
  const medicationId = notification.notification.extra?.medicationId;
  // → Navigate to medication or track intake
});
```

## 🔍 Troubleshooting

### Problem: Keine Benachrichtigungen
**Lösung:**
1. Permissions prüfen (Debug Page)
2. Test-Benachrichtigung senden (sollte in 30s kommen)
3. Battery Optimization deaktivieren

### Problem: Benachrichtigungen verzögert
**Lösung:**
- Android 12+: Exact Alarm Permission fehlt
- Einstellungen → Apps → Special Access → Alarms & Reminders → PillTracker → Allow

### Problem: App im Private Space (Android 15)
**Lösung:**
- Private Space sperrt Notifications bis entsperrt
- User informieren, App nicht im Private Space zu installieren

## 📊 Vergleich: Alternative Ansätze

### Ansatz 1: `every: 'day'` (alte Implementierung)
```typescript
schedule: { at: date, every: 'day' }
```
❌ Funktioniert nur für täglich
❌ Keine Wochentag-Auswahl möglich

### Ansatz 2: `on: { weekday, hour, minute }` 
```typescript
schedule: { on: { weekday: 2, hour: 8, minute: 0 } }
```
❌ Komplexer
❌ Keine klare Kontrolle über erste Ausführung

### Ansatz 3: Multiple notifications in advance (20+ Wochen)
```typescript
// 20 Benachrichtigungen im Voraus planen
for (let week = 0; week < 20; week++) {
  const date = addWeeks(nextDate, week);
  notifications.push({ at: date });
}
```
✅ Sehr zuverlässig
❌ Viele Notifications (Android Limit: ~500)
❌ Muss regelmäßig neu geplant werden

### ✅ Ansatz 4: `every: 'week'` (unsere Implementierung)
```typescript
schedule: { at: nextOccurrence, every: 'week' }
```
✅ Offiziell unterstützt
✅ Skaliert gut (7 Tage × N Zeiten = wenige Notifications)
✅ Läuft dauerhaft
✅ Clean Code

## 🚀 Empfehlungen für Production

### App-Start Hook
```typescript
useEffect(() => {
  // Bei jedem App-Start Notifications neu planen
  rescheduleAllNotifications(medications);
}, []);
```

### Notification Channel (Android 8+)
```typescript
await LocalNotifications.createChannel({
  id: 'medication-reminders',
  name: 'Medikamenten-Erinnerungen',
  importance: 4, // High
  sound: 'default',
  vibration: true,
});
```

### User Onboarding
1. Permissions erklären BEVOR man fragt
2. Test-Notification zeigen
3. Settings-Seite verlinken

## 📚 Referenzen

- [Capacitor Local Notifications Docs](https://capacitorjs.com/docs/apis/local-notifications)
- [Android Doze Mode](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Android Exact Alarms](https://developer.android.com/about/versions/12/behavior-changes-12#exact-alarm-permission)
