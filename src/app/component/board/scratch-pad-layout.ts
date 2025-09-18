import { NgZone } from '@angular/core';

export type LayoutMode = 'vertical' | 'horizontal';

export interface ScratchPadLayoutState {
  layoutMode: LayoutMode;
  boardOffset: number;
}

export class ScratchPadLayoutController {

  layoutMode: LayoutMode = 'vertical';
  boardHorizontalOffset = 0;

  private readonly scratchPadInlineGap = 12;
  private readonly scratchPadSideGap = 16;

  private resizeObserver?: ResizeObserver;
  private measurementScheduled = false;

  private boardSection?: HTMLElement;
  private boardContainer?: HTMLElement;
  private scratchContainer?: HTMLElement;
  private scratchMeasureHorizontal?: HTMLElement;
  private scratchMeasureVertical?: HTMLElement;

  private readonly handleWindowResize = () => this.scheduleMeasurement();
  private lastInlineHeight = 0;
  private lastSideWidth = 0;

  constructor(
    private readonly ngZone: NgZone,
    private readonly onStateChange: (state: ScratchPadLayoutState) => void,
  ) {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('resize', this.handleWindowResize);
    });
  }

  destroy(): void {
    this.ngZone.runOutsideAngular(() => {
      window.removeEventListener('resize', this.handleWindowResize);
    });

    this.resizeObserver?.disconnect();
  }

  setBoardSection(element?: HTMLElement): void {
    this.boardSection = element;
    this.scheduleMeasurement();
  }

  setBoardContainer(element?: HTMLElement): void {
    this.observeElement(this.boardContainer, false);
    this.boardContainer = element;
    this.observeElement(this.boardContainer);
    this.scheduleMeasurement();
  }

  setScratchContainer(element?: HTMLElement): void {
    this.observeElement(this.scratchContainer, false);
    this.scratchContainer = element;
    this.observeElement(this.scratchContainer);
    this.scheduleMeasurement();
  }

  setBoardLayout(element?: HTMLElement): void {
    this.observeElement(element);
    this.scheduleMeasurement();
  }

  setScratchMeasureHorizontal(element?: HTMLElement): void {
    this.observeElement(this.scratchMeasureHorizontal, false);
    this.scratchMeasureHorizontal = element;
    this.observeElement(this.scratchMeasureHorizontal);
    this.scheduleMeasurement();
  }

  setScratchMeasureVertical(element?: HTMLElement): void {
    this.observeElement(this.scratchMeasureVertical, false);
    this.scratchMeasureVertical = element;
    this.observeElement(this.scratchMeasureVertical);
    this.scheduleMeasurement();
  }

  scheduleMeasurement(): void {
    if (!this.boardSection || this.measurementScheduled) {
      return;
    }

    this.measurementScheduled = true;

    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.ngZone.run(() => this.performMeasurement());
      });
    });
  }

  private performMeasurement(): void {
    this.measurementScheduled = false;

    if (!this.boardSection || !this.boardContainer || !this.scratchContainer) {
      return;
    }

    const boardSectionRect = this.getRect(this.boardSection);
    const boardRect = this.getRect(this.boardContainer);
    const scratchRect = this.getRect(this.scratchContainer);

    if (!boardSectionRect || !boardRect || !scratchRect) {
      return;
    }

    const scratchHorizontalRect = this.scratchMeasureHorizontal
      ? this.getRect(this.scratchMeasureHorizontal)
      : undefined;
    const scratchVerticalRect = this.scratchMeasureVertical
      ? this.getRect(this.scratchMeasureVertical)
      : undefined;

    if (scratchHorizontalRect?.height) {
      this.lastInlineHeight = scratchHorizontalRect.height;
    } else if (!this.lastInlineHeight) {
      this.lastInlineHeight = scratchRect.height;
    }

    if (scratchVerticalRect?.width) {
      this.lastSideWidth = scratchVerticalRect.width;
    } else if (!this.lastSideWidth && this.lastInlineHeight) {
      this.lastSideWidth = this.lastInlineHeight;
    }

    const scratchHeightForStack = this.lastInlineHeight || scratchRect.height;
    const scratchWidthForSide = this.lastSideWidth || scratchRect.width;

    const verticalFits = boardRect.height + this.scratchPadInlineGap + scratchHeightForStack <= boardSectionRect.height;

    let nextLayout: LayoutMode = verticalFits ? 'vertical' : 'horizontal';
    let nextOffset = 0;

    if (nextLayout === 'horizontal') {
      const centeredLeft = Math.max(0, (boardSectionRect.width - boardRect.width) / 2);
      const scratchLeftIfCentered = centeredLeft + boardRect.width + this.scratchPadSideGap;
      const overflow = Math.max(0, scratchLeftIfCentered + scratchWidthForSide - boardSectionRect.width);
      const adjustedLeft = Math.max(0, centeredLeft - overflow);
      const scratchRightEdge = adjustedLeft + boardRect.width + this.scratchPadSideGap + scratchWidthForSide;

      if (scratchRightEdge <= boardSectionRect.width) {
        nextOffset = Math.round(adjustedLeft);
      } else {
        nextLayout = 'vertical';
      }
    }

    this.updateState(nextLayout, nextOffset);
  }

  private updateState(layoutMode: LayoutMode, boardOffset: number): void {
    if (layoutMode === this.layoutMode && boardOffset === this.boardHorizontalOffset) {
      return;
    }

    this.layoutMode = layoutMode;
    this.boardHorizontalOffset = boardOffset;
    this.onStateChange({ layoutMode, boardOffset });

    if (layoutMode === 'horizontal') {
      // Re-measure on next frame in case dimensions change after verticalMode flips.
      this.scheduleMeasurement();
    }
  }

  private getRect(element: HTMLElement): DOMRect | undefined {
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      return undefined;
    }

    return rect;
  }

  private observeElement(element?: HTMLElement, enable: boolean = true): void {
    if (!element) {
      return;
    }

    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasurement());
    }

    if (enable) {
      this.resizeObserver.observe(element);
    } else {
      this.resizeObserver.unobserve(element);
    }
  }

}
