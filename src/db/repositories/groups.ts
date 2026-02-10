/**
 * Group Repository (Direct SQL)
 */

import { getDatabase } from '../connection';
import { getMedicationsByGroup } from './medications';
import type { Group } from '../../types';

/**
 * Get all groups with medications
 */
export async function getAllGroups(): Promise<Group[]> {
  const db = getDatabase();
  
  const result = await db.query(
    'SELECT * FROM groups ORDER BY createdAt DESC'
  );

  if (!result.values || result.values.length === 0) {
    return [];
  }

  const groups: Group[] = [];
  for (const row of result.values) {
    const medications = await getMedicationsByGroup(row.id);
    
    groups.push({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      medications,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  return groups;
}

/**
 * Get group by ID
 */
export async function getGroupById(id: string): Promise<Group | null> {
  const db = getDatabase();
  
  const result = await db.query(
    'SELECT * FROM groups WHERE id = ?',
    [id]
  );

  if (!result.values || result.values.length === 0) {
    return null;
  }

  const row = result.values[0];
  const medications = await getMedicationsByGroup(id);

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    medications,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Create group
 */
export async function createGroup(data: {
  name: string;
  description?: string;
}): Promise<Group> {
  const db = getDatabase();
  
  const id = `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await db.run(`
    INSERT INTO groups (
      id, name, description, createdAt, updatedAt
    ) 
    VALUES (?, ?, ?, ?, ?)
  `, [id, data.name, data.description || null, now, now]);

  return {
    id,
    name: data.name,
    description: data.description,
    medications: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update group
 */
export async function updateGroup(
  id: string,
  data: {
    name?: string;
    description?: string;
  }
): Promise<void> {
  const db = getDatabase();
  
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description || null);
  }

  updates.push('updatedAt = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await db.run(`
    UPDATE groups 
    SET ${updates.join(', ')} 
    WHERE id = ?
  `, values);
}

/**
 * Delete group
 */
export async function deleteGroup(id: string): Promise<void> {
  const db = getDatabase();
  
  // Set groupId to NULL for medications in this group
  await db.run('UPDATE medications SET groupId = NULL WHERE groupId = ?', [id]);
  
  // Delete group
  await db.run('DELETE FROM groups WHERE id = ?', [id]);
}
