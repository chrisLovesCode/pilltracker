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
import PrintCards from './pages/PrintCards';
import HelpPage from './pages/HelpPage';
import { useMedications } from './hooks/useMedications';
import { useGroups } from './hooks/useGroups';
import { printCurrentView } from './lib/print';
import { getMedicationDueInfo } from './lib/medicationDue';
import { translateDosageUnit } from './lib/dosage';
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
  const [activeView, setActiveView] = useState<'main' | 'print' | 'help'>('main');
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [testNowOverrideMs, setTestNowOverrideMs] = useState<number | null>(null);
  const showDebugUI = import.meta.env.VITE_SHOW_DEBUG_UI === 'true';
  const quickAddMedicationLabel = t('medications.quickAddLabel');
  const quickAddGroupLabel = t('groups.quickAddLabel');

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

  // Keep due badges fresh over time without user interaction.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Debug/E2E hook for deterministic due-time tests without waiting in real time.
  useEffect(() => {
    if (!showDebugUI) return;

    const w = window as Window & {
      __pilltrackerSetNowForTests?: (value: string | number | null) => string;
    };

    w.__pilltrackerSetNowForTests = (value: string | number | null) => {
      if (value === null || value === '') {
        setTestNowOverrideMs(null);
        return 'OK';
      }

      const parsed = typeof value === 'number' ? value : Date.parse(String(value));
      if (Number.isNaN(parsed)) {
        return 'INVALID_DATE';
      }

      setTestNowOverrideMs(parsed);
      return 'OK';
    };

    return () => {
      delete w.__pilltrackerSetNowForTests;
    };
  }, [showDebugUI]);

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

  const formatRelativeLastTaken = (dateString: string, referenceTimeMs: number) => {
    const takenAtMs = new Date(dateString).getTime();
    if (Number.isNaN(takenAtMs)) {
      return t('medications.neverTaken');
    }

    const diffMs = Math.max(0, referenceTimeMs - takenAtMs);
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 1) {
      return t('medications.lastTakenJustNow');
    }
    if (diffMinutes < 60) {
      return t('medications.lastTakenMinutes', { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return t('medications.lastTakenHours', { count: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return t('medications.lastTakenDays', { count: diffDays });
  };

  const isGermanLanguage = () => {
    const language = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase();
    return language.startsWith('de');
  };

  /**
   * Human readable due duration text.
   */
  const formatDueLabel = (overdueMs: number) => {
    const overdueMinutes = Math.floor(overdueMs / 60_000);
    if (overdueMinutes <= 0) {
      return t('medications.dueNow');
    }

    if (overdueMinutes < 60) {
      return t('medications.dueForMinutes', { count: overdueMinutes });
    }

    const overdueHours = Math.floor(overdueMinutes / 60);
    if (overdueHours < 24) {
      return t('medications.dueForHours', { count: overdueHours });
    }

    const overdueDays = Math.floor(overdueHours / 24);
    return t('medications.dueForDays', { count: overdueDays });
  };

  /**
   * Toggle language between German and English
   */
  const toggleLanguage = async () => {
    const newLang = isGermanLanguage() ? 'en' : 'de';
    await i18n.changeLanguage(newLang);
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
   * Handle group deletion
   */
  const handleDeleteGroup = async (id: string) => {
    if (confirm(t('confirmations.deleteGroup'))) {
      await deleteGroup(id);
    }
  };

  /**
   * Open Android print dialog for the print cards view.
   */
  const handlePrintCards = async () => {
    try {
      await printCurrentView('PillTracker');
    } catch (error) {
      console.error('[Print] Failed to open print dialog:', error);
      alert('Druckdialog konnte nicht geöffnet werden.');
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
    const effectiveNowMs = testNowOverrideMs ?? nowTimestamp;
    const dueInfo = getMedicationDueInfo(medication, new Date(effectiveNowMs));
    const isDue = dueInfo.isDue;
    const translatedUnit = translateDosageUnit(medication.dosageUnit, t);
    const relativeLastTaken = lastIntake ? formatRelativeLastTaken(lastIntake.takenAt, effectiveNowMs) : null;

    return (
      <Card 
        key={medication.id} 
        className={`p-4 transition-all duration-300 ${
          isHighlighted ? 'ring-4 ring-brand-focus shadow-lg' : ''
        } ${isDue ? 'border-2 border-due-border bg-due-bg shadow-lg' : ''}`} 
        data-testid={`medication-card-${medication.id}`}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="mdi:pill" className="text-brand-color text-xl" />
              <h3 className="max-w-full text-lg font-semibold text-text-primary break-all" data-testid="medication-name">
                {medication.name}
              </h3>
            </div>
            <p className="text-sm text-text-muted" data-testid="medication-dosage">
              {medication.dosageAmount} {translatedUnit}
            </p>
            {medication.notes && (
              <p className="text-sm text-text-muted mt-1 break-all" data-testid="medication-notes">
                {medication.notes}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-brand-color-soft text-brand-on-soft px-2 py-1 rounded">
                {t(`intervals.${medication.intervalType}`)}
              </span>
              {medication.scheduleTimes.map((time, index) => (
                <span key={`${medication.id}-time-${index}`} className="text-xs bg-surface-2 text-text-primary px-2 py-1 rounded mr-1">
                  {time}
                </span>
              ))}
            </div>
            {isDue && (
              <div className="mt-3">
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-due-pill-bg px-2.5 py-1 text-xs font-semibold text-due-pill-text"
                  data-testid={`medication-due-${medication.id}`}
                >
                  <Icon icon="mdi:alarm" className="text-sm" />
                  {formatDueLabel(dueInfo.overdueMs)}
                </span>
              </div>
            )}
          </div>
          
          <div className="ml-2 flex shrink-0 items-center gap-0.5">
            {inGroup && (
              <Button
                variant="ghost"
                size="sm"
                icon="mdi:folder-remove"
                iconClassName="!text-brand-color"
                className="!px-1.5 !py-1 !text-brand-color hover:!text-brand-color-strong"
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
              iconClassName="!text-brand-color"
              className="!px-1.5 !py-1 !text-brand-color hover:!text-brand-color-strong"
              onClick={() => setEditingMedication(medication)}
              data-testid={`edit-medication-${medication.id}`}
              aria-label={`edit-medication-${medication.id}`}
            />
            <Button
              variant="ghost"
              size="sm"
              icon="mdi:delete"
              iconClassName="!text-brand-color"
              className="!px-1.5 !py-1 !text-brand-color hover:!text-brand-color-strong"
              onClick={() => handleDelete(medication.id)}
              data-testid={`delete-medication-${medication.id}`}
              aria-label={`delete-medication-${medication.id}`}
            />
          </div>
        </div>

        {lastIntake && (
          <div
            className="mb-3"
            data-testid="last-intake"
            aria-label="last-intake"
          >
            <p className="text-base font-semibold text-brand-color">
              {`${t('medications.lastTaken')}: ${relativeLastTaken}`}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {formatDateTime(lastIntake.takenAt)}
            </p>
          </div>
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
      <div className="min-h-screen bg-gradient-to-br from-app-bg-start via-app-bg-mid to-app-bg-end flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:loading" className="text-4xl text-brand-color animate-spin mb-2" />
          <p className="text-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (activeView === 'print') {
    return (
      <PrintCards
        medications={medications}
        groups={groups}
        language={i18n.language}
        onBack={() => setActiveView('main')}
        onPrint={handlePrintCards}
      />
    );
  }

  if (activeView === 'help') {
    return <HelpPage onBack={() => setActiveView('main')} />;
  }

  return (
    <div className="min-h-screen pt-safe-area bg-gradient-to-br from-app-bg-start via-app-bg-mid to-app-bg-end">
      <div
        className={`container mx-auto px-4 pt-4 max-w-4xl ${
          showDebugUI
            ? 'pb-[calc(var(--pt-safe-bottom)+5rem)]'
            : 'pb-[calc(var(--pt-safe-bottom)+2.5rem)]'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-brand-color-soft/70 bg-gradient-to-br from-app-bg-start/95 via-app-bg-mid/95 to-app-bg-end/95 px-4 py-3 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0">
              <Icon icon="mdi:pill" className="text-3xl text-brand-color mr-0.5" />
              <h1 className="text-2xl font-bold leading-none text-brand-color">PillTracker</h1>
            </div>
            <Button
              variant="ghost"
              size="md"
              icon="mdi:dots-vertical"
              onClick={() => setShowMenu(!showMenu)}
              className="text-brand-color hover:text-brand-color-strong [&>svg]:!text-3xl"
              data-testid="menu-button"
              title={t('actions.menu')}
              aria-label="menu-button"
            />
          </div>
        </header>

        {/* Action Buttons */}
        <div className="mb-6 pt-1 flex gap-3 flex-wrap">
          <Button
            onClick={() => setShowAddMedicationForm(true)}
            className="flex-1 sm:flex-none"
            data-testid="add-medication-button"
            aria-label="add-medication-button"
          >
            <Icon icon="mdi:plus-circle" className="text-xl" />
            <span>{quickAddMedicationLabel}</span>
          </Button>
          <Button
            onClick={() => setShowAddGroupForm(true)}
            className="flex-1 sm:flex-none"
            data-testid="add-group-button"
            aria-label="add-group-button"
          >
            <Icon icon="mdi:plus-circle" className="text-xl" />
            <span>{quickAddGroupLabel}</span>
          </Button>
        </div>

        {/* Groups with their medications */}
        {groups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Icon icon="mdi:folder-multiple" className="text-brand-color" />
              {t('groups.title')}
            </h2>
            <div className="space-y-6">
              {groups.map(group => {
                const groupMedications = medications.filter(med => med.groupId === group.id);
                const ungroupedForDropdown = medications.filter(med => !med.groupId);

                return (
                  <Card key={group.id} className="p-5 bg-surface-1 border-2 border-brand-border-soft" data-testid={`group-card-${group.id}`}>
                    {/* Group Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon icon="mdi:folder" className="text-brand-color text-2xl" />
                          <h3 className="max-w-full text-xl font-bold text-text-primary break-all" data-testid="group-name">
                            {group.name}
                          </h3>
                        </div>
                        {group.description && (
                          <p className="text-sm text-text-muted mt-1 break-all" data-testid="group-notes">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-brand-color-soft text-brand-on-soft px-2 py-1 rounded">
                            {groupMedications.length} {t('medications.title')}
                          </span>
                        </div>
                      </div>

                      <div className="ml-2 flex shrink-0 items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="mdi:pencil"
                          iconClassName="!text-brand-color"
                          className="!px-1.5 !py-1 !text-brand-color hover:!text-brand-color-strong"
                          onClick={() => setEditingGroup(group)}
                          data-testid={`edit-group-${group.id}`}
                          aria-label={`edit-group-${group.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="mdi:delete"
                          iconClassName="!text-brand-color"
                          className="!px-1.5 !py-1 !text-brand-color hover:!text-brand-color-strong"
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
                          className="w-full px-3 py-2 border border-border-default rounded-control text-sm focus:ring-2 focus:ring-brand-focus focus:border-transparent"
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

                    <div className="space-y-3 pl-4 border-l-4 border-brand-border">
                      {groupMedications.length > 0 ? (
                        groupMedications.map(medication => renderMedicationCard(medication, true))
                      ) : (
                        <p className="text-sm text-text-muted italic py-4">
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
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Icon icon="mdi:pill" className="text-brand-color" />
              {t('medications.title')}
            </h2>
            <div className="space-y-4">
              {ungroupedMedications.map(medication => renderMedicationCard(medication, false))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {medications.length === 0 && (
          <Card className="p-12 text-center">
            <Icon icon="mdi:pill-off" className="text-6xl text-text-soft mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-text-secondary mb-2">
              {t('medications.empty')}
            </h3>
            <p className="text-text-muted mb-6">
              {t('medications.emptyDescription')}
            </p>
            <Button
              onClick={() => setShowAddMedicationForm(true)}
              data-testid="empty-state-add-button"
              aria-label="empty-state-add-button"
            >
              <Icon icon="mdi:plus-circle" className="text-xl" />
              <span>{quickAddMedicationLabel}</span>
            </Button>
          </Card>
        )}
      </div>

      {/* App Drawer */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowMenu(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-screen w-[86%] max-w-sm border-l border-border-subtle bg-surface-1 shadow-2xl">
            <div className="flex h-full flex-col pt-[calc(var(--pt-safe-top)+0.5rem)] pb-[calc(var(--pt-safe-bottom)+0.75rem)]">
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:menu" className="text-2xl text-brand-color" />
                  <p className="text-lg font-semibold text-text-primary">{t('actions.menu')}</p>
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
                  aria-label="close-menu"
                >
                  <Icon icon="mdi:close" className="text-2xl" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                <button
                  onClick={() => {
                    setActiveView('main');
                    setShowAddMedicationForm(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                  data-testid="menu-add-medication"
                  aria-label="menu-add-medication"
                >
                  <Icon icon="mdi:pill" className="text-2xl text-brand-color shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">+ {quickAddMedicationLabel}</p>
                    <p className="text-sm text-text-muted">{t('medications.addNew')}</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveView('main');
                    setShowAddGroupForm(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                  data-testid="menu-add-group"
                  aria-label="menu-add-group"
                >
                  <Icon icon="mdi:folder-plus" className="text-2xl text-brand-color shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">+ {quickAddGroupLabel}</p>
                    <p className="text-sm text-text-muted">{t('groups.addNew')}</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    void toggleLanguage();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                  data-testid="menu-language-toggle"
                  aria-label="menu-language-toggle"
                >
                  <Icon icon="mdi:translate" className="text-2xl text-brand-color shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">{t('actions.changeLanguage')}</p>
                    <p className="text-sm text-text-muted">{isGermanLanguage() ? 'English' : 'Deutsch'}</p>
                  </div>
                </button>

                {medications.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveView('print');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                    data-testid="menu-print-cards"
                    aria-label="menu-print-cards"
                  >
                    <Icon icon="mdi:printer" className="text-2xl text-brand-color shrink-0" />
                    <div>
                      <p className="font-medium text-text-primary">{t('actions.print')}</p>
                      <p className="text-sm text-text-muted">{t('help.printCardsHint')}</p>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-border-subtle" />

                <button
                  onClick={() => {
                    setActiveView('help');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                  data-testid="menu-help"
                  aria-label="menu-help"
                >
                  <Icon icon="mdi:help-circle-outline" className="text-2xl text-brand-color shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary">{t('actions.help')}</p>
                    <p className="text-sm text-text-muted">{t('help.subtitle')}</p>
                  </div>
                </button>

                {showDebugUI && (
                  <>
                    <div className="my-1 border-t border-border-subtle" />

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDbDebug(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                      data-testid="menu-open-db-debug"
                      aria-label="menu-open-db-debug"
                    >
                      <Icon icon="mdi:database" className="text-2xl text-brand-color shrink-0" />
                      <div>
                        <p className="font-medium text-text-primary">DB Debug</p>
                        <p className="text-sm text-text-muted">Database tools</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowNotificationsDebug(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-control hover:bg-surface-2 transition-colors text-left"
                      data-testid="menu-open-notifications-debug"
                      aria-label="menu-open-notifications-debug"
                    >
                      <Icon icon="mdi:bell-cog-outline" className="text-2xl text-brand-color shrink-0" />
                      <div>
                        <p className="font-medium text-text-primary">Notifications Debug</p>
                        <p className="text-sm text-text-muted">Notification tools</p>
                      </div>
                    </button>
                  </>
                )}
              </nav>
            </div>
          </aside>
        </>
      )}

      {showDebugUI && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-surface-inverse/95 px-4 py-2 text-text-inverse backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-center gap-6 pb-[calc(var(--pt-safe-bottom)+0.15rem)] text-sm">
            <button
              onClick={() => setShowDbDebug(true)}
              className="underline underline-offset-2 transition-colors hover:text-text-inverse-muted"
              data-testid="open-db-debug"
              aria-label="open-db-debug"
            >
              DB Debug
            </button>
            <button
              onClick={() => setShowNotificationsDebug(true)}
              className="underline underline-offset-2 transition-colors hover:text-text-inverse-muted"
              data-testid="open-notifications-debug"
              aria-label="open-notifications-debug"
            >
              Notifications
            </button>
          </div>
        </footer>
      )}

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

      {showDebugUI && showDbDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-1 rounded-modal shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-surface-1 border-b border-border-subtle px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Database Debug</h2>
              <button 
                onClick={() => setShowDbDebug(false)}
                className="text-text-muted hover:text-text-secondary"
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
      {showDebugUI && showNotificationsDebug && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-1 rounded-modal shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-surface-1 border-b border-border-subtle px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Notifications Debug</h2>
              <button 
                onClick={() => setShowNotificationsDebug(false)}
                className="text-text-muted hover:text-text-secondary"
                aria-label="notifications-debug-close"
              >
                <Icon icon="mdi:close" width={24} />
              </button>
            </div>
            <NotificationsDebug />
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
