/**
 * Medication Form Component
 * 
 * Modal form for creating and editing medications.
 * Supports multiple schedule times and validation.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Modal, Input, Select, Button } from '../ui';
import type { Medication, MedicationFormData, Group } from '../../types';

interface MedicationFormProps {
  medication?: Medication | null;
  onClose: () => void;
  onSave: (data: MedicationFormData, id?: string) => Promise<boolean>;
  groups?: Group[];
}

/**
 * Form for creating/editing medications
 */
export function MedicationForm({ medication, onClose, onSave, groups = [] }: MedicationFormProps) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<MedicationFormData>({
    name: '',
    dosageAmount: 1,
    dosageUnit: 'mg',
    notes: '',
    enableNotifications: true,
    intervalType: 'DAILY', // Legacy
    scheduleDays: [1, 2, 3, 4, 5, 6, 0], // Default: Every day (Mon-Sun)
    scheduleTimes: ['08:00'],
    groupId: null,
  });
  
  const [submitting, setSubmitting] = useState(false);

  // Load medication data for editing
  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name,
        dosageAmount: medication.dosageAmount,
        dosageUnit: medication.dosageUnit,
        notes: medication.notes || '',
        enableNotifications: medication.enableNotifications,
        intervalType: medication.intervalType,
        scheduleDays: medication.scheduleDays || [1, 2, 3, 4, 5, 6, 0], // Fallback für alte Daten
        scheduleTimes: medication.scheduleTimes,
        groupId: medication.groupId || null,
      });
    }
  }, [medication]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const success = await onSave(formData, medication?.id);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving medication:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Add new schedule time
   */
  const addScheduleTime = () => {
    setFormData(prev => ({
      ...prev,
      scheduleTimes: [...prev.scheduleTimes, '12:00'],
    }));
  };

  /**
   * Remove schedule time
   */
  const removeScheduleTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scheduleTimes: prev.scheduleTimes.filter((_, i) => i !== index),
    }));
  };

  /**
   * Update schedule time
   */
  const updateScheduleTime = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      scheduleTimes: prev.scheduleTimes.map((time, i) => i === index ? value : time),
    }));
  };

  /**
   * Toggle day selection
   */
  const toggleDay = (day: number) => {
    setFormData(prev => {
      const days = prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day].sort((a, b) => {
            // Sort: Monday(1) first, Sunday(0) last
            if (a === 0) return 1;
            if (b === 0) return -1;
            return a - b;
          });
      
      // Ensure at least one day is selected
      return {
        ...prev,
        scheduleDays: days.length > 0 ? days : [day]
      };
    });
  };

  /**
   * Select all days (Every Day button)
   */
  const selectEveryDay = () => {
    setFormData(prev => ({
      ...prev,
      scheduleDays: [1, 2, 3, 4, 5, 6, 0] // Mon-Sun
    }));
  };

  /**
   * Check if all days are selected
   */
  const isEveryDaySelected = () => {
    return formData.scheduleDays.length === 7;
  };

  // Day button configuration (Mon-Sun)
  const dayButtons = [
    { day: 1, key: 'mon' },
    { day: 2, key: 'tue' },
    { day: 3, key: 'wed' },
    { day: 4, key: 'thu' },
    { day: 5, key: 'fri' },
    { day: 6, key: 'sat' },
    { day: 0, key: 'sun' },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={medication ? t('actions.edit') + ' ' + t('medications.title') : t('medications.addNew')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label={t('medications.name')}
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="e.g., Aspirin"
          data-testid="medication-name-input"
        />

        {/* Dosage */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('medications.dosage')}
            type="number"
            min="0.1"
            step="0.1"
            value={formData.dosageAmount}
            onChange={e => setFormData(prev => ({ ...prev, dosageAmount: parseFloat(e.target.value) }))}
            required
            data-testid="dosage-amount-input"
          />
          <Select
            label={t('medications.unit')}
            value={formData.dosageUnit}
            onChange={e => setFormData(prev => ({ ...prev, dosageUnit: e.target.value }))}
            options={[
              { value: 'mg', label: 'mg' },
              { value: 'g', label: 'g' },
              { value: 'ml', label: 'ml' },
              { value: 'tablets', label: t('units.tablets') },
            ]}
            data-testid="dosage-unit-select"
          />
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('medications.schedule')}
          </label>
          
          {/* Every Day Button */}
          <button
            type="button"
            onClick={selectEveryDay}
            className={`w-full mb-3 px-4 py-2 rounded-lg border-2 transition-colors ${
              isEveryDaySelected()
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400'
            }`}
            data-testid="every-day-button"
            aria-label="every-day-button"
          >
            {t('days.everyDay')}
          </button>
          
          {/* Day Buttons */}
          <div className="grid grid-cols-7 gap-2">
            {dayButtons.map(({ day, key }) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-2 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.scheduleDays.includes(day)
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400'
                }`}
                data-testid={`day-button-${day}`}
                aria-label={`day-button-${day}`}
              >
                {t(`days.short.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Times */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('medications.times')}
          </label>
          <div className="space-y-2">
            {formData.scheduleTimes.map((time, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="time"
                  value={time}
                  onChange={e => updateScheduleTime(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  data-testid={`schedule-time-${index}`}
                  aria-label={`schedule-time-${index}`}
                />
                {formData.scheduleTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScheduleTime(index)}
                    className="text-red-600 hover:text-red-700"
                    aria-label={`remove-schedule-time-${index}`}
                  >
                    <Icon icon="mdi:delete" className="text-xl" />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="mdi:plus"
              onClick={addScheduleTime}
              data-testid="add-time-button"
            >
              {t('actions.add')} {t('medications.times')}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enableNotifications}
            onChange={e => setFormData(prev => ({ ...prev, enableNotifications: e.target.checked }))}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            data-testid="notifications-checkbox"
            aria-label="notifications-checkbox"
          />
          <span className="text-sm text-gray-700">{t('medications.enableNotifications')}</span>
        </label>

        {/* Group Selection */}
        {groups.length > 0 && (
          <Select
            label={t('groups.group')}
            value={formData.groupId || ''}
            onChange={e => setFormData(prev => ({ ...prev, groupId: e.target.value || null }))}
            options={[
              { value: '', label: t('groups.noGroup') },
              ...groups.map(g => ({ value: g.id, label: g.name }))
            ]}
            data-testid="group-select"
          />
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('medications.notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={t('medications.notes')}
            data-testid="notes-textarea"
            aria-label="notes-textarea"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            loading={submitting}
            className="flex-1"
            data-testid="save-medication-button"
          >
            {t('actions.save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            data-testid="cancel-medication-button"
          >
            {t('actions.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
