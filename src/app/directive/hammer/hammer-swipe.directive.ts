import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import Hammer from 'hammerjs';


@Directive({
  selector: '[appHammerSwipe]',
  standalone: true
})
export class HammerSwipeDirective implements OnInit, OnDestroy {
  @Output() swipeUp = new EventEmitter<HammerInput>();
  @Output() swipeDown = new EventEmitter<HammerInput>();

  private hammer: HammerManager | undefined;

  constructor(private el: ElementRef) { }

  ngOnInit(): void {
    this.hammer = new Hammer(this.el.nativeElement);

    this.hammer.get('swipe').set({
      direction: Hammer.DIRECTION_VERTICAL,
      threshold: 50,
      velocity: 0.3
    });

    this.hammer.on('swipeup', (event: HammerInput) => {
      this.swipeUp.emit(event);
    });

    this.hammer.on('swipedown', (event: HammerInput) => {
      this.swipeDown.emit(event);
    });
  }

  ngOnDestroy(): void {
    if (this.hammer) {
      this.hammer.destroy();
    }
  }
}