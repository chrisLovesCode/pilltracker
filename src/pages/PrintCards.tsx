import { Icon } from '@iconify/react';
import { Button, Card } from '../components/ui';
import type { Group, Medication } from '../types';

type Props = {
  medications: Medication[];
  groups: Group[];
  language: string;
  onBack: () => void;
  onPrint: () => void;
};

function formatDateTime(language: string, dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatScheduleDays(scheduleDays: string | null | undefined) {
  // Kept for backwards compatibility if older DB rows exist.
  if (!scheduleDays) return '-';
  const days = scheduleDays.split(',').map(s => s.trim()).filter(Boolean);
  if (days.length === 0) return '-';
  return days.join(', ');
}

function formatScheduleDaysArray(scheduleDays: number[] | null | undefined) {
  if (!scheduleDays || scheduleDays.length === 0) return '-';
  // 0=Sunday ... 6=Saturday
  const labels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const uniqueSorted = Array.from(new Set(scheduleDays)).sort((a, b) => a - b);
  return uniqueSorted.map(d => labels[d] ?? String(d)).join(', ');
}

export default function PrintCards(props: Props) {
  const { medications, groups, language, onBack, onPrint } = props;

  const ungrouped = medications.filter(m => !m.groupId);
  const grouped = groups
    .map(g => ({ group: g, meds: medications.filter(m => m.groupId === g.id) }))
    .filter(x => x.meds.length > 0);

  const renderMedicationCard = (m: Medication) => {
    const lastIntake = m.intakes && m.intakes.length > 0 ? m.intakes[0] : null;

    return (
      <Card
        key={m.id}
        className="print-card p-4 bg-white border border-gray-300 shadow-none"
        data-testid={`print-medication-card-${m.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:pill" className="text-indigo-700 text-xl" />
              <h3 className="text-lg font-bold text-gray-900 truncate">{m.name}</h3>
            </div>
            <p className="text-sm text-gray-700 mt-0.5">
              {m.dosageAmount} {m.dosageUnit}
            </p>
          </div>
          {m.enableNotifications && (
            <div className="shrink-0 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              Notifications
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <div className="text-gray-500">Zeit</div>
          <div className="text-gray-900 font-medium">
            {Array.isArray(m.scheduleTimes) && m.scheduleTimes.length > 0 ? m.scheduleTimes.join(', ') : '-'}
          </div>

          <div className="text-gray-500">Tage</div>
          <div className="text-gray-900 font-medium">
            {Array.isArray(m.scheduleDays) ? formatScheduleDaysArray(m.scheduleDays) : formatScheduleDays(m.scheduleDays as any)}
          </div>

          {lastIntake && (
            <>
              <div className="text-gray-500">Zuletzt</div>
              <div className="text-gray-900 font-semibold">
                {formatDateTime(language, lastIntake.takenAt)}
              </div>
            </>
          )}
        </div>

        {m.notes && (
          <div className="mt-3 text-sm text-gray-700 border-t border-gray-200 pt-2">
            <div className="text-gray-500 text-xs mb-1">Notizen</div>
            <div className="whitespace-pre-wrap">{m.notes}</div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="print-root min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:printer" className="text-2xl text-gray-900" />
            <div>
              <div className="font-semibold text-gray-900" data-testid="print-title">
                Drucken: Medikamentekarten
              </div>
              <div className="text-xs text-gray-500">
                Tipp: Im Druckdialog auf “Als PDF speichern” oder direkt drucken.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon="mdi:arrow-left"
              onClick={onBack}
              data-testid="print-back"
              aria-label="print-back"
            >
              Zuruck
            </Button>
            <Button
              icon="mdi:printer"
              onClick={onPrint}
              data-testid="print-cards-button"
              aria-label="print-cards-button"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {grouped.length > 0 && (
          <div className="mb-6">
            {grouped.map(({ group, meds }) => (
              <div key={group.id} className="mb-8">
                <div className="mb-3">
                  <div className="text-sm uppercase tracking-wide text-gray-500">Gruppe</div>
                  <div className="text-2xl font-bold text-gray-900">{group.name}</div>
                  {group.description && <div className="text-sm text-gray-600 mt-1">{group.description}</div>}
                </div>
                <div className="print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {meds.map(renderMedicationCard)}
                </div>
              </div>
            ))}
          </div>
        )}

        {ungrouped.length > 0 && (
          <div>
            <div className="mb-3">
              <div className="text-sm uppercase tracking-wide text-gray-500">Ohne Gruppe</div>
              <div className="text-2xl font-bold text-gray-900">Medikamente</div>
            </div>
            <div className="print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ungrouped.map(renderMedicationCard)}
            </div>
          </div>
        )}

        {medications.length === 0 && (
          <div className="py-20 text-center text-gray-700" data-testid="print-empty">
            Keine Medikamente vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
