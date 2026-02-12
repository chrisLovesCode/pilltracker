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
        className="print-card p-4 bg-surface-1 border border-border-default shadow-none"
        data-testid={`print-medication-card-${m.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:pill" className="text-brand-color-strong text-xl" />
              <h3 className="text-lg font-bold text-text-primary break-words [overflow-wrap:anywhere]">{m.name}</h3>
            </div>
            <p className="text-sm text-text-secondary mt-0.5">
              {m.dosageAmount} {m.dosageUnit}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <div className="text-text-muted">Zeit</div>
          <div className="text-text-primary font-medium flex flex-wrap gap-1">
            {Array.isArray(m.scheduleTimes) && m.scheduleTimes.length > 0 ? (
              m.scheduleTimes.map((time, index) => (
                <span key={`${m.id}-print-time-${index}`} className="inline-block px-2 py-0.5 rounded bg-surface-2 mr-1">
                  {time}
                </span>
              ))
            ) : (
              '-'
            )}
          </div>

          <div className="text-text-muted">Tage</div>
          <div className="text-text-primary font-medium">
            {Array.isArray(m.scheduleDays) ? formatScheduleDaysArray(m.scheduleDays) : formatScheduleDays(m.scheduleDays as any)}
          </div>

          {lastIntake && (
            <>
              <div className="text-text-muted">Zuletzt</div>
              <div className="text-text-primary font-semibold">
                {formatDateTime(language, lastIntake.takenAt)}
              </div>
            </>
          )}
        </div>

        {m.notes && (
          <div className="mt-3 text-sm text-text-secondary border-t border-border-subtle pt-2">
            <div className="text-text-muted text-xs mb-1">Notizen</div>
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.notes}</div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="print-root min-h-screen pt-safe-area bg-surface-1 text-black">
      <div className="no-print sticky top-0 z-50 bg-surface-1/90 backdrop-blur border-b border-border-subtle">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Icon icon="mdi:printer" className="text-2xl text-text-primary" />
            <div className="min-w-0">
              <div className="font-semibold text-text-primary break-words [overflow-wrap:anywhere]" data-testid="print-title">
                Drucken: Medikamentekarten
              </div>
              <div className="text-xs text-text-muted break-words [overflow-wrap:anywhere]">
                Tipp: Im Druckdialog direkt drucken oder speichern.
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
              size="sm"
              className="px-2"
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
                  <div className="text-sm uppercase tracking-wide text-text-muted">Gruppe</div>
                  <div className="text-2xl font-bold text-text-primary break-words [overflow-wrap:anywhere]">{group.name}</div>
                  {group.description && <div className="text-sm text-text-muted mt-1 break-words [overflow-wrap:anywhere]">{group.description}</div>}
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
              <div className="text-sm uppercase tracking-wide text-text-muted">Ohne Gruppe</div>
              <div className="text-2xl font-bold text-text-primary">Medikamente</div>
            </div>
            <div className="print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ungrouped.map(renderMedicationCard)}
            </div>
          </div>
        )}

        {medications.length === 0 && (
          <div className="py-20 text-center text-text-secondary" data-testid="print-empty">
            Keine Medikamente vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
