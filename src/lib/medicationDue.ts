import type { Medication } from '../types';

interface ParsedTime {
  hour: number;
  minute: number;
  dayOffset: number;
}

export interface MedicationDueInfo {
  isDue: boolean;
  dueAt: Date | null;
  overdueMs: number;
}

export interface MedicationNextDoseProgress {
  visible: boolean;
  progressRemaining: number;
  previousSlotAt: Date | null;
  nextDueAt: Date | null;
  msUntilNextDue: number;
}

function parseScheduleTimeToken(timeToken: string): ParsedTime | null {
  const token = timeToken.trim();
  if (!token) return null;

  const match = /^(\d{1,2}):([0-5]\d)(?:\s*([AaPp][Mm]))?$/.exec(token);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return { hour, minute, dayOffset: 0 };
  }

  if (hour > 24) return null;
  if (hour === 24 && minute !== 0) return null;
  if (hour === 24) return { hour: 0, minute: 0, dayOffset: 1 };

  return { hour, minute, dayOffset: 0 };
}

function parseScheduleMeta(scheduleDays: number[], scheduleTimes: string[]) {
  const selectedDays = new Set(
    scheduleDays
      .map(day => Number(day))
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  );

  const parsedTimes = scheduleTimes
    .flatMap(time => String(time).split(','))
    .map(parseScheduleTimeToken)
    .filter((parsed): parsed is ParsedTime => parsed !== null);

  return { selectedDays, parsedTimes };
}

function startOfDay(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function getScheduleSlotsAround(
  selectedDays: Set<number>,
  parsedTimes: ParsedTime[],
  now: Date,
  daysBefore: number,
  daysAfter: number
): Date[] {
  if (selectedDays.size === 0 || parsedTimes.length === 0) {
    return [];
  }

  const dayAnchor = startOfDay(now);
  const slots: Date[] = [];

  for (let dayOffset = -daysBefore; dayOffset <= daysAfter; dayOffset++) {
    const scheduleDate = new Date(dayAnchor);
    scheduleDate.setDate(scheduleDate.getDate() + dayOffset);

    if (!selectedDays.has(scheduleDate.getDay())) {
      continue;
    }

    for (const parsedTime of parsedTimes) {
      const candidate = new Date(scheduleDate);
      candidate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
      if (parsedTime.dayOffset > 0) {
        candidate.setDate(candidate.getDate() + parsedTime.dayOffset);
      }
      slots.push(candidate);
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

function getLatestDueSlotTodayAt(
  scheduleDays: number[],
  scheduleTimes: string[],
  now: Date
): Date | null {
  if (scheduleTimes.length === 0) {
    return null;
  }
  const { selectedDays, parsedTimes } = parseScheduleMeta(scheduleDays, scheduleTimes);

  if (parsedTimes.length === 0) {
    return null;
  }

  const todayStart = startOfDay(now);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Include yesterday to support legacy "24:00" entries, which map to today 00:00.
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const scheduleBaseDays = [todayStart, yesterdayStart];
  let latestDueSlot: Date | null = null;

  for (const scheduleDate of scheduleBaseDays) {
    if (!selectedDays.has(scheduleDate.getDay())) {
      continue;
    }

    for (const parsedTime of parsedTimes) {
      const candidate = new Date(scheduleDate);
      candidate.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
      if (parsedTime.dayOffset > 0) {
        candidate.setDate(candidate.getDate() + parsedTime.dayOffset);
      }

      if (candidate < todayStart || candidate >= tomorrowStart) {
        continue;
      }
      if (candidate > now) {
        continue;
      }

      if (!latestDueSlot || candidate > latestDueSlot) {
        latestDueSlot = candidate;
      }
    }
  }

  return latestDueSlot;
}

function getLastIntakeAt(medication: Medication): Date | null {
  const latestIntake = medication.intakes[0] ?? medication.lastIntake ?? null;
  if (!latestIntake?.takenAt) return null;

  const parsed = new Date(latestIntake.takenAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

/**
 * Returns true when a medication has a scheduled slot at/before `now`
 * and has not been tracked since that slot.
 */
export function isMedicationDue(medication: Medication, now: Date = new Date()): boolean {
  return getMedicationDueInfo(medication, now).isDue;
}

export function getMedicationDueInfo(medication: Medication, now: Date = new Date()): MedicationDueInfo {
  const latestDueSlot = getLatestDueSlotTodayAt(
    medication.scheduleDays || [],
    medication.scheduleTimes || [],
    now
  );

  if (!latestDueSlot) {
    return {
      isDue: false,
      dueAt: null,
      overdueMs: 0,
    };
  }

  const lastIntakeAt = getLastIntakeAt(medication);
  if (lastIntakeAt && lastIntakeAt >= latestDueSlot) {
    return {
      isDue: false,
      dueAt: latestDueSlot,
      overdueMs: 0,
    };
  }

  return {
    isDue: true,
    dueAt: latestDueSlot,
    overdueMs: Math.max(0, now.getTime() - latestDueSlot.getTime()),
  };
}

export function getMedicationNextDoseProgress(
  medication: Medication,
  now: Date = new Date()
): MedicationNextDoseProgress {
  const dueInfo = getMedicationDueInfo(medication, now);
  if (dueInfo.isDue) {
    return {
      visible: true,
      progressRemaining: 0,
      previousSlotAt: dueInfo.dueAt,
      nextDueAt: dueInfo.dueAt,
      msUntilNextDue: 0,
    };
  }

  const { selectedDays, parsedTimes } = parseScheduleMeta(
    medication.scheduleDays || [],
    medication.scheduleTimes || []
  );
  if (selectedDays.size === 0 || parsedTimes.length === 0) {
    return {
      visible: false,
      progressRemaining: 0,
      previousSlotAt: null,
      nextDueAt: null,
      msUntilNextDue: 0,
    };
  }

  const slots = getScheduleSlotsAround(selectedDays, parsedTimes, now, 8, 8);
  let previousSlot: Date | null = null;
  let nextSlot: Date | null = null;

  for (const slot of slots) {
    if (slot.getTime() <= now.getTime()) {
      previousSlot = slot;
      continue;
    }
    nextSlot = slot;
    break;
  }

  if (!nextSlot) {
    return {
      visible: false,
      progressRemaining: 0,
      previousSlotAt: previousSlot,
      nextDueAt: null,
      msUntilNextDue: 0,
    };
  }

  const msUntilNextDue = Math.max(0, nextSlot.getTime() - now.getTime());
  if (!previousSlot) {
    return {
      visible: true,
      progressRemaining: 1,
      previousSlotAt: null,
      nextDueAt: nextSlot,
      msUntilNextDue,
    };
  }

  const cycleMs = nextSlot.getTime() - previousSlot.getTime();
  if (cycleMs <= 0) {
    return {
      visible: true,
      progressRemaining: msUntilNextDue > 0 ? 1 : 0,
      previousSlotAt: previousSlot,
      nextDueAt: nextSlot,
      msUntilNextDue,
    };
  }

  const progressRemaining = Math.max(0, Math.min(1, msUntilNextDue / cycleMs));
  return {
    visible: true,
    progressRemaining,
    previousSlotAt: previousSlot,
    nextDueAt: nextSlot,
    msUntilNextDue,
  };
}
