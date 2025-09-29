import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLock {

  private LOGGING_ENABLED = false;

  private wakeLock: WakeLockSentinel | null = null;
  private retryTimer: number | null = null;
  private isEnabled = false;
  private isAcquiring = false;


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
    if (!this.isEnabled || this.wakeLock || this.isAcquiring) {
      this.log('WakeLockService: acquireLock() skipped - enabled:', this.isEnabled, 'hasLock:', !!this.wakeLock, 'isAcquiring:', this.isAcquiring);
      return;
    }

    this.isAcquiring = true;
    this.log('WakeLockService: attempting to acquire wake lock');

    try {
      const lock = await navigator.wakeLock.request('screen');

      // Double-check we still want the lock after the async operation
      if (!this.isEnabled) {
        this.log('WakeLockService: disabled during acquisition, releasing immediately');
        lock.release();
        return;
      }

      // Check if another lock was somehow acquired while we were waiting
      if (this.wakeLock) {
        this.log('WakeLockService: another lock exists, releasing new one');
        lock.release();
        return;
      }

      this.wakeLock = lock;
      this.log('WakeLockService: wake lock acquired successfully');

      this.wakeLock.addEventListener('release', () => {
        this.log('WakeLockService: wake lock released');
        // Only clear if this is still our current lock
        if (this.wakeLock === lock) {
          this.wakeLock = null;
        }

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
    } finally {
      this.isAcquiring = false;
    }
  }


  private scheduleRetry(): void {
    if (this.retryTimer) {
      this.log('WakeLockService: retry already scheduled');
      return;
    }

    this.log('WakeLockService: scheduling retry in 5 seconds');
    this.retryTimer = setTimeout(() => {
      this.log('WakeLockService: retry timer triggered');
      this.retryTimer = null; // Clear before acquiring to allow future retries
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