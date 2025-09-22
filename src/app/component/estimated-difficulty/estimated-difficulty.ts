import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { firstValueFrom } from 'rxjs';
import { DisplayCell } from '../../model/game-board';
import { BoardStatAnalyzer } from '../../service/board-stat-analyzer';
import { DifficultyPredictorService } from '../../service/difficulty-predictor.service';
import { generateGameBoard } from '../../service/gameboard-generator';
import { toSample } from '../../service/ml-core';
import { difficultyReportToGameStat } from '../../service/ml-difficulty-stats';

@Component({
  selector: 'app-estimated-difficulty',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './estimated-difficulty.html',
  styleUrl: './estimated-difficulty.scss',
})
export class EstimatedDifficultyComponent implements OnChanges {
  @Input() playArea?: DisplayCell[][];
  @Input() gameNumber?: number;

  percentileLabel = '–';
  estimatedTimeLabel = '–';
  firstPrincipalViolationWarning = ""

  private timesPromise?: Promise<number[] | undefined>;


  constructor(
    private predictor: DifficultyPredictorService,
    private http: HttpClient,
  ) { }


  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ('playArea' in changes || 'gameNumber' in changes)
      await this.updatePrediction();
  }


  private async updatePrediction(): Promise<void> {
    try {
      let effectivePlayArea: DisplayCell[][];

      if (this.playArea && this.playArea.length > 0)
        effectivePlayArea = this.playArea;
      else if (this.gameNumber != null)
        effectivePlayArea = (await generateGameBoard(this.gameNumber)).playArea;


      if (!effectivePlayArea || effectivePlayArea.length === 0) {
        this.percentileLabel = '–';
        return;
      }

      const difficultyAnalysis = BoardStatAnalyzer.evaluate(effectivePlayArea);

      this.firstPrincipalViolationWarning = "";
      if (difficultyAnalysis.totals.unresolvedCellCountAfterDeduction > 0) {
        const unresolvedCells = difficultyAnalysis.totals.unresolvedCellCountAfterDeduction;
        const resolvableCells = Math.pow(difficultyAnalysis.totals.rowsEvaluated, 2) - unresolvedCells;
        this.firstPrincipalViolationWarning = `FP+ ${unresolvedCells}-${resolvableCells}`
      }

      const stats = toSample(difficultyReportToGameStat(difficultyAnalysis, 0, 0))!;
      const msForDifficulty = await this.predictor.predictGameModel(stats);
      if (msForDifficulty != null) {
        await this.updatePercentile(msForDifficulty);
        this.estimatedTimeLabel = this.formatMs(msForDifficulty);
      } else {
        this.percentileLabel = '–';
        this.estimatedTimeLabel = '–';
      }
    } catch (e) {
      console.warn('Prediction failed', e);
      this.firstPrincipalViolationWarning = "";
      this.percentileLabel = '–';
      this.estimatedTimeLabel = '–';
    }
  }


  private async loadPredictedSolveTimesList(): Promise<number[] | undefined> {
    if (!this.timesPromise) {
      this.timesPromise = firstValueFrom(this.http.get<number[]>('difficulty-ml-predicted-times.json'))
        .then((data: number[]): number[] | undefined => {
          if (!Array.isArray(data))
            return undefined;

          const times = data.filter((value) => Number.isFinite(value));
          times.sort((a, b) => a - b);
          return times;
        })
        .catch((err: unknown): number[] | undefined => {
          console.warn('EstimatedDifficultyComponent: failed to load times', err);
          return undefined;
        });
    }
    return this.timesPromise;
  }


  private async updatePercentile(ms: number): Promise<void> {
    try {
      const times = await this.loadPredictedSolveTimesList();
      if (!times || times.length === 0) {
        this.percentileLabel = '–';
        return;
      }
      const n = times.length;
      // Binary search insertion index (number of values <= ms)
      let lo = 0, hi = n;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (times[mid] <= ms)
          lo = mid + 1;
        else
          hi = mid;
      }
      const percentile = (lo / n) * 100;
      this.percentileLabel = `${percentile.toFixed(1)}`;
    } catch (e) {
      console.warn('Percentile computation failed', e);
      this.percentileLabel = '–';
    }
  }


  private formatMs(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }

}
