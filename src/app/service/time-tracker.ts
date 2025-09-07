import { Subject } from 'rxjs';



export class TimeTracker {
  private startTime: number | null = null;
  private cumulativeTime = 0;
  private manuallyPaused = false;

  private readonly browserStateSubject = new Subject<{
    active: boolean;
    reason: ReasonType;
    at: number; // timestamp
  }>();

  readonly browserState$ = this.browserStateSubject.asObservable();


  constructor() {
    this.init();
  }


  /** Get the total cumulative view time in milliseconds */
  getTotalTime(): number {
    let totalTime = this.cumulativeTime;
    if (this.startTime)
      totalTime += Date.now() - this.startTime;

    return totalTime;
  }


  reset(cumulative = 0): void {
    this.manualPause();
    this.cumulativeTime = cumulative;
  }


  isTracking(): boolean {
    return !!this.startTime;
  }


  manualStart(): void {
    this.manuallyPaused = false;
    if (!document.hidden) {
      if (this.doStart())
        this.emitBrowser(true, "manualStart");
    }
  }


  manualPause(): void {
    this.manuallyPaused = true;
    if (this.doPause())
      this.emitBrowser(false, "manualPause");
  }


  destroy(): void {
    if (this.doPause())
      this.emitBrowser(false, "destroy");

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('beforeunload', this.onPageUnload);
    window.removeEventListener('pagehide', this.onPageUnload);
  }


  private init(): void {
    if (!document.hidden) {
      if (this.doStart())
        this.emitBrowser(true, 'init');
    }

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('beforeunload', this.onPageUnload);
    window.addEventListener('pagehide', this.onPageUnload);
  }


  private readonly onVisibilityChange = () => {
    if (document.hidden) {
      if (this.doPause())
        this.emitBrowser(false, 'hidden');
    } else {
      if (this.doStart())
        this.emitBrowser(true, 'visible');
    }
  };


  private readonly onPageUnload = (ev: Event) => {
    const reason = (ev?.type === 'pagehide' ? 'pagehide' : 'beforeunload') as
      | 'pagehide'
      | 'beforeunload';
    if (this.doPause())
      this.emitBrowser(false, reason);
  };


  private emitBrowser(active: boolean, reason: ReasonType) {
    this.browserStateSubject.next({ active, reason, at: Date.now() });
  }


  private doStart(): boolean {
    if (this.manuallyPaused)
      return false;

    if (!this.startTime) {
      this.startTime = Date.now();
      return true;
    }
    return false;
  }

  private doPause(): boolean {
    if (this.startTime) {
      this.cumulativeTime += Date.now() - this.startTime;
      this.startTime = null;
      return true;
    }
    return false;
  }
}


type ReasonType = 'init' | 'visible' | 'hidden' | 'pagehide' | 'beforeunload' | 'destroy' | 'manualPause' | 'manualStart';