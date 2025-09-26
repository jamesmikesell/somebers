import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, tap } from 'rxjs';
import { DisplayCell } from '../../model/game-board';
import { DifficultyPredictorService } from '../../service/difficulty-predictor.service';
import { AFFIRMATIONS } from './affirmations';
import { CelebrationDialog } from './celebration';


@Injectable({ providedIn: 'root' })
export class CelebrationLauncherService {
  private dialogRef: MatDialogRef<CelebrationDialog, void> | null = null;


  constructor(
    private dialog: MatDialog,
    private difficultyEstimationService: DifficultyPredictorService,
  ) { }


  async openAutoPickMessage(mistakes: number, playArea: DisplayCell[][]): Promise<Observable<void>> {
    let difficultyPercentile = 0;
    try {
      const difficultyDetails = await this.difficultyEstimationService.getDifficultyEstimates(playArea);
      difficultyPercentile = difficultyDetails.percentile;
    } catch (error) {
      console.error(error);
    }

    const mistakeFactor = Math.min(1, mistakes / 3);

    // Bias: 0 for "bad" performance (high mistakes, easy board), 1 for "good" performance (low mistakes, hard board)
    const bias = (difficultyPercentile * 0.3) + ((1 - mistakeFactor) * 0.7);

    const skewStrength = 3;
    const u = Math.random();
    // logit transform: maps uniform [0,1] → (-∞, ∞)
    const shifted = Math.log(u / (1 - u));

    // inverse-logit with bias applied
    const randomValue = 1 / (1 + Math.exp(-shifted - skewStrength * (bias - 0.5)));

    const affirmationsCount = AFFIRMATIONS.length;
    const randomIndex = Math.max(0, Math.min(affirmationsCount - 1, Math.floor(randomValue * affirmationsCount)));

    let affirmation = AFFIRMATIONS[randomIndex];

    return this.open({
      title: affirmation.title,
      subtitle: affirmation.subTitle,
      duration: 20000
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
      backdropClass: 'transparent-backdrop',
      panelClass: 'transparent-backdrop',
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
