import { Capacitor, registerPlugin } from '@capacitor/core';

type PrintPlugin = {
  printCurrent(options?: { jobName?: string }): Promise<void>;
};

const Print = registerPlugin<PrintPlugin>('Print');

export async function printCurrentView(jobName: string = 'PillTracker'): Promise<void> {
  // Web fallback: show browser print dialog.
  if (!Capacitor.isNativePlatform()) {
    window.print();
    return;
  }

  // Only Android is supported (custom plugin).
  if (Capacitor.getPlatform() !== 'android') {
    window.print();
    return;
  }

  // Native: use Android Print Framework via custom plugin.
  await Print.printCurrent({ jobName });
}
