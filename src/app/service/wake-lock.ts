import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WakeLock {

  screenWakeLocked = false;

  private sentinel: WakeLockSentinel | null = null;
  private wakeLockRequested = false;
  private wakeLockRefreshTimer: number;


  enable(): void {
    this.wakeLockRequested = true;
    this.wakeLockInternal();
  }


  private wakeLockInternal(): void {
    this.clearRefreshTimer();

    if (!this.wakeLockRequested)
      return;

    let response = navigator.wakeLock.request('screen');
    response.then((result) => {
      // console.log("wake locked");
      this.screenWakeLocked = true;
      this.sentinel = result;

      result.onrelease = () => {
        // console.log("wake lock released");
        this.screenWakeLocked = false;
        this.tryWakeLock();
      };
    }).catch(err => {
      // console.log("wake lock error", err);
      this.screenWakeLocked = false;
      this.tryWakeLock();
    });
  }


  async disable(): Promise<void> {
    // console.log("wake lock disabled")
    this.clearRefreshTimer()
    this.wakeLockRequested = false;
    if (this.sentinel) {
      await this.sentinel.release();
      this.sentinel = null;
    }
  }


  private clearRefreshTimer(): void {
    // console.log("refresh timer canceled")
    clearTimeout(this.wakeLockRefreshTimer)
  }


  private tryWakeLock(): void {
    // console.log("will try wake lock in 5 seconds")
    this.wakeLockRefreshTimer = setTimeout(() => {
      if (this.wakeLockRequested)
        this.enable();
    }, 5000);
  }
}
