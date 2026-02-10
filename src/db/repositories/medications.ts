/**
 * Medication Repository (Direct SQL)
 */

import { getDatabase } from '../connection';
import type { Medication, Intake } from '../../types';

/**
 * Get all medications with relations
 */
export async function getAllMedications(): Promise<Medication[]> {
  const db = getDatabase();
  
  const result = await db.query(`
    SELECT 
      m.*,
      g.id          AS group_id,
      g.name        AS group_name,
      g.description AS group_description,
      g.createdAt   AS group_createdAt,
      g.updatedAt   AS group_updatedAt
    FROM medications m
    LEFT JOIN groups g ON m.groupId = g.id
    ORDER BY m.createdAt DESC
  `);

  if (!result.values || result.values.length === 0) {
    return [];
  }

  // Get intakes for each medication
  const medications: Medication[] = [];
  for (const row of result.values) {
    const intakesResult = await db.query(`
      SELECT * 
      FROM intakes 
      WHERE medicationId = ? 
      ORDER BY takenAt DESC
    `, [row.id]);

    const intakes: Intake[] = (intakesResult.values || []).map((i: any) => ({
      id: i.id,
      medicationId: i.medicationId,
      takenAt: i.takenAt,
      createdAt: i.createdAt,
    }));

    medications.push({
      id: row.id,
      name: row.name,
      dosageAmount: row.dosageAmount,
      dosageUnit: row.dosageUnit,
      notes: row.notes || undefined,
      enableNotifications: Boolean(row.enableNotifications),
      intervalType: row.intervalType,
      scheduleDays: row.scheduleDays ? JSON.parse(row.scheduleDays) : [1, 2, 3, 4, 5, 6, 0],
      scheduleTimes: JSON.parse(row.scheduleTimes),
      groupId: row.groupId || null,
      group: row.group_id ? {
        id: row.group_id,
        name: row.group_name,
        description: row.group_description || undefined,
        medications: [],
        createdAt: row.group_createdAt,
        updatedAt: row.group_updatedAt,
      } : null,
      intakes,
      lastIntake: intakes.length > 0 ? intakes[0] : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  return medications;
}

/**
 * Get medication by ID
 */
export async function getMedicationById(id: string): Promise<Medication | null> {
  const db = getDatabase();
  
  const result = await db.query(`
    SELECT 
      m.*,
      g.id          AS group_id,
      g.name        AS group_name,
      g.description AS group_description,
      g.createdAt   AS group_createdAt,
      g.updatedAt   AS group_updatedAt
    FROM medications m
    LEFT JOIN groups g ON m.groupId = g.id
    WHERE m.id = ?
  `, [id]);

  if (!result.values || result.values.length === 0) {
    return null;
  }

  const row = result.values[0];

  const intakesResult = await db.query(`
    SELECT * 
    FROM intakes 
    WHERE medicationId = ? 
    ORDER BY takenAt DESC
  `, [id]);

  const intakes: Intake[] = (intakesResult.values || []).map((i: any) => ({
    id: i.id,
    medicationId: i.medicationId,
    takenAt: i.takenAt,
    createdAt: i.createdAt,
  }));

  return {
    id: row.id,
    name: row.name,
    dosageAmount: row.dosageAmount,
    dosageUnit: row.dosageUnit,
    notes: row.notes || undefined,
    enableNotifications: Boolean(row.enableNotifications),
    intervalType: row.intervalType,
    scheduleDays: row.scheduleDays ? JSON.parse(row.scheduleDays) : [1, 2, 3, 4, 5, 6, 0],
    scheduleTimes: JSON.parse(row.scheduleTimes),
    groupId: row.groupId || null,
    group: row.group_id ? {
      id: row.group_id,
      name: row.group_name,
      description: row.group_description || undefined,
      medications: [],
      createdAt: row.group_createdAt,
      updatedAt: row.group_updatedAt,
    } : null,
    intakes,
    lastIntake: intakes.length > 0 ? intakes[0] : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Create new medication
 */
export async function createMedication(data: {
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  notes?: string;
  enableNotifications: boolean;
  intervalType: 'DAILY' | 'WEEKLY';
  scheduleDays: number[];
  scheduleTimes: string[];
  groupId?: string | null;
}): Promise<Medication> {
  const db = getDatabase();
  
  const id = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO medications (
      id, name, dosageAmount, dosageUnit, notes, 
      enableNotifications, intervalType, scheduleDays, scheduleTimes, 
      groupId, createdAt, updatedAt
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
      id,
      data.name,
      data.dosageAmount,
      data.dosageUnit,
      data.notes || null,
      data.enableNotifications ? 1 : 0,
      data.intervalType,
      JSON.stringify(data.scheduleDays),
      JSON.stringify(data.scheduleTimes),
      data.groupId || null,
      now,
      now,
    ]
  );

  const medication = await getMedicationById(id);
  if (!medication) {
    throw new Error('Failed to create medication');
  }

  return medication;
}

/**
 * Update medication
 */
export async function updateMedication(
  id: string,
  data: {
    name?: string;
    dosageAmount?: number;
    dosageUnit?: string;
    notes?: string;
    enableNotifications?: boolean;
    intervalType?: 'DAILY' | 'WEEKLY';
    scheduleDays?: number[];
    scheduleTimes?: string[];
    groupId?: string | null;
  }
): Promise<void> {
  const db = getDatabase();
  
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.dosageAmount !== undefined) {
    updates.push('dosageAmount = ?');
    values.push(data.dosageAmount);
  }
  if (data.dosageUnit !== undefined) {
    updates.push('dosageUnit = ?');
    values.push(data.dosageUnit);
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?');
    values.push(data.notes || null);
  }
  if (data.enableNotifications !== undefined) {
    updates.push('enableNotifications = ?');
    values.push(data.enableNotifications ? 1 : 0);
  }
  if (data.intervalType !== undefined) {
    updates.push('intervalType = ?');
    values.push(data.intervalType);
  }
  if (data.scheduleDays !== undefined) {
    updates.push('scheduleDays = ?');
    values.push(JSON.stringify(data.scheduleDays));
  }
  if (data.scheduleTimes !== undefined) {
    updates.push('scheduleTimes = ?');
    values.push(JSON.stringify(data.scheduleTimes));
  }
  if (data.groupId !== undefined) {
    updates.push('groupId = ?');
    values.push(data.groupId || null);
  }

  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await db.run(`
    UPDATE medications 
    SET ${updates.join(', ')} 
    WHERE id = ?
  `, values);
}

/**
 * Delete medication
 */
export async function deleteMedication(id: string): Promise<void> {
  const db = getDatabase();
  
  // Delete intakes first (foreign key)
  await db.run('DELETE FROM intakes WHERE medicationId = ?', [id]);
  
  // Delete medication
  await db.run('DELETE FROM medications WHERE id = ?', [id]);
}

/**
 * Track intake
 */
export async function trackIntake(medicationId: string): Promise<Intake> {
  const db = getDatabase();
  
  const id = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO intakes (
      id, medicationId, takenAt, createdAt
    ) 
    VALUES (?, ?, ?, ?)
  `, [id, medicationId, now, now]);

  return {
    id,
    medicationId,
    takenAt: now,
    createdAt: now,
  };
}

/**
 * Get medications by group ID
 */
export async function getMedicationsByGroup(groupId: string): Promise<Medication[]> {
  const db = getDatabase();
  
  const result = await db.query(`
    SELECT * 
    FROM medications 
    WHERE groupId = ? 
    ORDER BY createdAt DESC
  `, [groupId]);

  if (!result.values || result.values.length === 0) {
    return [];
  }

  const medications: Medication[] = [];
  for (const row of result.values) {
    const med = await getMedicationById(row.id);
    if (med) medications.push(med);
  }

  return medications;
}
