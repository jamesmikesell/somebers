import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import Hammer from 'hammerjs';


@Directive({
  selector: '[appHammer]',
  standalone: true
})
export class HammerDirective implements OnInit, OnDestroy {
  @Output() swipeUp = new EventEmitter<HammerInput>();
  @Output() swipeDown = new EventEmitter<HammerInput>();
  @Output() tap = new EventEmitter<HammerInput>();
  @Output() doubleTap = new EventEmitter<HammerInput>();
  @Output() touchStart = new EventEmitter<HammerInput>();
  @Output() allGesturesComplete = new EventEmitter<HammerInput>();

  private hammer: HammerManager | undefined;

  constructor(private el: ElementRef) { }

  ngOnInit(): void {
    this.hammer = new Hammer.Manager(this.el.nativeElement);

    this.hammer.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
    this.hammer.add(new Hammer.Tap({ event: 'tap' }));
    this.hammer.get('doubletap').recognizeWith('tap');
    this.hammer.get('tap').requireFailure('doubletap');
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
          this.allGesturesComplete.emit(event);
        }, 300);
      }
    });

    // Your existing gesture handlers...
    this.hammer.on('swipeup', (event: HammerInput) => {
      this.swipeUp.emit(event);
    });

    this.hammer.on('swipedown', (event: HammerInput) => {
      this.swipeDown.emit(event);
    });

    this.hammer.on('tap', (event: HammerInput) => {
      this.tap.emit(event);
    });

    this.hammer.on('doubletap', (event: HammerInput) => {
      this.doubleTap.emit(event);
    });

    this.hammer.on('press', (event: HammerInput) => {
      this.touchStart.emit(event);
    });
  }

  ngOnDestroy(): void {
    if (this.hammer) {
      this.hammer.destroy();
    }
  }
}