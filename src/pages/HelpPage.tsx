import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui';

type HelpPageProps = {
  onBack: () => void;
};

export default function HelpPage({ onBack }: HelpPageProps) {
  const { t } = useTranslation();

  const sections = [
    { icon: 'mdi:pill', titleKey: 'help.sections.addMedication.title', bodyKey: 'help.sections.addMedication.body' },
    { icon: 'mdi:folder-plus', titleKey: 'help.sections.groups.title', bodyKey: 'help.sections.groups.body' },
    { icon: 'mdi:bell-outline', titleKey: 'help.sections.reminders.title', bodyKey: 'help.sections.reminders.body' },
    { icon: 'mdi:gesture-swipe-right', titleKey: 'help.sections.track.title', bodyKey: 'help.sections.track.body' },
    { icon: 'mdi:alarm', titleKey: 'help.sections.due.title', bodyKey: 'help.sections.due.body' },
    { icon: 'mdi:timeline-clock-outline', titleKey: 'help.sections.dueProgress.title', bodyKey: 'help.sections.dueProgress.body' },
    { icon: 'mdi:history', titleKey: 'help.sections.lastTaken.title', bodyKey: 'help.sections.lastTaken.body' },
  ] as const;

  return (
    <div className="min-h-screen pt-safe-area bg-gradient-to-br from-app-bg-start via-app-bg-mid to-app-bg-end">
      <div className="container mx-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] max-w-4xl">
        <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-brand-color-soft/70 bg-gradient-to-br from-app-bg-start/95 via-app-bg-mid/95 to-app-bg-end/95 px-4 py-3 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-brand-color break-words [overflow-wrap:anywhere]" data-testid="help-title">
                {t('help.title')}
              </h1>
              <p className="text-content-muted text-text-muted break-words [overflow-wrap:anywhere]">
                {t('help.subtitle')}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon="mdi:arrow-left"
              onClick={onBack}
              data-testid="help-back"
              aria-label="help-back"
            >
              {t('actions.back')}
            </Button>
          </div>
        </header>

        <Card className="mb-4 p-5 border border-brand-border-soft bg-surface-1/95">
          <p className="text-content text-text-secondary leading-relaxed break-words [overflow-wrap:anywhere]">
            {t('help.intro')}
          </p>
        </Card>

        <div className="space-y-4">
          {sections.map(section => (
            <Card key={section.titleKey} className="p-5 border border-border-subtle bg-surface-1/95">
              <div className="flex items-start gap-3">
                <Icon icon={section.icon} className="text-2xl text-brand-color mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-text-primary break-words [overflow-wrap:anywhere]">
                    {t(section.titleKey)}
                  </h2>
                  <p className="mt-1 text-content text-text-secondary leading-relaxed break-words [overflow-wrap:anywhere]">
                    {t(section.bodyKey)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <footer
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-color-soft/70 bg-gradient-to-br from-app-bg-start/95 via-app-bg-mid/95 to-app-bg-end/95 px-4 py-2 text-center text-text-muted backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        <p className="text-content-muted leading-tight">v{__APP_VERSION__}</p>
        <p className="text-[11px] leading-tight">Build {__BUILD_HASH__}</p>
      </footer>
    </div>
  );
}
