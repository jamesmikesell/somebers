import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../material-imports';

@Component({
  selector: 'app-scratch-pad',
  standalone: true,
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './scratch-pad.html',
  styleUrl: './scratch-pad.scss',
})
export class ScratchPadComponent implements AfterViewInit, OnDestroy {

  @Input() verticalMode = false;

  private readonly resetValue = 10;
  readonly minValue = 1;
  value = this.resetValue;

  private resizeObserver?: ResizeObserver;

  constructor() { }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  increment(): void {
    this.value += 1;
  }

  decrement(): void {
    if (this.value <= this.minValue) {
      return;
    }

    this.value -= 1;
  }

  reset(): void {
    this.value = this.resetValue;
  }

}
