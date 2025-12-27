import { CommonModule } from '@angular/common';
import { Component, Inject, Injectable } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from "@angular/material/card";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { FpFilterState, NextGameFilterMode, NextGameFilterOptions, NextGameFilterService } from '../../service/next-game-filter.service';

export interface NextGameFilterDialogData {
  options: NextGameFilterOptions;
}

@Component({
  standalone: true,
  selector: 'app-next-game-filter-dialog',
  templateUrl: './next-game-filter-dialog.html',
  styleUrl: './next-game-filter-dialog.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    ...MATERIAL_IMPORTS,
    MatCardModule,
],
})
export class NextGameFilterDialog {
  filterEnabled = false;
  fpFilter: FpFilterState = 'include';
  skipCompleted = true;
  mode: NextGameFilterMode = 'difficulty';
  minDifficulty?: number;
  maxDifficulty?: number;
  minMinutes?: number;
  maxMinutes?: number;
  minBoardSize?: number;
  maxBoardSize?: number;
  readonly boardSizes = [5, 6, 7, 8, 9];

  constructor(
    private dialogRef: MatDialogRef<NextGameFilterDialog, NextGameFilterOptions | undefined>,
    @Inject(MAT_DIALOG_DATA) private data: NextGameFilterDialogData,
    private filterService: NextGameFilterService,
  ) {
    this.applyOptions(data?.options ?? this.filterService.getOptions());
  }

  onDifficultyChange(value: unknown, target: 'min' | 'max'): void {
    const parsed = this.toNumber(value);
    if (target === 'min')
      this.minDifficulty = parsed;
    else
      this.maxDifficulty = parsed;
  }

  onMinutesChange(value: unknown, target: 'min' | 'max'): void {
    const parsed = this.toNumber(value);
    if (target === 'min')
      this.minMinutes = parsed;
    else
      this.maxMinutes = parsed;
  }

  onBoardSizeChange(value: unknown, target: 'min' | 'max'): void {
    const parsed = this.toBoardSize(value);
    if (target === 'min')
      this.minBoardSize = parsed;
    else
      this.maxBoardSize = parsed;
  }

  selectAllText(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    if (!input)
      return;

    // Delay to allow focus to settle before selecting
    setTimeout(() => input.select(), 0);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  save(): void {
    const options: NextGameFilterOptions = {
      enabled: this.filterEnabled,
      fpFilter: this.fpFilter,
      skipCompleted: this.skipCompleted,
      mode: this.mode,
      minDifficulty: this.minDifficulty,
      maxDifficulty: this.maxDifficulty,
      minTimeSeconds: this.toSeconds(this.minMinutes),
      maxTimeSeconds: this.toSeconds(this.maxMinutes),
      minBoardSize: this.minBoardSize,
      maxBoardSize: this.maxBoardSize,
    };

    this.dialogRef.close(options);
  }

  private applyOptions(options: NextGameFilterOptions): void {
    const opt = options ?? this.filterService.getOptions();
    this.filterEnabled = opt.enabled;
    this.fpFilter = opt.fpFilter;
    this.skipCompleted = opt.skipCompleted;
    this.mode = opt.mode;
    this.minDifficulty = opt.minDifficulty;
    this.maxDifficulty = opt.maxDifficulty;
    this.minMinutes = this.toMinutes(opt.minTimeSeconds);
    this.maxMinutes = this.toMinutes(opt.maxTimeSeconds);
    this.minBoardSize = opt.minBoardSize;
    this.maxBoardSize = opt.maxBoardSize;
  }

  private toNumber(value: unknown): number | undefined {
    if (value === '' || value == null)
      return undefined;

    const parsed = Number(value);
    if (!Number.isFinite(parsed))
      return undefined;

    return Math.round(parsed * 10) / 10;
  }

  private toSeconds(minutes?: number): number | undefined {
    if (!Number.isFinite(minutes))
      return undefined;

    const mins = Math.max(0, Math.round((minutes ?? 0) * 10) / 10);
    return Math.round(mins * 60);
  }

  private toMinutes(totalSeconds?: number): number | undefined {
    if (!Number.isFinite(totalSeconds))
      return undefined;

    return Math.round((totalSeconds / 60) * 10) / 10;
  }

  private toBoardSize(value: unknown): number | undefined {
    if (value === '' || value == null)
      return undefined;

    const parsed = Number(value);
    if (!Number.isFinite(parsed))
      return undefined;

    const rounded = Math.round(parsed);
    if (rounded < 5 || rounded > 9)
      return undefined;

    return rounded;
  }

}

@Injectable({ providedIn: 'root' })
export class NextGameFilterDialogLauncher {
  constructor(
    private dialog: MatDialog,
    private filterService: NextGameFilterService,
  ) { }

  open(): Promise<NextGameFilterOptions | undefined> {
    const ref = this.dialog.open(NextGameFilterDialog, {
      data: { options: this.filterService.getOptions() },
    });

    return firstValueFrom(ref.afterClosed());
  }
}
