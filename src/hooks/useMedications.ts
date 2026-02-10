/**
 * Medication Hook
 * 
 * Custom hook for medication CRUD operations and intake tracking.
 * Uses local SQLite database via repositories.
 */
import { useState, useEffect } from 'react';
import {
  getAllMedications,
  createMedication as createMedicationRepo,
  updateMedication as updateMedicationRepo,
  deleteMedication as deleteMedicationRepo,
  trackIntake,
  isNativePlatform,
} from '../db';
import { 
  scheduleMedicationNotifications, 
  cancelMedicationNotifications,
  rescheduleAllNotifications 
} from '../lib/notifications';
import type { MedicationFormData, Medication } from '../types';

/**
 * Hook for managing medications
 */
export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all medications
   */
  const fetchMedications = async () => {
    if (!isNativePlatform()) {
      // Web/test environment: DB is not available.
      setMedications([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAllMedications();
      console.log('[useMedications] Fetched medications:', data.length);
      if (data.length > 0) {
        console.log('[useMedications] First medication:', JSON.stringify(data[0]));
      }
      setMedications(data);
    } catch (err) {
      console.error('[useMedications] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new medication
   */
  const createMedication = async (data: MedicationFormData): Promise<Medication | null> => {
    setLoading(true);
    setError(null);
    try {
      const medication = await createMedicationRepo({
        name: data.name,
        dosageAmount: data.dosageAmount,
        dosageUnit: data.dosageUnit,
        notes: data.notes,
        enableNotifications: data.enableNotifications,
        intervalType: data.intervalType,
        scheduleDays: data.scheduleDays,
        scheduleTimes: data.scheduleTimes,
        groupId: data.groupId,
      });
      
      // Schedule notifications if enabled
      if (medication.enableNotifications) {
        await scheduleMedicationNotifications(medication);
      }
      
      // Fetch updated list
      await fetchMedications();
      
      return medication;
    } catch (err) {
      console.error('[useMedications] Create error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update an existing medication
   */
  const updateMedication = async (id: string, data: MedicationFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await updateMedicationRepo(id, {
        name: data.name,
        dosageAmount: data.dosageAmount,
        dosageUnit: data.dosageUnit,
        notes: data.notes,
        enableNotifications: data.enableNotifications,
        intervalType: data.intervalType,
        scheduleDays: data.scheduleDays,
        scheduleTimes: data.scheduleTimes,
        groupId: data.groupId,
      });
      
      // Fetch updated list
      await fetchMedications();
      
      // Get updated medication and update notifications
      const updatedMedications = await getAllMedications();
      const updatedMed = updatedMedications.find(m => m.id === id);
      
      if (updatedMed) {
        if (data.enableNotifications) {
          await scheduleMedicationNotifications(updatedMed);
        } else {
          await cancelMedicationNotifications(id);
        }
      }
      
      return true;
    } catch (err) {
      console.error('[useMedications] Update error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a medication
   */
  const deleteMedication = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Cancel notifications first
      await cancelMedicationNotifications(id);
      
      await deleteMedicationRepo(id);
      
      // Update local state
      setMedications(prev => prev.filter(m => m.id !== id));
      
      return true;
    } catch (err) {
      console.error('[useMedications] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Track medication intake
   */
  const trackMedicationIntake = async (medicationId: string, notes?: string): Promise<boolean> => {
    setError(null);
    try {
      await trackIntake(medicationId);
      
      // Update only the specific medication instead of fetching all
      setMedications(prev => prev.map(med => {
        if (med.id === medicationId) {
          return {
            ...med,
            intakes: [{
              id: Date.now().toString(),
              medicationId,
              takenAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              notes: notes || null
            }, ...med.intakes]
          };
        }
        return med;
      }));
      
      return true;
    } catch (err) {
      console.error('[useMedications] Track intake error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // Load medications on mount and reschedule notifications
  useEffect(() => {
    if (!isNativePlatform()) return;

    fetchMedications()
      .then(async () => {
        // Reschedule all notifications after loading medications
        const meds = await getAllMedications();
        await rescheduleAllNotifications(meds);
      })
      .catch((err) => {
        console.error('[useMedications] Initial load error:', err);
      });
  }, []);

  return {
    medications,
    loading,
    error,
    createMedication,
    updateMedication,
    deleteMedication,
    trackIntake: trackMedicationIntake,
    refetch: fetchMedications,
  };
}
