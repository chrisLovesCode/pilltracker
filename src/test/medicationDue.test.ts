import { describe, expect, it } from 'vitest';
import { getMedicationDueInfo, isMedicationDue } from '../lib/medicationDue';
import type { Medication } from '../types';

function createMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-test',
    name: 'Test Medication',
    dosageAmount: 1,
    dosageUnit: 'mg',
    enableNotifications: true,
    intervalType: 'DAILY',
    scheduleDays: [1, 2, 3, 4, 5, 6, 0],
    scheduleTimes: ['08:00'],
    groupId: null,
    group: null,
    intakes: [],
    lastIntake: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isMedicationDue', () => {
  it('returns true when todays scheduled time is reached and no intake exists', () => {
    const now = new Date(2026, 1, 12, 8, 0, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00'],
    });

    expect(isMedicationDue(medication, now)).toBe(true);
  });

  it('returns false before todays first scheduled time', () => {
    const now = new Date(2026, 1, 12, 7, 59, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00'],
    });

    expect(isMedicationDue(medication, now)).toBe(false);
  });

  it('returns false when intake was tracked after the due slot', () => {
    const now = new Date(2026, 1, 12, 8, 30, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00'],
      intakes: [
        {
          id: 'int-1',
          medicationId: 'med-test',
          takenAt: new Date(2026, 1, 12, 8, 5, 0, 0).toISOString(),
          createdAt: new Date(2026, 1, 12, 8, 5, 0, 0).toISOString(),
        },
      ],
    });

    expect(isMedicationDue(medication, now)).toBe(false);
  });

  it('returns true for a later slot when only an earlier slot was tracked', () => {
    const now = new Date(2026, 1, 12, 12, 1, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00', '12:00'],
      intakes: [
        {
          id: 'int-1',
          medicationId: 'med-test',
          takenAt: new Date(2026, 1, 12, 8, 10, 0, 0).toISOString(),
          createdAt: new Date(2026, 1, 12, 8, 10, 0, 0).toISOString(),
        },
      ],
    });

    expect(isMedicationDue(medication, now)).toBe(true);
  });

  it('supports 24:00 as midnight of the following day', () => {
    const now = new Date(2026, 1, 13, 0, 10, 0, 0);
    const previousDay = (now.getDay() + 6) % 7;
    const medication = createMedication({
      scheduleDays: [previousDay],
      scheduleTimes: ['24:00'],
    });

    expect(isMedicationDue(medication, now)).toBe(true);
  });

  it('returns overdue duration in milliseconds when medication is due', () => {
    const now = new Date(2026, 1, 12, 9, 30, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00'],
    });

    const dueInfo = getMedicationDueInfo(medication, now);
    expect(dueInfo.isDue).toBe(true);
    expect(dueInfo.overdueMs).toBe(90 * 60 * 1000);
  });

  it('returns not-due info and zero overdue duration after tracking', () => {
    const now = new Date(2026, 1, 12, 9, 30, 0, 0);
    const medication = createMedication({
      scheduleDays: [now.getDay()],
      scheduleTimes: ['08:00'],
      intakes: [
        {
          id: 'int-1',
          medicationId: 'med-test',
          takenAt: new Date(2026, 1, 12, 8, 10, 0, 0).toISOString(),
          createdAt: new Date(2026, 1, 12, 8, 10, 0, 0).toISOString(),
        },
      ],
    });

    const dueInfo = getMedicationDueInfo(medication, now);
    expect(dueInfo.isDue).toBe(false);
    expect(dueInfo.overdueMs).toBe(0);
  });
});
