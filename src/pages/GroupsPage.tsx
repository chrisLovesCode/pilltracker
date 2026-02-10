/**
 * Groups Page Component
 * 
 * Displays and manages medication groups with track-all functionality.
 */
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui';
import { SlideToTrack } from '../components/medication/SlideToTrack';
import { GroupForm } from '../components/group/GroupForm';
import { useGroups } from '../hooks/useGroups';
import type { Group, GroupFormData } from '../types';

export function GroupsPage() {
  const { t, i18n } = useTranslation();
  const { groups, loading, trackAllInGroup, deleteGroup, createGroup, updateGroup } = useGroups();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleTrackAll = async (groupId: string) => {
    await trackAllInGroup(groupId);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmations.deleteGroup'))) {
      await deleteGroup(id);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button
          icon="mdi:plus"
          onClick={() => setShowAddForm(true)}
          className="w-full sm:w-auto"
          data-testid="add-group-button"
        >
          {t('groups.addNew')}
        </Button>
      </div>

      {loading && groups.length === 0 ? (
        <div className="text-center py-12">
          <Icon icon="mdi:loading" className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center py-12">
          <Icon icon="mdi:folder-multiple-outline" className="text-6xl text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">{t('groups.empty')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id} className="space-y-4" data-testid="group-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-1" data-testid="group-name">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Icon icon="mdi:folder" className="text-indigo-500" />
                    <span>{group.medications.length} {t('groups.medications')}</span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                    data-testid="edit-group-button"
                  >
                    <Icon icon="mdi:pencil" className="text-xl" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    data-testid="delete-group-button"
                  >
                    <Icon icon="mdi:delete" className="text-xl" />
                  </button>
                </div>
              </div>

              {group.medications.length > 0 && (
                <div className="w-full">
                  <SlideToTrack
                    onTrack={() => handleTrackAll(group.id)}
                    label={t('groups.trackAll')}
                    testId={`track-all-slide-${group.id}`}
                  />
                </div>
              )}

              {group.medications.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('groups.medications')}:</p>
                  <div className="space-y-2">
                    {group.medications.map((med: any) => (
                      <div key={med.id} className="flex items-center justify-between">
                        <span className="text-gray-700">{med.name}</span>
                        {med.intakes.length > 0 && (
                          <span className="text-base font-medium text-indigo-600">
                            {formatDateTime(med.intakes[0].takenAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {(showAddForm || editingGroup) && (
        <GroupForm
          group={editingGroup}
          onClose={() => {
            setShowAddForm(false);
            setEditingGroup(null);
          }}
          onSave={async (data: GroupFormData, id?: string) => {
            if (id) {
              return await updateGroup(id, data);
            } else {
              const result = await createGroup(data);
              return result !== null;
            }
          }}
        />
      )}
    </div>
  );
}
