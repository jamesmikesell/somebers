import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private hasPromptBeenShown = false;

  readonly canInstall$ = new BehaviorSubject<boolean>(false);
  readonly installInProgress$ = new BehaviorSubject<boolean>(false);
  readonly installError$ = new BehaviorSubject<string | null>(null);
  readonly installOutcome$ = new BehaviorSubject<'accepted' | 'dismissed' | null>(null);
  readonly isInstalled$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    try {
      // Set initial installed state
      this.updateInstalledState();

      // Listen for beforeinstallprompt
      window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt.bind(this));

      // Listen for app installed
      window.addEventListener('appinstalled', this.onAppInstalled.bind(this));

      // Listen for display mode changes
      this.setupDisplayModeListener();

      // Check if we can install (for browsers that might have the API but no event yet)
      this.checkInstallability();

    } catch (error) {
      console.error('pwa-install: initialization failed', error);
    }
  }

  private onBeforeInstallPrompt(event: Event): void {
    try {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall$.next(true);
    } catch (error) {
      console.error('pwa-install: beforeinstallprompt handler failed', error);
    }
  }

  private onAppInstalled(): void {
    try {
      this.installOutcome$.next('accepted');
      this.canInstall$.next(false);
      this.deferredPrompt = null;
      this.installInProgress$.next(false);
      this.updateInstalledState();
    } catch (error) {
      console.error('pwa-install: appinstalled handler failed', error);
    }
  }

  private setupDisplayModeListener(): void {
    try {
      if (!window.matchMedia) return;

      const mql = window.matchMedia('(display-mode: standalone)');
      const updateHandler = () => this.updateInstalledState();

      // Modern browsers
      if (mql.addEventListener) {
        mql.addEventListener('change', updateHandler);
      }
      // Legacy browsers
      else if (mql.addListener) {
        mql.addListener(updateHandler);
      }
    } catch (error) {
      console.error('pwa-install: display mode listener setup failed', error);
    }
  }

  private checkInstallability(): void {
    // Some browsers might support installation but the beforeinstallprompt
    // event hasn't fired yet. We can do some basic checks.
    try {
      // Check if we're already installed
      if (this.computeInstalled()) {
        this.canInstall$.next(false);
        return;
      }
    } catch (error) {
      console.error('pwa-install: installability check failed', error);
    }
  }

  private updateInstalledState(): void {
    const isInstalled = this.computeInstalled();
    this.isInstalled$.next(isInstalled);

    // If installed, we can't install again
    if (isInstalled) {
      this.canInstall$.next(false);
    }
  }

  private computeInstalled(): boolean {
    try {
      // Check standalone display mode
      const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true;

      // Check iOS standalone
      const isIOSStandalone = this.isIOSStandalone();

      // Check if launched from home screen (additional check for some Android browsers)
      const isHomeScreen = window.matchMedia?.('(display-mode: minimal-ui)')?.matches === true;

      return isStandalone || isIOSStandalone || isHomeScreen;
    } catch (error) {
      console.error('pwa-install: installed state computation failed', error);
      return false;
    }
  }

  private isIOSStandalone(): boolean {
    try {
      return (navigator as any).standalone === true;
    } catch {
      return false;
    }
  }

  async promptInstall(): Promise<void> {
    // Reset state
    this.installError$.next(null);
    this.installOutcome$.next(null);

    const prompt = this.deferredPrompt;
    if (!prompt) {
      this.installError$.next('Installation not available');
      return;
    }

    // Prevent multiple simultaneous prompts
    if (this.hasPromptBeenShown) {
      this.installError$.next('Installation prompt already shown');
      return;
    }

    this.installInProgress$.next(true);
    this.hasPromptBeenShown = true;

    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;

      const outcome = choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      this.installOutcome$.next(outcome);

      // Clean up
      this.deferredPrompt = null;
      if (outcome === 'accepted') {
        this.canInstall$.next(false);
      }

    } catch (error) {
      console.error('pwa-install: prompt failed', error);
      this.installError$.next(
        error instanceof Error ? error.message : 'Installation failed. Please try again later.'
      );
    } finally {
      this.installInProgress$.next(false);
      // Reset the prompt flag after a delay to allow for retry if needed
      setTimeout(() => {
        this.hasPromptBeenShown = false;
      }, 1000);
    }
  }

  // Utility method to check if PWA installation is theoretically supported
  isPWASupported(): boolean {
    try {
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = document.querySelector('link[rel="manifest"]');
      return hasServiceWorker && !!hasManifest;
    } catch {
      return false;
    }
  }

  // Method to manually refresh installability state
  refreshInstallabilityState(): void {
    this.updateInstalledState();
    this.checkInstallability();
  }
}

// Enhanced type definition
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}