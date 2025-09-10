import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { GestureDirective } from '../../directive/gesture.directive';
import { Cell, SelectionStatus } from '../../model/game-board';

export type CellDisplayType = 'blank' | 'header' | 'standard';

@Component({
  selector: 'app-cell',
  standalone: true,
  imports: [CommonModule, GestureDirective],
  templateUrl: './cell.component.html',
  styleUrl: './cell.component.scss'
})
export class CellComponent implements AfterViewInit, OnChanges, OnDestroy {
  private _cell: Cell;
  get cell(): Cell { return this._cell }
  @Input() set cell(val: Cell) {
    if (this._cell)
      this.gestureComplete();
    this._cell = val;
  }
  @Input() displayType!: CellDisplayType;
  @Input() columnCount!: number;
  @Input() shapesMode = false;
  @Input() disableAnimation = false;

  @Output() used = new EventEmitter<Cell>();
  @Output() cleared = new EventEmitter<Cell>();


  @ViewChild('positionFinder', { static: false }) positionFinder!: ElementRef<HTMLDivElement>;

  @HostBinding('style.--scaleFactor')
  get scaleFactor() { return this._scaleFactor; }

  @HostBinding('style.--cellColor')
  get getCellColor() {
    if (this.cell)
      return `light-dark(${this.cell.colorLight}, ${this.cell.colorDark})`;
    return "light-dark( #cacacaff, #3f3f3fff)";
  }

  @HostBinding('style.--moveX')
  get moveX() { return this._moveX; }


  SelectionStatus = SelectionStatus;
  isMagnified = false;


  private _scaleFactor = 1;
  private _moveX: string;

  @HostListener('window:resize')
  windowResizeHandler(): void {
    this.updateScaleFactor()
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateScaleFactor();
  }

  ngOnDestroy(): void {
    this.gestureComplete();
  }


  ngAfterViewInit(): void {
    this.updateScaleFactor();
  }


  private updateScaleFactor(): void {
    setTimeout(() => {
      const element = this.positionFinder.nativeElement;
      const currentWidth = element.getBoundingClientRect().width;
      const scaleFactor = 190 / currentWidth;
      this._scaleFactor = scaleFactor;

      let center = window.innerWidth / 2;
      let divLocation = element.getBoundingClientRect();
      let movePixels = (center - ((divLocation.left + divLocation.right) / 2)) * .6;
      this._moveX = movePixels / scaleFactor + "px"
    }, 0);
  }


  touchStart(): void {
    if (this.cell.status === SelectionStatus.NONE && !this.cell.processing)
      this.cell.processing = true;
  }

  use(): void {
    this.used.emit(this.cell);
  }

  clear(): void {
    this.cleared.emit(this.cell);
  }

  gestureComplete(): void {
    if (this.cell)
      this.cell.processing = false;
    this.isMagnified = false;
  }

  highlightCell(): void {
    this.cell.highlighted = !this.cell.highlighted;
  }
}
