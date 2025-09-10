import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GestureRecognizer } from './gesture-recognizer';


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
  @Output() longPressDragHorizontal = new EventEmitter<void>();

  private claude: GestureRecognizer | undefined;
  private destroy$ = new Subject<void>();

  constructor(private el: ElementRef) { }


  ngOnInit(): void {
    this.claudeInit();
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
    this.claude.longPressDrag$.pipe(takeUntil(this.destroy$)).subscribe(() => this.longPressDragHorizontal.emit());
  }


  ngOnDestroy(): void {
    if (this.claude)
      this.claude.destroy();

    this.destroy$.next();
    this.destroy$.complete();
  }
}

export enum GestureMode {
  HAMMER,
  CUSTOM,
}
