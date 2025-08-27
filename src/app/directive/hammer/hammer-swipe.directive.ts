import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import Hammer from 'hammerjs';


@Directive({
  selector: '[appHammerSwipe]',
  standalone: true
})
export class HammerSwipeDirective implements OnInit, OnDestroy {
  @Output() swipeUp = new EventEmitter<HammerInput>();
  @Output() swipeDown = new EventEmitter<HammerInput>();
  @Output() tap = new EventEmitter<HammerInput>();
  @Output() doubleTap = new EventEmitter<HammerInput>();

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
  }

  ngOnDestroy(): void {
    if (this.hammer) {
      this.hammer.destroy();
    }
  }
}