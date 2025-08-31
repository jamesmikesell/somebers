import Hammer from 'hammerjs';
import { Observable, Subject } from "rxjs";


export class HammerImplementation {

  private touchStartSubject = new Subject<void>();
  private allGesturesCompleteSubject = new Subject<void>();
  private swipeUpSubject = new Subject<void>();
  private swipeDownSubject = new Subject<void>();
  private tapSubject = new Subject<void>();
  private doubleTapSubject = new Subject<void>();
  private longPressSubject = new Subject<void>();


  public readonly touchStart$: Observable<void>;
  public readonly allGesturesComplete$: Observable<void>;
  public readonly swipeUp$: Observable<void>;
  public readonly swipeDown$: Observable<void>;
  public readonly tap$: Observable<void>;
  public readonly doubleTap$: Observable<void>;
  public readonly longPress$: Observable<void>;

  private hammer: HammerManager;



  constructor(element: HTMLElement) {
    this.touchStart$ = this.touchStartSubject.asObservable();
    this.allGesturesComplete$ = this.allGesturesCompleteSubject.asObservable();
    this.swipeUp$ = this.swipeUpSubject.asObservable();
    this.swipeDown$ = this.swipeDownSubject.asObservable();
    this.tap$ = this.tapSubject.asObservable();
    this.doubleTap$ = this.doubleTapSubject.asObservable();
    this.longPress$ = this.longPressSubject.asObservable();



    this.hammer = new Hammer.Manager(element);

    let tapIntervalMs = 800;
    let tapCount = 0
    let tapTimer: number
    this.hammer.add(new Hammer.Tap({ event: 'tap', taps: 1 }));
    this.hammer.on('tap', (event) => {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          this.tapSubject.next();
          tapCount = 0;
        }, tapIntervalMs);
      } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        this.doubleTapSubject.next();
        tapCount = 0;
      }
    });

    this.hammer.add(new Hammer.Swipe({
      event: 'swipe',
      direction: Hammer.DIRECTION_VERTICAL,
      threshold: 20,
      velocity: 0.15
    }));
    this.hammer.add(new Hammer.Press({ event: 'press', time: 1 }));

    let gestureEndTimeout: any;
    this.hammer.on('hammer.input', (event: HammerInput) => {
      if (gestureEndTimeout)
        clearTimeout(gestureEndTimeout);

      if (event.eventType === Hammer.INPUT_END || event.eventType === Hammer.INPUT_CANCEL) {
        // Wait a brief moment to ensure all gesture recognition is complete
        // The delay accounts for double-tap recognition time
        gestureEndTimeout = setTimeout(() => {
          // All gestures are now guaranteed to be finished
          this.allGesturesCompleteSubject.next();
        }, tapIntervalMs);
      }
    });

    // Your existing gesture handlers...
    this.hammer.on('swipeup', (event: HammerInput) => {
      this.swipeUpSubject.next();
    });

    this.hammer.on('swipedown', (event: HammerInput) => {
      this.swipeDownSubject.next();
    });

    this.hammer.on('press', (event: HammerInput) => {
      this.touchStartSubject.next();
    });
  }


  destroy(): void {
    if (this.hammer)
      this.hammer.destroy();
  }

}