/**
 * Notification Debug Helper
 * 
 * Tool to verify scheduled notifications are working correctly.
 */

import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Get all pending notifications and log them
 */
export async function debugPendingNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    
    console.log('\n═══════════════════════════════════════');
    console.log('📋 PENDING NOTIFICATIONS DEBUG');
    console.log('═══════════════════════════════════════');
    console.log(`Total pending: ${pending.notifications.length}`);
    
    if (pending.notifications.length === 0) {
      console.log('⚠️  No pending notifications scheduled!');
      console.log('═══════════════════════════════════════\n');
      return;
    }
    
    // Group by medication
    const byMedication: { [key: string]: any[] } = {};
    
    for (const notification of pending.notifications) {
      const medId = notification.extra?.medicationId || 'unknown';
      const medName = notification.extra?.medicationName || 'Unknown';
      
      if (!byMedication[medId]) {
        byMedication[medId] = [];
      }
      
      byMedication[medId].push({
        id: notification.id,
        title: notification.title,
        schedule: notification.schedule,
        medName: medName,
      });
    }
    
    // Display grouped by medication
    for (const [medId, notifications] of Object.entries(byMedication)) {
      console.log(`\n💊 ${notifications[0].medName} (${notifications.length} notifications)`);
      console.log('─────────────────────────────────────');
      
      for (const notif of notifications.slice(0, 5)) { // Show first 5
        const schedule = notif.schedule;
        if (schedule?.at) {
          const date = new Date(schedule.at);
          const dayName = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()];
          const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString('de-DE');
          
          console.log(`  ⏰ ${dayName} ${dateStr} ${timeStr}`);
          if (schedule.every) {
            console.log(`     🔁 Repeats: ${schedule.every}`);
          }
        }
      }
      
      if (notifications.length > 5) {
        console.log(`  ... und ${notifications.length - 5} weitere`);
      }
    }
    
    console.log('\n═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('[Debug] Failed to get pending notifications:', error);
  }
}

/**
 * Schedule a test notification to verify the system works
 */
export async function scheduleTestNotification(): Promise<void> {
  try {
    const testDate = new Date();
    testDate.setSeconds(testDate.getSeconds() + 30); // 30 seconds from now
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999999,
          title: '🧪 Test Benachrichtigung',
          body: 'Wenn du das siehst, funktioniert das System!',
          schedule: {
            at: testDate,
            allowWhileIdle: true,
          },
          sound: 'default',
        }
      ]
    });
    
    console.log('✅ Test-Benachrichtigung geplant für:', testDate.toLocaleString('de-DE'));
    console.log('Du solltest in ~30 Sekunden eine Benachrichtigung erhalten.');
    
  } catch (error) {
    console.error('[Debug] Failed to schedule test notification:', error);
  }
}

/**
 * Get notification permissions status
 */
export async function debugNotificationPermissions(): Promise<void> {
  try {
    const permissions = await LocalNotifications.checkPermissions();
    const exactAlarm = await LocalNotifications.checkExactNotificationSetting();
    
    console.log('\n═══════════════════════════════════════');
    console.log('🔔 NOTIFICATION PERMISSIONS');
    console.log('═══════════════════════════════════════');
    console.log(`Display: ${permissions.display}`);
    console.log(`Exact Alarm: ${exactAlarm.exact_alarm}`);
    
    if (permissions.display !== 'granted') {
      console.log('⚠️  Benachrichtigungen nicht erlaubt!');
    }
    
    if (exactAlarm.exact_alarm !== 'granted') {
      console.log('⚠️  Exakte Alarme nicht erlaubt! (Android 12+)');
      console.log('Benachrichtigungen könnten verzögert sein.');
    }
    
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('[Debug] Failed to check permissions:', error);
  }
}
