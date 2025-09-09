import { Component, OnDestroy, OnInit } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../material-imports';

@Component({
  selector: 'app-install',
  standalone: true,
  exportAs: 'appInstall',
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './install.component.html',
  styleUrls: ['./install.component.scss'],
})
export class InstallComponent implements OnInit, OnDestroy {
  // Public so host templates can read when using exportAs
  canInstall = false;
  installInProgress = false;
  installError: string | null = null;
  installOutcome: 'accepted' | 'dismissed' | null = null;
  isInstalled = false;

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private beforeInstallHandler?: (e: Event) => void;
  private appInstalledHandler?: () => void;
  private displayModeMql?: MediaQueryList;
  private displayModeListener?: (ev: MediaQueryListEvent) => void;

  ngOnInit(): void {
    try {
      this.isInstalled = this.computeInstalled();

      this.beforeInstallHandler = (event: Event) => {
        try {
          (event as any).preventDefault?.();
        } catch {}
        this.deferredPrompt = event as BeforeInstallPromptEvent;
        this.canInstall = true;
      };

      this.appInstalledHandler = () => {
        this.installOutcome = 'accepted';
        this.canInstall = false;
        this.deferredPrompt = null;
        this.installInProgress = false;
        this.isInstalled = true;
      };

      window.addEventListener(
        'beforeinstallprompt',
        this.beforeInstallHandler as EventListener,
      );
      window.addEventListener('appinstalled', this.appInstalledHandler);

      if (window.matchMedia) {
        this.displayModeMql = window.matchMedia('(display-mode: standalone)');
        const handler = (e: MediaQueryListEvent) => {
          this.isInstalled = e.matches || this.isIOSStandalone();
        };
        this.displayModeListener = handler;
        this.displayModeMql.addEventListener?.('change', handler);
      }
    } catch (error) {
      console.error('install: init failed', error);
    }
  }

  ngOnDestroy(): void {
    try {
      if (this.beforeInstallHandler)
        window.removeEventListener(
          'beforeinstallprompt',
          this.beforeInstallHandler as EventListener,
        );
      if (this.appInstalledHandler)
        window.removeEventListener('appinstalled', this.appInstalledHandler);
      if (this.displayModeMql && this.displayModeListener)
        this.displayModeMql.removeEventListener?.(
          'change',
          this.displayModeListener,
        );
    } catch (error) {
      console.error('install: cleanup failed', error);
    }
  }

  async installPWA(): Promise<void> {
    this.installError = null;
    this.installOutcome = null;
    const prompt = this.deferredPrompt;
    if (!prompt) return;

    this.installInProgress = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      this.installOutcome =
        choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      this.deferredPrompt = null;
      if (this.installOutcome === 'accepted') this.canInstall = false;
    } catch (error) {
      console.error('install: prompt failed', error);
      this.installError =
        (error as Error)?.message || 'Install failed. Please try again later.';
    } finally {
      this.installInProgress = false;
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

