import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private hasUserInteracted = false;

  async enable(): Promise<boolean> {
    if (!navigator.wakeLock)
      return false;

    // If no user interaction yet, wait for it
    if (!this.hasUserInteracted) {
      this.waitForUserInteraction();
      return false;
    }

    return this.request();
  }

  async disable(): Promise<void> {
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }

  private async request(): Promise<boolean> {
    try {
      this.sentinel = await navigator.wakeLock.request('screen');

      // Auto-reacquire when page becomes visible again
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        if (document.visibilityState === 'visible') {
          this.request();
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  private waitForUserInteraction(): void {
    const handleInteraction = () => {
      this.hasUserInteracted = true;
      this.request();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
  }
}