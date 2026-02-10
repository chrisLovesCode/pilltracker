/**
 * Groups Hook
 * 
 * Custom hook for group CRUD operations.
 * Uses local SQLite database via repositories.
 */
import { useState, useEffect } from 'react';
import {
  getAllGroups,
  createGroup as createGroupRepo,
  updateGroup as updateGroupRepo,
  deleteGroup as deleteGroupRepo,
  getMedicationsByGroup,
  trackIntake,
  isNativePlatform,
} from '../db';
import type { Group, GroupFormData } from '../types';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    if (!isNativePlatform()) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAllGroups();
      setGroups(data);
    } catch (err) {
      console.error('[useGroups] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (data: GroupFormData): Promise<Group | null> => {
    setLoading(true);
    setError(null);
    try {
      const group = await createGroupRepo({
        name: data.name,
        description: data.notes,
      });
      
      // Fetch updated list
      await fetchGroups();
      
      return {
        ...group,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        medications: [],
      } as Group;
    } catch (err) {
      console.error('[useGroups] Create error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = async (id: string, data: GroupFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await updateGroupRepo(id, {
        name: data.name,
        description: data.notes,
      });
      
      // Fetch updated list
      await fetchGroups();
      
      return true;
    } catch (err) {
      console.error('[useGroups] Update error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await deleteGroupRepo(id);
      
      // Update local state
      setGroups(prev => prev.filter(g => g.id !== id));
      
      return true;
    } catch (err) {
      console.error('[useGroups] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const trackAllInGroup = async (groupId: string): Promise<boolean> => {
    setError(null);
    try {
      // Get all medications in group
      const medications = await getMedicationsByGroup(groupId);
      
      // Track all medications
      await Promise.all(medications.map(med => trackIntake(med.id)));
      
      // Update local state optimistically - use the medications we just fetched
      const now = new Date().toISOString();
      setGroups(prev => prev.map(group => {
        if (group.id === groupId) {
          // Create a map of medication IDs that were tracked
          const trackedMedIds = new Set(medications.map(m => m.id));
          
          return {
            ...group,
            medications: group.medications.map(med => {
              // Only update medications that are in this group
              if (trackedMedIds.has(med.id)) {
                return {
                  ...med,
                  intakes: [{
                    id: Date.now().toString() + med.id,
                    medicationId: med.id,
                    takenAt: now,
                    createdAt: now,
                    notes: null
                  }, ...med.intakes]
                };
              }
              return med;
            })
          };
        }
        return group;
      }));
      
      return true;
    } catch (err) {
      console.error('[useGroups] Track all error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Load groups on mount
  useEffect(() => {
    if (!isNativePlatform()) return;
    fetchGroups();
  }, []);

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    trackAllInGroup,
    refetch: fetchGroups,
  };
}
