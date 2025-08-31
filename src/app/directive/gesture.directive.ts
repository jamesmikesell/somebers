import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GestureRecognizer } from './gesture-recognizer';
import { HammerImplementation } from './hammer-recognizer';


@Directive({
  selector: '[appGesture]',
  standalone: true
})
export class GestureDirective implements OnInit, OnDestroy {
  @Output() swipeUp = new EventEmitter<void>();
  @Output() swipeDown = new EventEmitter<void>();
  @Output() tap = new EventEmitter<void>();
  @Output() doubleTap = new EventEmitter<void>();
  @Output() touchStart = new EventEmitter<void>();
  @Output() allGesturesComplete = new EventEmitter<void>();
  @Output() longPress = new EventEmitter<void>();

  private hammer: HammerImplementation | undefined;
  private claude: GestureRecognizer | undefined;
  private destroy$ = new Subject<void>();

  constructor(private el: ElementRef) { }


  ngOnInit(): void {
    let x = 1;
    if (x === 1)
      this.hammerInit()
    else if (x === 2)
      this.claudeInit()
  }


  private claudeInit(): void {
    this.claude = new GestureRecognizer(this.el.nativeElement, { maxDoubleTapInterval: 800 });

    this.claude.touchStart$.pipe(takeUntil(this.destroy$)).subscribe(() => this.touchStart.emit());
    this.claude.allGesturesComplete$.pipe(takeUntil(this.destroy$)).subscribe(() => this.allGesturesComplete.emit());
    this.claude.swipeUp$.pipe(takeUntil(this.destroy$)).subscribe(() => this.swipeUp.emit());
    this.claude.swipeDown$.pipe(takeUntil(this.destroy$)).subscribe(() => this.swipeDown.emit());
    this.claude.tap$.pipe(takeUntil(this.destroy$)).subscribe(() => this.tap.emit());
    this.claude.doubleTap$.pipe(takeUntil(this.destroy$)).subscribe(() => this.doubleTap.emit());
    this.claude.longPress$.pipe(takeUntil(this.destroy$)).subscribe(() => this.longPress.emit());
  }

  private hammerInit(): void {
    this.hammer = new HammerImplementation(this.el.nativeElement);

    this.hammer.touchStart$.pipe(takeUntil(this.destroy$)).subscribe(() => this.touchStart.emit());
    this.hammer.allGesturesComplete$.pipe(takeUntil(this.destroy$)).subscribe(() => this.allGesturesComplete.emit());
    this.hammer.swipeUp$.pipe(takeUntil(this.destroy$)).subscribe(() => this.swipeUp.emit());
    this.hammer.swipeDown$.pipe(takeUntil(this.destroy$)).subscribe(() => this.swipeDown.emit());
    this.hammer.tap$.pipe(takeUntil(this.destroy$)).subscribe(() => this.tap.emit());
    this.hammer.doubleTap$.pipe(takeUntil(this.destroy$)).subscribe(() => this.doubleTap.emit());
    this.hammer.longPress$.pipe(takeUntil(this.destroy$)).subscribe(() => this.longPress.emit());
  }

  ngOnDestroy(): void {
    if (this.hammer)
      this.hammer.destroy();
    if (this.claude)
      this.claude.destroy();

    this.destroy$.next();
    this.destroy$.complete();
  }
}