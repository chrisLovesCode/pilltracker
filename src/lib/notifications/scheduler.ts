/**
 * Notification Scheduler
 * 
 * Handles scheduling and managing medication reminder notifications
 * using Capacitor Local Notifications plugin.
 */
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import type { Medication } from '../../types';

function hashToU32(input: string): number {
  // Deterministic 32-bit hash (djb2). Good enough for stable notification IDs.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function notificationIdFor(medicationId: string, index: number): number {
  // Android notification IDs are 32-bit signed ints. Keep well below Int.MAX_VALUE.
  // Reserve 0 for safety.
  const base = (hashToU32(medicationId) % 2_000_000) + 1; // 1..2,000,000
  return base * 1000 + index; // <= ~2,000,000,999 (< 2,147,483,647)
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('[Notifications] Permission request failed:', error);
    return false;
  }
}

/**
 * Check if notifications are enabled
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('[Notifications] Permission check failed:', error);
    return false;
  }
}

/**
 * Parse schedule times string (e.g., "08:00, 20:00") to time objects
 */
function parseScheduleTimes(scheduleTimes: string | string[]): Array<{ hour: number; minute: number }> {
  const timesArray = Array.isArray(scheduleTimes) ? scheduleTimes : [scheduleTimes];
  
  return timesArray
    .flatMap(timeStr => timeStr.split(','))
    .map(time => time.trim())
    .filter(time => time.length > 0)
    .map(time => {
      const [hour, minute] = time.split(':').map(Number);
      return { hour, minute };
    });
}

/**
 * Calculate interval in days based on intervalType
 */
function getIntervalDays(intervalType: string): number {
  switch (intervalType) {
    case 'DAILY':
      return 1;
    case 'WEEKLY':
      return 7;
    default:
      return 1;
  }
}

/**
 * Schedule notifications for a medication
 */
export async function scheduleMedicationNotifications(medication: Medication): Promise<void> {
  if (!medication.enableNotifications) {
    return;
  }

  try {
    // First, cancel any existing notifications for this medication
    await cancelMedicationNotifications(medication.id);

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.warn('[Notifications] No permission to schedule notifications');
      return;
    }

    const times = parseScheduleTimes(medication.scheduleTimes);
    const scheduleDays = medication.scheduleDays || [1, 2, 3, 4, 5, 6, 0]; // Default: every day
    
    console.log(`[Notifications] Scheduling for medication "${medication.name}"`);
    console.log(`[Notifications] Days: ${scheduleDays.join(', ')} (0=Sun, 1=Mon, ..., 6=Sat)`);
    console.log(`[Notifications] Times: ${times.map(t => `${t.hour}:${t.minute}`).join(', ')}`);
    
    const notifications: any[] = [];
    let notificationIndex = 0;

    // For each time of day
    for (const time of times) {
      // For each selected day of week
      for (const dayOfWeek of scheduleDays) {
        const now = new Date();
        const date = new Date();
        date.setHours(time.hour, time.minute, 0, 0);
        
        // Calculate days until next occurrence of this weekday
        const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
        let daysUntil = dayOfWeek - currentDay;
        
        // If the day is today but time has passed, schedule for next week
        if (daysUntil === 0 && date <= now) {
          daysUntil = 7;
        }
        
        // If the day is in the past this week, schedule for next week
        if (daysUntil < 0) {
          daysUntil += 7;
        }
        
        date.setDate(now.getDate() + daysUntil);

        const notificationId = notificationIdFor(medication.id, notificationIndex);
        notificationIndex++;

        notifications.push({
          id: notificationId,
          title: `💊 ${medication.name}`,
          body: `Zeit für deine Medikation: ${medication.dosageAmount} ${medication.dosageUnit}`,
          schedule: {
            at: date,
            repeats: true,
            every: 'week', // Repeat weekly on the same weekday
            allowWhileIdle: true,
          },
          sound: 'default',
          actionTypeId: 'TRACK_MEDICATION',
          extra: {
            medicationId: medication.id,
            medicationName: medication.name,
            dayOfWeek: dayOfWeek,
          },
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({
        notifications: notifications as any,
      });
      
      console.log(`[Notifications] ✅ Scheduled ${notifications.length} notifications for ${medication.name}`);
      console.log(`[Notifications] First notification at: ${notifications[0].schedule.at.toLocaleString('de-DE')}`);
    } else {
      console.warn(`[Notifications] No notifications scheduled - no days or times selected`);
    }
  } catch (error) {
    console.error('[Notifications] Failed to schedule:', error);
  }
}

/**
 * Cancel all notifications for a medication
 */
export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    const medicationNotifications = pending.notifications.filter(
      n => n.extra?.medicationId === medicationId
    );

    if (medicationNotifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: medicationNotifications,
      });
      console.log(`[Notifications] Cancelled ${medicationNotifications.length} notifications for medication ${medicationId}`);
    }
  } catch (error) {
    console.error('[Notifications] Failed to cancel:', error);
  }
}

/**
 * Reschedule all medications' notifications
 */
export async function rescheduleAllNotifications(medications: Medication[]): Promise<void> {
  console.log(`[Notifications] Rescheduling notifications for ${medications.length} medications`);
  
  for (const medication of medications) {
    if (medication.enableNotifications) {
      await scheduleMedicationNotifications(medication);
    }
  }
}

/**
 * Initialize notification listeners
 * Handles tap on notification to navigate to medication
 */
export function initializeNotificationListeners(onNotificationTap: (medicationId: string) => void): void {
  // Listen for notification actions
  LocalNotifications.addListener('localNotificationActionPerformed', notification => {
    console.log('[Notifications] Notification tapped:', notification);
    
    const medicationId = notification.notification.extra?.medicationId;
    if (medicationId) {
      onNotificationTap(medicationId);
    }
  });

  console.log('[Notifications] Listeners initialized');
}

/**
 * Clean up notification listeners
 */
export async function removeNotificationListeners(): Promise<void> {
  await LocalNotifications.removeAllListeners();
}
