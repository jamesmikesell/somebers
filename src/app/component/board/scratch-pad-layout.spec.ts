import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LayoutMode, ScratchPadLayoutController, ScratchPadLayoutState } from './scratch-pad-layout';

type Size = { width: number; height: number };

interface MockElement {
  element: HTMLElement;
  setSize(size: Partial<Size>): void;
}

class NoopResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) { }
  observe(): void { }
  unobserve(): void { }
  disconnect(): void { }
}

function createMockElement(initialSize: Size): MockElement {
  const element = document.createElement('div');
  const rect: Size & { top: number; left: number; right: number; bottom: number; x: number; y: number } = {
    width: initialSize.width,
    height: initialSize.height,
    top: 0,
    left: 0,
    right: initialSize.width,
    bottom: initialSize.height,
    x: 0,
    y: 0,
  };

  (element as any).getBoundingClientRect = () => ({
    ...rect,
    toJSON() { return {}; },
  }) as DOMRect;

  return {
    element,
    setSize(size: Partial<Size>) {
      if (size.width !== undefined) {
        rect.width = size.width;
        rect.right = size.width;
      }
      if (size.height !== undefined) {
        rect.height = size.height;
        rect.bottom = size.height;
      }
    },
  };
}

describe('ScratchPadLayoutController', () => {

  let zone: NgZone;
  let controller: ScratchPadLayoutController;
  let latestState: ScratchPadLayoutState | undefined;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    zone = TestBed.inject(NgZone);

    latestState = undefined;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    spyOn(window, 'requestAnimationFrame').and.callFake(cb => {
      cb(performance.now());
      return 0;
    });

    originalResizeObserver = (window as any).ResizeObserver;
    (window as any).ResizeObserver = NoopResizeObserver;

    controller = new ScratchPadLayoutController(zone, state => latestState = state);
  });

  afterEach(() => {
    controller.destroy();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    if (originalResizeObserver) {
      (window as any).ResizeObserver = originalResizeObserver;
    } else {
      delete (window as any).ResizeObserver;
    }
  });

  function wireElements(elements: {
    boardSection: MockElement;
    boardLayout: MockElement;
    boardContainer: MockElement;
    scratchContainer: MockElement;
    scratchInline: MockElement;
    scratchVertical: MockElement;
  }): void {
    controller.setBoardLayout(elements.boardLayout.element);
    controller.setBoardSection(elements.boardSection.element);
    controller.setBoardContainer(elements.boardContainer.element);
    controller.setScratchContainer(elements.scratchContainer.element);
    controller.setScratchMeasureHorizontal(elements.scratchInline.element);
    controller.setScratchMeasureVertical(elements.scratchVertical.element);
  }

  it('keeps the scratch pad stacked when vertical space is sufficient', () => {
    const elements = {
      boardSection: createMockElement({ width: 600, height: 760 }),
      boardLayout: createMockElement({ width: 0, height: 0 }),
      boardContainer: createMockElement({ width: 420, height: 420 }),
      scratchContainer: createMockElement({ width: 240, height: 110 }),
      scratchInline: createMockElement({ width: 240, height: 110 }),
      scratchVertical: createMockElement({ width: 150, height: 220 }),
    };

    wireElements(elements);
    controller.scheduleMeasurement();

    expect(controller.layoutMode).toBe('vertical');
    expect(controller.boardHorizontalOffset).toBe(0);
    expect(latestState).toBeUndefined();
  });

  it('moves the scratch pad beside the board when width allows but vertical space does not', () => {
    const elements = {
      boardSection: createMockElement({ width: 600, height: 480 }),
      boardLayout: createMockElement({ width: 0, height: 0 }),
      boardContainer: createMockElement({ width: 400, height: 420 }),
      scratchContainer: createMockElement({ width: 240, height: 110 }),
      scratchInline: createMockElement({ width: 240, height: 110 }),
      scratchVertical: createMockElement({ width: 150, height: 220 }),
    };

    wireElements(elements);
    controller.scheduleMeasurement();

    expect(controller.layoutMode).toBe('horizontal');
    expect(controller.boardHorizontalOffset).toBe(34);
    expect(latestState).toEqual({ layoutMode: 'horizontal', boardOffset: 34 });
  });

  it('reuses cached vertical sizing so the pad slides horizontally as soon as space is available', () => {
    const boardSection = createMockElement({ width: 600, height: 480 });
    const boardContainer = createMockElement({ width: 400, height: 420 });
    const scratchContainer = createMockElement({ width: 240, height: 110 });
    const inlineMeasure = createMockElement({ width: 240, height: 110 });
    const verticalMeasure = createMockElement({ width: 150, height: 220 });

    wireElements({
      boardSection,
      boardLayout: createMockElement({ width: 0, height: 0 }),
      boardContainer,
      scratchContainer,
      scratchInline: inlineMeasure,
      scratchVertical: verticalMeasure,
    });

    controller.scheduleMeasurement();
    expect(controller.layoutMode).toBe('horizontal');
    expect(controller.boardHorizontalOffset).toBe(34);
    expect(latestState).toEqual({ layoutMode: 'horizontal', boardOffset: 34 });

    scratchContainer.setSize({ width: 280 });
    boardSection.setSize({ width: 620 });
    const zeroWidthMeasure = createMockElement({ width: 0, height: 220 });
    controller.setScratchMeasureVertical(zeroWidthMeasure.element);

    controller.scheduleMeasurement();

    expect(controller.layoutMode).toBe('horizontal');
    expect(controller.boardHorizontalOffset).toBe(54);
    expect(latestState).toEqual({ layoutMode: 'horizontal', boardOffset: 54 });
  });

});
