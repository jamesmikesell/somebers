import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './stats.html',
  styleUrls: ['./stats.scss'],
})
export class StatsComponent implements OnChanges {
  @Input() mistakes = 0;
  @Input() streak = 0;
  @Input() accuracy: number | null = null;
  @Input() accuracyHistory: number;
  @Input() previousStreak = 0;

  streakAnimationClass = '';
  tears: { left: string; animationDelay: string }[] = [];

  isCountingDown = false;
  previousStreakDigits: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['streak'] &&
      changes['streak'].currentValue < this.previousStreak &&
      changes['streak'].currentValue === 0 &&
      this.previousStreak > 0
    ) {
      // Start countdown animation
      this.isCountingDown = true;
      this.previousStreakDigits = this.previousStreak
        .toString()
        .split('')
        .map(Number);

      setTimeout(() => {
        this.isCountingDown = false;
      }, 2000);

      // Trigger sad animation and tears
      if (this.previousStreak >= 300) {
        this.streakAnimationClass = 'sad-3';
      } else if (this.previousStreak >= 40) {
        this.streakAnimationClass = 'sad-2';
      } else {
        this.streakAnimationClass = 'sad-1';
      }

      this.tears = [];
      const numberOfTears = 1 + Math.floor(this.previousStreak / 50);
      for (let i = 0; i < numberOfTears; i++) {
        const left = i % 2 === 0 ? 'calc(50% - 20px)' : 'calc(50% + 20px)';
        const animationDelay = `${i * 0.2}s`;
        this.tears.push({ left, animationDelay });
      }

      const cumulativeTearDelayMs = (numberOfTears - 1) * 200;
      const tearAnimationDurationMs = 1500; // From stats.scss, animation: fall 1.5s
      const timeoutDuration =
        1000 + cumulativeTearDelayMs + tearAnimationDurationMs;

      setTimeout(() => {
        this.streakAnimationClass = '';
        this.tears = [];
      }, timeoutDuration);
    }
  }
}
