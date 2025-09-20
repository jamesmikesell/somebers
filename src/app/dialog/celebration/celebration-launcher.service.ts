import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, tap } from 'rxjs';
import { CelebrationDialog } from './celebration';
import { AFFIRMATIONS } from './affirmations';


@Injectable({ providedIn: 'root' })
export class CelebrationLauncherService {
  private dialogRef: MatDialogRef<CelebrationDialog, void> | null = null;


  constructor(private dialog: MatDialog) { }


  openAutoPickMessage(mistakes: number, boardSize: number): Observable<void> {
    const affirmationsCount = AFFIRMATIONS.length;

    // Normalize board size (5-9) to a 0-1 range
    const normalizedBoardSize = Math.max(0, Math.min(1, (boardSize - 5) / 4));

    // Normalize mistakes. More mistakes on a larger board is less of a factor.
    // Making mistakes on more than 5% of cells is considered max penalty.
    const mistakeFactor = Math.min(1, mistakes / (boardSize * boardSize * 0.05));

    // Bias: 0 for "bad" performance (high mistakes, small board), 1 for "good" performance (low mistakes, large board)
    const bias = (normalizedBoardSize * 0.2) + ((1 - mistakeFactor) * 0.8);

    // Convert bias to a power for Math.pow.
    // A power > 1 biases random numbers towards 0 (start of the list).
    // A power < 1 biases random numbers towards 1 (end of the list).
    const power = Math.pow(4, 1 - 2 * bias);

    const randomValue = Math.pow(Math.random(), power);
    const randomIndex = Math.max(0, Math.min(affirmationsCount - 1, Math.floor(randomValue * affirmationsCount)));

    let affirmation = AFFIRMATIONS[randomIndex];

    return this.open({
      title: affirmation.title,
      subtitle: affirmation.subTitle,
    });
  }


  open(config: CelebrationConfig): Observable<void> {
    const defaultConfig: Partial<CelebrationConfig> = {
      duration: 8000,
    };

    const finalConfig: CelebrationConfig = { ...defaultConfig, ...config };

    if (this.dialogRef) {
      this.dialogRef.close();
    }

    this.dialogRef = this.dialog.open(CelebrationDialog, {
      data: finalConfig,
      panelClass: 'celebration-dialog-panel',
      hasBackdrop: false,
      autoFocus: false,
      restoreFocus: false,
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      enterAnimationDuration: 0,
    });

    return this.dialogRef.afterClosed().pipe(
      tap(() => {
        this.dialogRef = null;
      }),
    );
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

}


export interface CelebrationConfig {
  title: string;
  subtitle: string;
  duration?: number;
}
