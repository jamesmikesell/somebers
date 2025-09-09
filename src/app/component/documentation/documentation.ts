import { Component, OnDestroy, OnInit } from '@angular/core';
import { AppVersion } from '../../app-version';
import { Title } from '../title/title';
import { MATERIAL_IMPORTS } from '../../material-imports';

@Component({
  selector: 'app-documentation',
  imports: [Title, ...MATERIAL_IMPORTS],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
})
export class Documentation implements OnInit, OnDestroy {
  AppVersion = AppVersion;

  // PWA install UI state
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
      // Detect if already running in standalone/app mode
      this.isInstalled = this.computeInstalled();

      this.beforeInstallHandler = (event: Event) => {
        // Keep the install prompt under our control
        try {
          (event as any).preventDefault?.();
        } catch (err) {
          // ignore missing preventDefault on some browsers
        }
        this.deferredPrompt = event as BeforeInstallPromptEvent;
        this.canInstall = true;
      };

      this.appInstalledHandler = () => {
        this.installOutcome = 'accepted';
        this.canInstall = false;
        this.deferredPrompt = null;
        this.installInProgress = false;
      };

      window.addEventListener(
        'beforeinstallprompt',
        this.beforeInstallHandler as EventListener,
      );
      window.addEventListener('appinstalled', this.appInstalledHandler);

      // Track changes to display-mode (e.g., when launched as installed app)
      if (window.matchMedia) {
        this.displayModeMql = window.matchMedia('(display-mode: standalone)');
        const handler = (e: MediaQueryListEvent) => {
          this.isInstalled = e.matches || this.isIOSStandalone();
        };
        this.displayModeListener = handler;
        this.displayModeMql.addEventListener?.('change', handler);
      }
    } catch (error) {
      console.error('docs: init install UI failed', error);
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
      if (this.displayModeMql && this.displayModeListener) {
        this.displayModeMql.removeEventListener?.(
          'change',
          this.displayModeListener,
        );
      }
    } catch (error) {
      console.error('docs: cleanup listeners failed', error);
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
      // Clear the saved prompt; Chrome only lets you prompt once.
      this.deferredPrompt = null;
      if (this.installOutcome === 'accepted') this.canInstall = false;
    } catch (error) {
      console.error('docs: install prompt failed', error);
      this.installError =
        (error as Error)?.message ||
        'Install failed. Please try the steps below.';
    } finally {
      this.installInProgress = false;
    }
  }

  private computeInstalled(): boolean {
    // Standard PWA standalone detection
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    return standalone || this.isIOSStandalone();
  }

  private isIOSStandalone(): boolean {
    // iOS Safari exposes navigator.standalone when launched from home screen
    return (navigator as any).standalone === true;
  }
}

// Minimal type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}
