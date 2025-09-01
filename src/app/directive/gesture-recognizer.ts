import { Observable, Subject, fromEvent, merge, timer } from 'rxjs';
import { takeUntil, filter, map, tap } from 'rxjs/operators';


export class GestureRecognizer {
  private element: HTMLElement;
  private config: Required<GestureConfig>;
  private destroy$ = new Subject<void>();

  // Gesture subjects
  private touchStartSubject = new Subject<GestureEvent>();
  private allGesturesCompleteSubject = new Subject<GestureEvent>();
  private swipeUpSubject = new Subject<GestureEvent>();
  private swipeDownSubject = new Subject<GestureEvent>();
  private tapSubject = new Subject<GestureEvent>();
  private doubleTapSubject = new Subject<GestureEvent>();
  private longPressSubject = new Subject<GestureEvent>();

  // State management
  private isPointerDown = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private longPressTimer: number | null = null;
  private gestureRecognized = false;
  private lastTapEndTime = 0;
  private lastTapStartPoint: Point | null = null;
  private pendingTap: GestureEvent | null = null;
  private doubleTapTimer: number | null = null;

  // Public observables
  public readonly touchStart$: Observable<GestureEvent>;
  public readonly allGesturesComplete$: Observable<GestureEvent>;
  public readonly swipeUp$: Observable<GestureEvent>;
  public readonly swipeDown$: Observable<GestureEvent>;
  public readonly tap$: Observable<GestureEvent>;
  public readonly doubleTap$: Observable<GestureEvent>;
  public readonly longPress$: Observable<GestureEvent>;

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;

    // Set default configuration
    this.config = {
      minSwipeDistance: config.minSwipeDistance ?? 50,
      maxSwipeDuration: config.maxSwipeDuration ?? 300,
      maxTapDuration: config.maxTapDuration ?? 200,
      maxTapMovement: config.maxTapMovement ?? 10,
      maxDoubleTapInterval: config.maxDoubleTapInterval ?? 300,
      maxDoubleTapDistance: config.maxDoubleTapDistance ?? 20,
      minLongPressDuration: config.minLongPressDuration ?? 500,
      maxLongPressMovement: config.maxLongPressMovement ?? 15,
    };

    // Initialize observables
    this.touchStart$ = this.touchStartSubject.asObservable();
    this.allGesturesComplete$ = this.allGesturesCompleteSubject.asObservable();
    this.swipeUp$ = this.swipeUpSubject.asObservable();
    this.swipeDown$ = this.swipeDownSubject.asObservable();
    this.tap$ = this.tapSubject.asObservable();
    this.doubleTap$ = this.doubleTapSubject.asObservable();
    this.longPress$ = this.longPressSubject.asObservable();

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Mouse events - need to listen on document for mousemove and mouseup to handle dragging
    const mouseDown$ = fromEvent<MouseEvent>(this.element, 'mousedown');
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');

    // Touch events
    const touchStart$ = fromEvent<TouchEvent>(this.element, 'touchstart');
    const touchMove$ = fromEvent<TouchEvent>(this.element, 'touchmove');
    const touchEnd$ = fromEvent<TouchEvent>(this.element, 'touchend');

    // Unified start events - filter out right-click
    const startEvents$ = merge(
      mouseDown$.pipe(
        filter(e => e.button !== 2),
        map(e => ({ type: 'mouse', event: e }))
      ),
      touchStart$.pipe(map(e => ({ type: 'touch', event: e })))
    );

    // Unified move events
    const moveEvents$ = merge(
      mouseMove$.pipe(map(e => ({ type: 'mouse', event: e }))),
      touchMove$.pipe(map(e => ({ type: 'touch', event: e })))
    );

    // Unified end events
    const endEvents$ = merge(
      mouseUp$.pipe(map(e => ({ type: 'mouse', event: e }))),
      touchEnd$.pipe(map(e => ({ type: 'touch', event: e })))
    );

