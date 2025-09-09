import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall$ = new BehaviorSubject<boolean>(false);
  readonly installInProgress$ = new BehaviorSubject<boolean>(false);
  readonly installError$ = new BehaviorSubject<string | null>(null);
  readonly installOutcome$ = new BehaviorSubject<'accepted' | 'dismissed' | null>(null);
  readonly isInstalled$ = new BehaviorSubject<boolean>(this.computeInstalled());

  constructor() {
    try {
      window.addEventListener('beforeinstallprompt', (event: Event) => {
        try {
          (event as any).preventDefault?.();
        } catch {}
        this.deferredPrompt = event as BeforeInstallPromptEvent;
        this.canInstall$.next(true);
      });

      window.addEventListener('appinstalled', () => {
        this.installOutcome$.next('accepted');
        this.canInstall$.next(false);
        this.deferredPrompt = null;
        this.installInProgress$.next(false);
        this.isInstalled$.next(true);
      });

      const mql = window.matchMedia?.('(display-mode: standalone)');
      const updateInstalled = () =>
        this.isInstalled$.next(mql?.matches === true || this.isIOSStandalone());
      try {
        mql?.addEventListener?.('change', updateInstalled as any);
      } catch {}
    } catch (error) {
      console.error('pwa-install: init failed', error);
    }
  }

  async promptInstall(): Promise<void> {
    this.installError$.next(null);
    this.installOutcome$.next(null);
    const prompt = this.deferredPrompt;
    if (!prompt) return;

    this.installInProgress$.next(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      const outcome = choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      this.installOutcome$.next(outcome);
      this.deferredPrompt = null;
      if (outcome === 'accepted') this.canInstall$.next(false);
    } catch (error) {
      console.error('pwa-install: prompt failed', error);
      this.installError$.next(
        (error as Error)?.message || 'Install failed. Please try again later.',
      );
    } finally {
      this.installInProgress$.next(false);
    }
  }

  private computeInstalled(): boolean {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    return standalone || this.isIOSStandalone();
  }

  private isIOSStandalone(): boolean {
    return (navigator as any).standalone === true;
  }
}

// Minimal type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

