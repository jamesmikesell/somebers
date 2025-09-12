import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DisplayCell } from '../../model/game-board';
import { BoardStatAnalyzer } from '../../service/board-stat-analyzer';
import { generatePlayArea } from '../../service/gameboard-generator';
import { difficultyReportToGameStat } from '../../service/ml-core';
import { GameStatFeatures, DifficultyPredictorService } from '../../service/difficulty-predictor.service';

@Component({
  selector: 'app-estimated-difficulty',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './estimated-difficulty.html',
  styleUrl: './estimated-difficulty.scss',
})
export class EstimatedDifficultyComponent implements OnChanges {
  @Input() playArea?: DisplayCell[][];
  @Input() gameNumber?: number;

  percentileLabel = '–';

  private timesPromise?: Promise<number[] | undefined>;

  constructor(
    private predictor: DifficultyPredictorService,
  ) { }

  get hasModel(): boolean { return !!this.predictor.getCurrentModel(); }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ('playArea' in changes || 'gameNumber' in changes) await this.updatePrediction();
  }

  private async updatePrediction(): Promise<void> {
    try {
      let effectivePlayArea: DisplayCell[][];

      if (this.playArea && this.playArea.length > 0)
        effectivePlayArea = this.playArea;
      else if (this.gameNumber != null)
        effectivePlayArea = generatePlayArea(this.gameNumber).playArea;


      if (!effectivePlayArea || effectivePlayArea.length === 0) {
        this.percentileLabel = '–';
        return;
      }

      const stats = BoardStatAnalyzer.evaluate(effectivePlayArea);
      const features = this.toFeatures(stats);
      const ms = await this.predictor.predict(features);

      if (ms != null) await this.updatePercentile(ms);
      else this.percentileLabel = '–';
    } catch (e) {
      console.warn('Prediction failed', e);
      this.percentileLabel = '–';
    }
  }

  private async loadSortedTimes(): Promise<number[] | undefined> {
    if (!this.timesPromise) {
      this.timesPromise = fetch('difficulty-ml-predicted-times.json', { cache: 'no-cache' })
        .then(async (r: Response): Promise<number[] | undefined> => {
          if (!r.ok) return undefined;
          const data = await r.json();
          if (!Array.isArray(data)) return undefined;
          return (data as unknown[]).map(Number).filter((v) => Number.isFinite(v)) as number[];
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
      const times = await this.loadSortedTimes();
      if (!times || times.length === 0) { this.percentileLabel = '–'; return; }
      const n = times.length;
      // Binary search insertion index (number of values <= ms)
      let lo = 0, hi = n;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (times[mid] <= ms) lo = mid + 1; else hi = mid;
      }
      const percentile = (lo / n) * 100;
      this.percentileLabel = `${percentile.toFixed(1)}`;
    } catch (e) {
      console.warn('Percentile computation failed', e);
      this.percentileLabel = '–';
    }
  }


  private toFeatures(stats: ReturnType<typeof BoardStatAnalyzer.evaluate>): GameStatFeatures {
    let x = difficultyReportToGameStat(stats, undefined, undefined)
    delete x.timeSpent;
    delete x.gameNumber;
    return x as any as GameStatFeatures;
  }

}
