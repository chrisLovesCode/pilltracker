/**
 * Notifications Debug Page
 * Test and debug notification scheduling
 */
import { useState } from 'react';
import { Button } from '../components/ui';
import { 
  debugPendingNotifications, 
  scheduleTestNotification,
  debugNotificationPermissions,
  cancelAllPendingNotifications,
} from '../lib/notifications/debug';

export default function NotificationsDebug() {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runDebugAction = async (action: () => Promise<void>, name: string) => {
    setLoading(true);
    setOutput(`⏳ ${name}...\n`);
    
    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    try {
      await action();
      setOutput(logs.join('\n'));
    } catch (error: any) {
      setOutput(`❌ Error: ${error.message}\n${logs.join('\n')}`);
    } finally {
      console.log = originalLog;
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          🔔 Notifications Debug
        </h1>
        <p className="text-text-muted">
          Test und Debug-Tools für Benachrichtigungen
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <Button
          onClick={() => runDebugAction(debugNotificationPermissions, 'Permissions prüfen')}
          disabled={loading}
          className="w-full"
          data-testid="notifications-debug-permissions"
        >
          🔐 Permissions prüfen
        </Button>

        <Button
          onClick={() => runDebugAction(cancelAllPendingNotifications, 'Alle geplanten Benachrichtigungen löschen')}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700"
          data-testid="notifications-debug-cancel-all"
          aria-label="notifications-debug-cancel-all"
        >
          🗑️ Alle geplanten Benachrichtigungen löschen
        </Button>

        <Button
          onClick={() => runDebugAction(debugPendingNotifications, 'Geplante Benachrichtigungen anzeigen')}
          disabled={loading}
          className="w-full"
          data-testid="notifications-debug-pending"
        >
          📋 Geplante Benachrichtigungen
        </Button>

        <Button
          onClick={() => runDebugAction(scheduleTestNotification, 'Test-Benachrichtigung senden')}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
          data-testid="notifications-debug-test"
        >
          🧪 Test-Benachrichtigung (in 30s)
        </Button>
      </div>

      {output && (
        <div
          className="bg-surface-inverse text-green-400 p-4 rounded-control font-mono text-sm whitespace-pre-wrap overflow-x-auto"
          data-testid="notifications-debug-output"
          aria-label="notifications-debug-output"
        >
          {output}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-control">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ So funktionieren die Benachrichtigungen:</h3>
        <ul className="text-blue-700 space-y-2 text-sm">
          <li>
            <strong>1. Permissions:</strong> Android 13+ benötigt explizite Erlaubnis für Benachrichtigungen
          </li>
          <li>
            <strong>2. Exact Alarms:</strong> Android 12+ benötigt SCHEDULE_EXACT_ALARM Permission (bereits in AndroidManifest.xml)
          </li>
          <li>
            <strong>3. Doze Mode:</strong> allowWhileIdle sorgt dafür, dass Benachrichtigungen auch im Doze Mode ankommen
          </li>
          <li>
            <strong>4. Wöchentliche Wiederholung:</strong> every: 'week' wiederholt die Benachrichtigung jede Woche am gleichen Tag/Zeit
          </li>
          <li>
            <strong>5. Test-Benachrichtigung:</strong> Kommt in 30 Sekunden um zu testen, ob das System funktioniert
          </li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-control">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Troubleshooting:</h3>
        <ul className="text-yellow-700 space-y-1 text-sm">
          <li>• Keine Test-Benachrichtigung? → Permissions prüfen</li>
          <li>• Keine geplanten Benachrichtigungen? → Medikament mit aktivierten Notifications anlegen</li>
          <li>• Benachrichtigungen kommen nicht? → Battery Optimization deaktivieren (Android-Einstellungen)</li>
          <li>• Benachrichtigungen verzögert? → Exact Alarms Permission fehlt (Android 12+)</li>
        </ul>
      </div>
    </div>
  );
}
