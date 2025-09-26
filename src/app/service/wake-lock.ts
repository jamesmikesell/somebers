import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLock {

  private LOGGING_ENABLED = false;

  private wakeLock: WakeLockSentinel | null = null;
  private retryTimer: number | null = null;
  private isEnabled = false;


  async enable(): Promise<void> {
    this.log('WakeLockService: enable() called');
    this.isEnabled = true;
    await this.acquireLock();
  }


  disable(): void {
    this.log('WakeLockService: disable() called');
    this.isEnabled = false;
    this.clearRetryTimer();
    this.releaseLock();
    this.log('WakeLockService: disabled');
  }


  private async acquireLock(): Promise<void> {
    if (!this.isEnabled || this.wakeLock) {
      this.log('WakeLockService: acquireLock() skipped - enabled:', this.isEnabled, 'hasLock:', !!this.wakeLock);
      return;
    }

    this.log('WakeLockService: attempting to acquire wake lock');
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.log('WakeLockService: wake lock acquired successfully');
      this.wakeLock.addEventListener('release', () => {
        this.log('WakeLockService: wake lock released');
        this.wakeLock = null;
        if (this.isEnabled) {
          this.log('WakeLockService: wake lock lost while enabled, scheduling retry');
          this.scheduleRetry();
        }
      });
    } catch (error) {
      this.log('WakeLockService: failed to acquire wake lock:', error);
      if (this.isEnabled) {
        this.log('WakeLockService: scheduling retry after failure');
        this.scheduleRetry();
      }
    }
  }


  private scheduleRetry(): void {
    this.log('WakeLockService: scheduling retry in 5 seconds');
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.log('WakeLockService: retry timer triggered');
      this.acquireLock();
    }, 5000);
  }


  private clearRetryTimer(): void {
    if (this.retryTimer) {
      this.log('WakeLockService: clearing retry timer');
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }


  private releaseLock(): void {
    if (this.wakeLock) {
      this.log('WakeLockService: manually releasing wake lock');
      this.wakeLock.release();
      this.wakeLock = null;
    } else {
      this.log('WakeLockService: releaseLock() called but no lock exists');
    }
  }


  private log(...data: any[]): void {
    if (this.LOGGING_ENABLED)
      console.log(...data);
  }

}
