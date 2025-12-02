import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Observable, Subject, takeUntil } from 'rxjs';
import { MATERIAL_IMPORTS } from '../../material-imports';

export interface NextGameFilterSearchDialogData {
  onCancel: () => void;
  progress$: Observable<number | undefined>;
}

@Component({
  standalone: true,
  selector: 'app-next-game-filter-search-dialog',
  templateUrl: './next-game-filter-search-dialog.html',
  styleUrl: './next-game-filter-search-dialog.scss',
  imports: [...MATERIAL_IMPORTS, MatProgressSpinnerModule],
})
export class NextGameFilterSearchDialog implements OnDestroy {
  currentGameNumber?: number;
  private destroy = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<NextGameFilterSearchDialog>,
    @Inject(MAT_DIALOG_DATA) public data: NextGameFilterSearchDialogData,
  ) {
    data?.progress$
      ?.pipe(takeUntil(this.destroy))
      .subscribe(gameNumber => this.currentGameNumber = gameNumber);
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  cancel(): void {
    this.data.onCancel();
    this.dialogRef.close();
  }
}
