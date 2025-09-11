import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DisplayCell } from '../../model/game-board';
import { BoardStatAnalyzer, DifficultyReport } from '../../service/board-stat-analyzer';
import { SaveDataService } from '../../service/save-data.service';
import { generatePlayArea } from '../../service/gameboard-generator';
import { GameStatFeatures, TimePredictorService } from '../../service/time-predictor.service';
import { difficultyReportToGameStat, RawGameStat, trainBestModel } from '../../service/ml-core';

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

  predictedMs?: number;
  predictedLabel = '–';
  training = false;
  error?: string;

  constructor(
    private predictor: TimePredictorService,
    private saveDataService: SaveDataService,
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
        this.predictedLabel = '–';
        return;
      }

      const stats = BoardStatAnalyzer.evaluate(effectivePlayArea);
      const features = this.toFeatures(stats);
      const ms = await this.predictor.predict(features);
      this.predictedMs = ms ?? undefined;
      this.predictedLabel = ms != null ? this.formatMs(ms) : 'No model';
    } catch (e) {
      console.warn('Prediction failed', e);
      this.predictedLabel = 'Error';
    }
  }

  async train(): Promise<void> {
    this.training = true;
    this.error = undefined;
    try {
      const saved = await this.saveDataService.service.load();
      if (!saved) { this.error = 'No saved data found'; return; }
      const rawStats: RawGameStat[] = [];
      for (const game of saved.inProgressGames ?? []) {
        if (!game) continue;
        if (!game.completed) continue;
        if (!game.timeSpent || game.timeSpent <= 15000) continue;
        if (!game.moveHistory || game.moveHistory.filter((correctMove) => !correctMove).length > 3) continue;

        const gameBoard = generatePlayArea(game.gameNumber);
        const stats = BoardStatAnalyzer.evaluate(gameBoard.playArea);
        rawStats.push(difficultyReportToGameStat(stats, game.timeSpent, game.gameNumber));
      }
      if (!rawStats.length) { this.error = 'No qualifying completed games to train on'; return; }

      const { best } = trainBestModel(rawStats, 1337);
      this.predictor.setModelOverride(best.model);
      await this.updatePrediction();
    } catch (e) {
      console.error('Training failed', e);
      this.error = 'Training failed. See console.';
    } finally {
      this.training = false;
    }
  }

  downloadModel(): void {
    try {
      const model = this.predictor.getCurrentModel();
      if (!model) return;
      const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'difficulty-ml-model.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Download failed', e);
    }
  }

  private toFeatures(stats: ReturnType<typeof BoardStatAnalyzer.evaluate>): GameStatFeatures {
    let x = difficultyReportToGameStat(stats, undefined, undefined)
    delete x.timeSpent;
    delete x.gameNumber;
    return x as any as GameStatFeatures;
  }

  private formatMs(ms: number): string {
    if (!Number.isFinite(ms)) return '–';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}m ${ss}s`;
  }
}