    // Handle start events
    startEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ type, event }) => {
        this.handleStart(type, event as MouseEvent | TouchEvent);
      });

    // Handle move events
    moveEvents$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.isPointerDown)
      )
      .subscribe(({ type, event }) => {
        this.handleMove(type, event as MouseEvent | TouchEvent);
      });

    // Handle end events
    endEvents$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.isPointerDown)
      )
      .subscribe(({ type, event }) => {
        this.handleEnd(type, event as MouseEvent | TouchEvent);
      });
  }

  private getPoint(type: string, event: MouseEvent | TouchEvent): Point {
    if (type === 'touch') {
      const touchEvent = event as TouchEvent;
      const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
      return {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now()
      };
    } else {
      const mouseEvent = event as MouseEvent;
      return {
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        timestamp: Date.now()
      };
    }
  }

  private calculateDistance(point1: Point, point2: Point): number {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
  }

  private handleStart(type: string, event: MouseEvent | TouchEvent): void {
    // Only handle start if the event originated from our target element
    // if (type === 'mouse') {
    //   const mouseEvent = event as MouseEvent;
    //   if (mouseEvent.target !== this.element && !this.element.contains(mouseEvent.target as Node)) {
    //     return;
    //   }
    // }

    event.preventDefault();

    this.isPointerDown = true;
    this.startPoint = this.getPoint(type, event);
    this.currentPoint = this.startPoint;
    this.gestureRecognized = false;

    // Emit touchStart immediately
    const gestureEvent: GestureEvent = {
      type: 'touchStart',
      startPoint: this.startPoint
    };
    this.touchStartSubject.next(gestureEvent);

    // Start long press timer
    this.longPressTimer = window.setTimeout(() => {
      if (this.isPointerDown && !this.gestureRecognized && this.startPoint && this.currentPoint) {
        const movement = this.calculateDistance(this.startPoint, this.currentPoint);
        if (movement <= this.config.maxLongPressMovement) {
          this.gestureRecognized = true;
          const longPressEvent: GestureEvent = {
            type: 'longPress',
            startPoint: this.startPoint,
            endPoint: this.currentPoint,
            duration: Date.now() - this.startPoint.timestamp,
            distance: movement
          };
          this.longPressSubject.next(longPressEvent);
        }
      }
    }, this.config.minLongPressDuration);
  }

  private handleMove(type: string, event: MouseEvent | TouchEvent): void {
    if (!this.startPoint) return;

    this.currentPoint = this.getPoint(type, event);

    // Check if movement exceeds tap threshold early
    const movement = this.calculateDistance(this.startPoint, this.currentPoint);
    const duration = this.currentPoint.timestamp - this.startPoint.timestamp;

    // Check for swipe gesture
    if (!this.gestureRecognized && movement >= this.config.minSwipeDistance && duration <= this.config.maxSwipeDuration) {
      const deltaY = this.currentPoint.y - this.startPoint.y;
      const deltaX = this.currentPoint.x - this.startPoint.x;

      // Ensure vertical movement is dominant
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.gestureRecognized = true;
        this.clearLongPressTimer();

        const swipeEvent: GestureEvent = {
          type: deltaY < 0 ? 'swipeUp' : 'swipeDown',
          startPoint: this.startPoint,
          endPoint: this.currentPoint,
          duration,
          distance: movement
        };

        if (deltaY < 0) {
          this.swipeUpSubject.next(swipeEvent);
        } else {
          this.swipeDownSubject.next(swipeEvent);
        }
      }
    }
  }

  private handleEnd(type: string, event: MouseEvent | TouchEvent): void {
    if (!this.startPoint) return;

    const endPoint = this.getPoint(type, event);
    const duration = endPoint.timestamp - this.startPoint.timestamp;
    const movement = this.calculateDistance(this.startPoint, endPoint);

    this.clearLongPressTimer();

    // Only process tap if no other gesture was recognized and long press didn't fire
    if (!this.gestureRecognized) {
      if (duration <= this.config.maxTapDuration && movement <= this.config.maxTapMovement) {
        const tapEvent: GestureEvent = {
          type: 'tap',
          startPoint: this.startPoint,
          endPoint,
          duration,
          distance: movement
        };

        this.handlePotentialTap(tapEvent);
      } else {
        // No gesture recognized, complete immediately
        this.completeGesture();
      }
    } else {
      // Gesture was already recognized, complete immediately
      this.completeGesture();
    }

    this.resetState();
  }

  private handlePotentialTap(tapEvent: GestureEvent): void {
    const now = Date.now();

    // Check for double tap
    if (this.lastTapStartPoint &&
      (now - this.lastTapEndTime) <= this.config.maxDoubleTapInterval &&
      this.calculateDistance(this.lastTapStartPoint, tapEvent.startPoint) <= this.config.maxDoubleTapDistance) {

      // It's a double tap
      this.clearDoubleTapTimer();
      const doubleTapEvent: GestureEvent = {
        type: 'doubleTap',
        startPoint: this.lastTapStartPoint,
        endPoint: tapEvent.endPoint,
        duration: tapEvent.endPoint!.timestamp - this.lastTapStartPoint.timestamp,
        distance: this.calculateDistance(this.lastTapStartPoint, tapEvent.endPoint!)
      };

      this.doubleTapSubject.next(doubleTapEvent);
      this.completeGesture();

      // Reset double tap state
      this.lastTapStartPoint = null;
      this.lastTapEndTime = 0;
      this.pendingTap = null;
    } else {
      // Store this tap and wait to see if a second tap follows
      this.pendingTap = tapEvent;
      this.lastTapStartPoint = tapEvent.startPoint;
      this.lastTapEndTime = now;

      // Set timer to emit single tap if no second tap comes
      this.doubleTapTimer = window.setTimeout(() => {
        if (this.pendingTap) {
          this.tapSubject.next(this.pendingTap);
          this.completeGesture();
          this.pendingTap = null;
        }
      }, this.config.maxDoubleTapInterval);
    }
  }

  private completeGesture(): void {
    const completionEvent: GestureEvent = {
      type: 'allGesturesComplete',
      startPoint: this.startPoint!,
      endPoint: this.currentPoint
    };
    this.allGesturesCompleteSubject.next(completionEvent);
  }

  private resetState(): void {
    this.isPointerDown = false;
    this.startPoint = null;
    this.currentPoint = null;
    this.gestureRecognized = false;
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private clearDoubleTapTimer(): void {
    if (this.doubleTapTimer !== null) {
      clearTimeout(this.doubleTapTimer);
      this.doubleTapTimer = null;
    }
  }

  public destroy(): void {
    // Clear any running timers
    this.clearLongPressTimer();
    this.clearDoubleTapTimer();

    // Complete all subjects
    this.destroy$.next();
    this.destroy$.complete();

    // Complete gesture subjects
    this.touchStartSubject.complete();
    this.allGesturesCompleteSubject.complete();
    this.swipeUpSubject.complete();
    this.swipeDownSubject.complete();
    this.tapSubject.complete();
    this.doubleTapSubject.complete();
    this.longPressSubject.complete();

    // Reset state
    this.resetState();
    this.lastTapStartPoint = null;
    this.lastTapEndTime = 0;
    this.pendingTap = null;
  }
}



export interface GestureConfig {
  // Swipe configuration
  minSwipeDistance?: number;
  maxSwipeDuration?: number;

  // Tap configuration
  maxTapDuration?: number;
  maxTapMovement?: number;

  // Double tap configuration
  maxDoubleTapInterval?: number;
  maxDoubleTapDistance?: number;

  // Long press configuration
  minLongPressDuration?: number;
  maxLongPressMovement?: number;
}



export interface Point {
  x: number;
  y: number;
  timestamp: number;
}



export interface GestureEvent {
  type: string;
  startPoint: Point;
  endPoint?: Point;
  duration?: number;
  distance?: number;
}