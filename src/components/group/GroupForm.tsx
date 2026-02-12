/**
 * Group Form Component
 * 
 * Modal form for creating and editing medication groups (simplified - only name and description).
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Input, Button } from '../ui';
import type { Group, GroupFormData } from '../../types';

interface GroupFormProps {
  group?: Group | null;
  onClose: () => void;
  onSave: (data: GroupFormData, id?: string) => Promise<boolean>;
}

export function GroupForm({ group, onClose, onSave }: GroupFormProps) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    notes: '',
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        notes: group.description || '',
      });
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const success = await onSave(formData, group?.id);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving group:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={group ? t('actions.edit') + ' ' + t('groups.title') : t('groups.addNew')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('groups.name')}
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="e.g., Morning Routine"
          data-testid="group-name-input"
        />

        <div>
          <label className="block text-content-muted font-medium text-text-secondary mb-1">
            {t('medications.notes')}
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border-default rounded-control focus:ring-2 focus:ring-brand-focus focus:border-brand-focus focus:outline-none text-content"
            rows={3}
            placeholder="Optional description"
            data-testid="group-notes-textarea"
            aria-label="group-notes-textarea"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            icon="mdi:close"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
            data-testid="cancel-group-button"
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon="mdi:content-save"
            disabled={submitting}
            className="flex-1"
            data-testid="save-group-button"
          >
            {submitting ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
