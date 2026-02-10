/**
 * TypeScript Type Definitions
 * 
 * Shared types for medications, groups, and intakes throughout the application.
 */

// Type guard for interval types
export type IntervalType = 'DAILY' | 'WEEKLY';

// Days of week (0=Sunday, 1=Monday, ... 6=Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Medication {
  id: string;
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  notes?: string;
  enableNotifications: boolean;
  intervalType: IntervalType; // Legacy - wird ersetzt durch scheduleDays
  scheduleDays: number[]; // Array of days: 0=Sunday, 1=Monday, ..., 6=Saturday
  scheduleTimes: string[]; // Array of time strings
  groupId?: string | null;
  group?: Group | null;
  intakes: Intake[];
  lastIntake?: Intake | null;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  medications: Medication[];
  createdAt: string;
  updatedAt: string;
}

export interface Intake {
  id: string;
  medicationId: string;
  takenAt: string;
  createdAt: string;
}

export interface MedicationFormData {
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  notes?: string;
  enableNotifications: boolean;
  intervalType: IntervalType; // Legacy
  scheduleDays: number[]; // Array of days: 0=Sunday, 1=Monday, ..., 6=Saturday
  scheduleTimes: string[];
  groupId?: string | null;
}

export interface GroupFormData {
  name: string;
  notes?: string;
}
