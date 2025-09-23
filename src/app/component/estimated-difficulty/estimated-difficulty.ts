import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from "@angular/material/icon";
import { DisplayCell } from '../../model/game-board';
import { DifficultyDisplayDetails, DifficultyPredictorService } from '../../service/difficulty-predictor.service';

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


  constructor(
    private predictor: DifficultyPredictorService,
  ) { }


  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ('playArea' in changes || 'gameNumber' in changes)
      await this.updatePrediction();
  }


  private async updatePrediction(): Promise<void> {
    this.firstPrincipalViolationWarning = "";
    this.percentileLabel = '-';
    this.estimatedTimeLabel = '-';

    try {
      let difficultyDetails: DifficultyDisplayDetails;
      if (this.playArea && this.playArea.length > 0)
        difficultyDetails = await this.predictor.getDifficultyEstimates(this.playArea)
      else if (this.gameNumber != null)
        difficultyDetails = await this.predictor.getDifficultyEstimates(this.gameNumber)

      if (!difficultyDetails)
        return;

      if (difficultyDetails.firstPrincipalUnResoledCellCount > 0)
        this.firstPrincipalViolationWarning = `FP+ ${difficultyDetails.firstPrincipalUnResoledCellCount}-${difficultyDetails.firstPrincipalResolvableCellCount}`

      this.percentileLabel = `${(difficultyDetails.percentile * 100).toFixed(1)}`;
      this.estimatedTimeLabel = this.formatMs(difficultyDetails.estimatedSolveTime);
    } catch (e) {
      console.warn('Prediction failed', e);
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
