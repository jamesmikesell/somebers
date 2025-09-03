import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
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
export class CellComponent implements AfterViewInit, OnChanges {
  @Input() cell!: Cell;
  @Input() displayType!: CellDisplayType;
  @Input() columnCount!: number; // To pass the --columnCount CSS variable
  @Input() shapesMode = false;
  @Input() disableAnimation = false;

  @Output() used = new EventEmitter<Cell>();
  @Output() cleared = new EventEmitter<Cell>();


  @ViewChild('positionFinder', { static: false }) positionFinder!: ElementRef<HTMLDivElement>;

  @HostBinding('style.--scaleFactor')
  get scaleFactor() { return this._scaleFactor; }

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


  touchStart(cell: Cell): void {
    if (cell.status === SelectionStatus.NONE && !cell.processing)
      cell.processing = true;
  }

  use(cell: Cell): void {
    this.used.emit(cell);
  }

  clear(cell: Cell): void {
    this.cleared.emit(cell);
  }

  gestureComplete(cell: Cell): void {
    cell.processing = false;
    this.isMagnified = false;
  }
}
