import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, tap } from 'rxjs';
import { DisplayCell } from '../../model/game-board';
import { DifficultyPredictorService } from '../../service/difficulty-predictor.service';
import { AFFIRMATIONS, Affirmation } from './affirmations';
import { CelebrationDialog } from './celebration';


@Injectable({ providedIn: 'root' })
export class CelebrationLauncherService {
  private dialogRef: MatDialogRef<CelebrationDialog, void> | null = null;


  constructor(
    private dialog: MatDialog,
    private difficultyEstimationService: DifficultyPredictorService,
  ) { }


  async openAutoPickMessage(stats: CelebrationStats): Promise<Observable<void>> {
    let difficultyPercentile: number | undefined;
    let estimatedSolveTime: number | undefined;
    try {
      const difficultyDetails = await this.difficultyEstimationService.getDifficultyEstimates(stats.playArea);
      difficultyPercentile = difficultyDetails?.percentile;
      estimatedSolveTime = difficultyDetails?.estimatedSolveTime;
    } catch (error) {
      console.error(error);
    }

    const metrics: MetricScores = {
      mistakes: this.scoreMistakes(stats.mistakes),
      timeSpent: this.scoreTimeSpent(stats.timeSpent, estimatedSolveTime),
      difficulty: this.scoreDifficulty(difficultyPercentile),
    };

    const affirmation = this.pickAffirmation(metrics);

    return this.open({
      title: affirmation.title,
      subtitle: affirmation.subTitle,
      duration: 20000
    });
  }


  private scoreMistakes(mistakeCount: number): number {
    if (!Number.isFinite(mistakeCount) || mistakeCount <= 0)
      return 1;

    return -0.6 * (Math.pow(2, mistakeCount) - 1)
  }


  private scoreTimeSpent(timeSpentMs: number, estimatedSolveTimeMs?: number): number {
    if (!Number.isFinite(timeSpentMs) || timeSpentMs <= 0)
      return 0;

    const ratio = timeSpentMs / estimatedSolveTimeMs;

    if (!Number.isFinite(ratio))
      return 0;

    const gracePercent = 0.05;
    const normal = 2 * ((1 + gracePercent) - ratio);
    const sign = normal < 0 ? -1 : 1;

    const biased = sign * (Math.pow(2, Math.abs(normal)) - 1)
    return this.clamp(biased);
  }


  private scoreDifficulty(percentile?: number): number {
    if (!Number.isFinite(percentile))
      return 0;

    return this.clamp((percentile * 2) - 1);
  }


  private pickAffirmation(metrics: MetricScores): Affirmation {
    const temperature = 0.75;
    const jitterAmt = 0.15;

    const weights = AFFIRMATIONS.map((affirmation) => {
      const alignment = 0
        + (affirmation.accuracy * metrics.mistakes)
        + (affirmation.speed * metrics.timeSpent)
        + (affirmation.difficulty * metrics.difficulty);

      const jitter = (1 - jitterAmt) + (Math.random() * (jitterAmt * 2));
      return Math.exp(alignment / temperature) * jitter;
    });

    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const target = Math.random() * totalWeight;
    let cumulative = 0;
    for (let index = 0; index < AFFIRMATIONS.length; index++) {
      cumulative += weights[index];
      if (target <= cumulative)
        return AFFIRMATIONS[index];
    }

    return AFFIRMATIONS[AFFIRMATIONS.length - 1];
  }


  private clamp(value: number, min = -1, max = 1): number {
    return Math.min(Math.max(value, min), max);
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


export interface CelebrationStats {
  mistakes: number;
  timeSpent: number;
  playArea: DisplayCell[][];
}


export interface CelebrationConfig {
  title: string;
  subtitle: string;
  duration?: number;
}


interface MetricScores {
  mistakes: number;
  timeSpent: number;
  difficulty: number;
}
