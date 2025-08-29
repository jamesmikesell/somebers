import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HammerDirective } from '../../directive/hammer.directive';
import { Cell, SelectionStatus } from '../../model/game-board';

export type CellDisplayType = 'blank' | 'header' | 'standard';

@Component({
  selector: 'app-cell',
  standalone: true,
  imports: [CommonModule, HammerDirective],
  templateUrl: './cell.component.html',
  styleUrl: './cell.component.scss'
})
export class CellComponent {
  @Input() cell!: Cell;
  @Input() displayType!: CellDisplayType;
  @Input() columnCount!: number; // To pass the --columnCount CSS variable

  @Output() used = new EventEmitter<Cell>();
  @Output() cleared = new EventEmitter<Cell>();


  SelectionStatus = SelectionStatus;


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
}
