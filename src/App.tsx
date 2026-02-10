/**
 * Main Application Component
 * 
 * PillTracker - Medication tracking application with i18n support.
 * Features medication management, groups, and slide-to-track intake recording.
 */
import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from './components/ui';
import { SlideToTrack } from './components/medication/SlideToTrack';
import { MedicationForm } from './components/medication/MedicationForm';
import { GroupForm } from './components/group/GroupForm';
import DbDebug from './pages/DbDebug';
import NotificationsDebug from './pages/NotificationsDebug';
import { useMedications } from './hooks/useMedications';
import { useGroups } from './hooks/useGroups';
import { generateMedicationPDF, generateAllMedicationsPDF, generateGroupPDF } from './lib/pdf/generator';
import { isNativePlatform } from './db';
import { 
  requestNotificationPermissions, 
  initializeNotificationListeners, 
  removeNotificationListeners 
} from './lib/notifications';
import type { Medication, Group } from './types';

function App() {
  const { t, i18n } = useTranslation();
  const { medications, loading, trackIntake, deleteMedication, createMedication, updateMedication, refetch } = useMedications();
  const { groups, loading: groupsLoading, createGroup, updateGroup, deleteGroup, trackAllInGroup } = useGroups();
  const [showAddMedicationForm, setShowAddMedicationForm] = useState(false);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [showDbDebug, setShowDbDebug] = useState(false);
  const [showNotificationsDebug, setShowNotificationsDebug] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [scrollToMedicationId, setScrollToMedicationId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  /**
   * Initialize notification system on mount
   */
  useEffect(() => {
    if (!isNativePlatform()) return;

    // Request notification permissions
    requestNotificationPermissions().then(granted => {
      if (granted) {
        console.log('[App] Notification permissions granted');
      } else {
        console.log('[App] Notification permissions denied');
      }
    });

    // Initialize notification tap listeners
    initializeNotificationListeners((medicationId) => {
      // Scroll to and highlight the medication when notification is tapped
      setScrollToMedicationId(medicationId);
      setTimeout(() => setScrollToMedicationId(null), 3000);
    });

    // Cleanup on unmount
    return () => {
      removeNotificationListeners();
    };
  }, []);

  /**
   * Format date/time for display
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  /**
   * Toggle language between German and English
   */
  const toggleLanguage = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de';
    i18n.changeLanguage(newLang);
  };

  /**
   * Handle medication intake tracking
   */
  const handleTrack = async (medicationId: string) => {
    await trackIntake(medicationId);
  };

  /**
   * Handle medication deletion
   */
  const handleDelete = async (id: string) => {
    if (confirm(t('confirmations.deleteMedication'))) {
      await deleteMedication(id);
    }
  };

  /**
   * Export single medication as PDF
   */
  const handleExportPDF = async (medication: Medication) => {
    await generateMedicationPDF(medication, i18n.language);
  };

  /**
   * Export all medications as PDF
   */
  const handleExportAllPDF = async () => {
    await generateAllMedicationsPDF(medications, i18n.language);
  };

  /**
   * Export group as PDF
   */
  const handleExportGroupPDF = async (group: Group) => {
    await generateGroupPDF(group, i18n.language);
  };

  /**
   * Handle group deletion
   */
  const handleDeleteGroup = async (id: string) => {
    if (confirm(t('confirmations.deleteGroup'))) {
      await deleteGroup(id);
    }
  };

  /**
   * Assign medication to group
   */
  const handleAssignToGroup = async (medicationId: string, groupId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;

    await updateMedication(medicationId, {
      name: medication.name,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      notes: medication.notes || '',
      enableNotifications: medication.enableNotifications,
      intervalType: medication.intervalType,
      scheduleDays: medication.scheduleDays,
      scheduleTimes: medication.scheduleTimes,
      groupId: groupId,
    });
  };

  /**
   * Remove medication from group
   */
  const handleRemoveFromGroup = async (medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return;

    await updateMedication(medicationId, {
      name: medication.name,
      dosageAmount: medication.dosageAmount,
      dosageUnit: medication.dosageUnit,
      notes: medication.notes || '',
      enableNotifications: medication.enableNotifications,
      intervalType: medication.intervalType,
      scheduleDays: medication.scheduleDays,
      scheduleTimes: medication.scheduleTimes,
      groupId: null,
    });
  };

  /**
   * Handle medication form save
   */
  const handleSaveMedication = async (data: any, id?: string) => {
    try {
      if (id) {
        await updateMedication(id, data);
      } else {
        await createMedication(data);
      }
      return true;
    } catch (error) {
      console.error('Error saving medication:', error);
      return false;
    }
  };

  /**
   * Handle group form save
   */
  const handleSaveGroup = async (data: any, id?: string) => {
    try {
      if (id) {
        await updateGroup(id, data);
      } else {
        await createGroup(data);
      }
      return true;
    } catch (error) {
      console.error('Error saving group:', error);
      return false;
    }
  };

  /**
   * Get medications that are not in any group
   */
  const ungroupedMedications = medications.filter(med => !med.groupId);

  /**
   * Render a single medication card
   */
  const renderMedicationCard = (medication: Medication, inGroup: boolean = false) => {
    // Intakes are ordered newest-first; show the most recent one.
    const lastIntake = medication.intakes.length > 0 ? medication.intakes[0] : null;
    
    const isHighlighted = scrollToMedicationId === medication.id;

    return (
      <Card 
        key={medication.id} 
        className={`p-4 transition-all duration-300 ${isHighlighted ? 'ring-4 ring-indigo-500 shadow-lg' : ''}`} 
        data-testid={`medication-card-${medication.id}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="mdi:pill" className="text-indigo-600 text-xl" />
              <h3 className="text-lg font-semibold text-gray-900" data-testid="medication-name">
                {medication.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600" data-testid="medication-dosage">
              {medication.dosageAmount} {medication.dosageUnit}
            </p>
            {medication.notes && (
              <p className="text-sm text-gray-500 mt-1" data-testid="medication-notes">
                {medication.notes}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                {t(`intervals.${medication.intervalType}`)}
              </span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                {medication.scheduleTimes}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            {inGroup && (
              <Button
                variant="ghost"
                size="sm"
                icon="mdi:folder-remove"
                onClick={() => handleRemoveFromGroup(medication.id)}
                title={t('actions.removeFromGroup')}
                data-testid={`remove-from-group-${medication.id}`}
                aria-label={`remove-from-group-${medication.id}`}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              icon="mdi:pencil"
              onClick={() => setEditingMedication(medication)}
              data-testid={`edit-medication-${medication.id}`}
              aria-label={`edit-medication-${medication.id}`}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="mdi:delete"
              onClick={() => handleDelete(medication.id)}
              data-testid={`delete-medication-${medication.id}`}
              aria-label={`delete-medication-${medication.id}`}
            />
          </div>
        </div>

        {lastIntake && (
          <p className="text-base font-semibold text-indigo-600 mb-3" data-testid="last-intake" aria-label="last-intake">
            {t('medications.lastTaken')}: {formatDateTime(lastIntake.takenAt)}
          </p>
        )}

        <SlideToTrack
          onTrack={() => handleTrack(medication.id)}
          label={t('actions.slideToTrack')}
          testId={`track-medication-${medication.id}`}
        />
      </Card>
    );
  };

  if (loading || groupsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" className="text-4xl text-indigo-600 animate-spin mb-2" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:pill" className="text-4xl text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">PillTracker</h1>
            </div>
            <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="mdi:dots-vertical"
                  onClick={() => setShowMenu(!showMenu)}
                  data-testid="menu-button"
                  title={t('actions.menu')}
                  aria-label="menu-button"
                />
              
              {/* Menu Drawer */}
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)}
                  />
                  <Card className="absolute right-0 top-12 z-50 p-4 w-64 shadow-xl">
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          toggleLanguage();
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        data-testid="menu-language-toggle"
                        aria-label="menu-language-toggle"
                      >
                        <Icon icon={i18n.language === 'de' ? 'flag:gb-4x3' : 'flag:de-4x3'} className="text-2xl" />
                        <div>
                          <p className="font-medium text-gray-900">{t('actions.changeLanguage')}</p>
                          <p className="text-sm text-gray-500">{i18n.language === 'de' ? 'English' : 'Deutsch'}</p>
                        </div>
                      </button>
                      
                      {medications.length > 0 && (
                        <button
                          onClick={() => {
                            handleExportAllPDF();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                          data-testid="menu-export-all-pdf"
                          aria-label="menu-export-all-pdf"
                        >
                          <Icon icon="mdi:file-pdf" className="text-2xl text-red-600" />
                          <div>
                            <p className="font-medium text-gray-900">{t('actions.exportAllPDF')}</p>
                            <p className="text-sm text-gray-500">{medications.length} {t('medications.title')}</p>
                          </div>
                        </button>
                      )}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600">{t('common.subtitle')}</p>
        </header>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button
            icon="mdi:pill"
            onClick={() => setShowAddMedicationForm(true)}
            className="flex-1 sm:flex-none"
            data-testid="add-medication-button"
            aria-label="add-medication-button"
          >
            {t('medications.addNew')}
          </Button>
          <Button
            icon="mdi:folder-multiple"
            onClick={() => setShowAddGroupForm(true)}
            variant="secondary"
            className="flex-1 sm:flex-none"
            data-testid="add-group-button"
            aria-label="add-group-button"
          >
            {t('groups.addNew')}
          </Button>
        </div>

        {/* Groups with their medications */}
        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mdi:folder-multiple" className="text-indigo-600" />
              {t('groups.title')}
            </h2>
            <div className="space-y-6">
              {groups.map(group => {
                const groupMedications = medications.filter(med => med.groupId === group.id);
                const ungroupedForDropdown = medications.filter(med => !med.groupId);

                return (
                  <Card key={group.id} className="p-5 bg-white border-2 border-indigo-200" data-testid={`group-card-${group.id}`}>
                    {/* Group Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon icon="mdi:folder" className="text-indigo-600 text-2xl" />
                          <h3 className="text-xl font-bold text-gray-900" data-testid="group-name">
                            {group.name}
                          </h3>
                        </div>
                        {group.description && (
                          <p className="text-sm text-gray-600 mt-1" data-testid="group-notes">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {groupMedications.length} {t('medications.title')}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="mdi:pencil"
                          onClick={() => setEditingGroup(group)}
                          data-testid={`edit-group-${group.id}`}
                          aria-label={`edit-group-${group.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="mdi:delete"
                          onClick={() => handleDeleteGroup(group.id)}
                          data-testid={`delete-group-${group.id}`}
                          aria-label={`delete-group-${group.id}`}
                        />
                      </div>
                    </div>

                    {/* Add medication to group dropdown */}
                    {ungroupedForDropdown.length > 0 && (
                      <div className="mb-4">
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignToGroup(e.target.value, group.id);
                              e.target.value = '';
                            }
                          }}
                          data-testid={`add-to-group-dropdown-${group.id}`}
                          aria-label={`add-to-group-dropdown-${group.id}`}
                        >
                          <option value="">{t('groups.addMedicationToGroup')}</option>
                          {ungroupedForDropdown.map(med => (
                            <option key={med.id} value={med.id}>
                              {med.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Medications in group */}
                    {groupMedications.length > 0 && (
                      <div className="mb-4">
                        <SlideToTrack
                          onTrack={() => {
                            // trackAllInGroup updates DB but not the medications hook state.
                            // Refetch medications so "Last taken" timestamps update immediately.
                            trackAllInGroup(group.id).then(() => refetch());
                          }}
                          label={t('groups.trackAll')}
                          testId={`track-all-group-${group.id}`}
                        />
                      </div>
                    )}

                    <div className="space-y-3 pl-4 border-l-4 border-indigo-300">
                      {groupMedications.length > 0 ? (
                        groupMedications.map(medication => renderMedicationCard(medication, true))
                      ) : (
                        <p className="text-sm text-gray-500 italic py-4">
                          {t('groups.noMedications')}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Ungrouped Medications */}
        {ungroupedMedications.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Icon icon="mdi:pill" className="text-indigo-600" />
              {t('medications.title')}
            </h2>
            <div className="space-y-4">
              {ungroupedMedications.map(medication => renderMedicationCard(medication, false))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {medications.length === 0 && groups.length === 0 && (
          <Card className="p-12 text-center">
            <Icon icon="mdi:pill-off" className="text-6xl text-gray-300 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('medications.empty')}
            </h3>
            <p className="text-gray-500 mb-6">
              {t('medications.emptyDescription')}
            </p>
            <Button
              icon="mdi:plus"
              onClick={() => setShowAddMedicationForm(true)}
              data-testid="empty-state-add-button"
              aria-label="empty-state-add-button"
            >
              {t('medications.addFirst')}
            </Button>
          </Card>
        )}
      </div>

      {/* Medication Form Modal */}
      {(showAddMedicationForm || editingMedication) && (
        <MedicationForm
          medication={editingMedication}
          groups={groups}
          onClose={() => {
            setShowAddMedicationForm(false);
            setEditingMedication(null);
          }}
          onSave={handleSaveMedication}
        />
      )}

      {/* Group Form Modal */}
      {/* Group Form Modal */}
      {(showAddGroupForm || editingGroup) && (
        <GroupForm
          group={editingGroup}
          onClose={() => {
            setShowAddGroupForm(false);
            setEditingGroup(null);
          }}
          onSave={handleSaveGroup}
        />
      )}

      {import.meta.env.VITE_SHOW_DEBUG_UI === 'true' && showDbDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Database Debug</h2>
              <button 
                onClick={() => setShowDbDebug(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="db-debug-close"
              >
                <Icon icon="mdi:close" width={24} />
              </button>
            </div>
            <DbDebug />
          </div>
        </div>
      )}

      {/* Notifications Debug Modal */}
      {import.meta.env.VITE_SHOW_DEBUG_UI === 'true' && showNotificationsDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Notifications Debug</h2>
              <button 
                onClick={() => setShowNotificationsDebug(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="notifications-debug-close"
              >
                <Icon icon="mdi:close" width={24} />
              </button>
            </div>
            <NotificationsDebug />
          </div>
        </div>
      )}

      {import.meta.env.VITE_SHOW_DEBUG_UI === 'true' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white py-2 px-4 flex justify-center items-center gap-4 text-sm z-40">
          <span>PillTracker v1.0</span>
          <button
            onClick={() => setShowDbDebug(true)}
            className="text-blue-300 hover:text-blue-100 underline"
            aria-label="open-db-debug"
          >
            DB Debug
          </button>
          <button
            onClick={() => setShowNotificationsDebug(true)}
            className="text-green-300 hover:text-green-100 underline"
            aria-label="open-notifications-debug"
          >
            🔔 Notifications
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;
