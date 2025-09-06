import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { GameStats, StreakPeriod } from '../../service/stat-calculator';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './stats.html',
  styleUrls: ['./stats.scss'],
})
export class StatsComponent implements OnInit {

  @Input() set stats(val: GameStats) {
    this.updateStats(val);
  }

  mistakes = 0;
  streak = 0;
  accuracy: number | null = null;
  accuracyHistory: number;
  displayedStreak: StreakPeriod;


  streakAnimationClass = '';
  tears: { left: string; animationDelay: string }[] = [];

  isCountingDown = false;
  isSlidingUp = false;
  previousStreakDigits: number[] = [];
  showRedOrb = false;


  private currentStats: GameStats;
  private displayedStreakIndex = 0;


  private updateStats(val: GameStats): void {
    if (!val)
      return;

    this.currentStats = val;
    this.mistakes = val.mistakesCurrentBoard;
    this.streak = val.currentStreak;
    this.accuracy = val.accuracyPercent;
    this.accuracyHistory = val.accuracyHistoryMoveCount;

    this.updateDisplayedStreak();

    if (val.previousStreak > 0 && val.currentStreak === 0) {
      // Start countdown animation
      this.isCountingDown = true;
      this.previousStreakDigits = val.previousStreak
        .toString()
        .split('')
        .map(Number);

      setTimeout(() => {
        this.isCountingDown = false;
        if (val.previousStreak >= 10) {
          this.isSlidingUp = true;
          setTimeout(() => {
            this.isSlidingUp = false;
          }, 500); // slide-up duration
        }
      }, 2000);

      // Trigger sad animation and tears
      if (val.previousStreak >= 300) {
        this.streakAnimationClass = 'sad-3';
      } else if (val.previousStreak >= 40) {
        this.streakAnimationClass = 'sad-2';
      } else {
        this.streakAnimationClass = 'sad-1';
      }

      if (val.previousStreak > 20) {
        this.showRedOrb = true;
        setTimeout(() => {
          this.showRedOrb = false;
        }, 1500); // Animation duration of red orb
      }

      this.tears = [];
      const numberOfTears = 1 + Math.floor(val.previousStreak / 50);
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


  ngOnInit(): void {
    this.displayedStreakIndex = +localStorage.getItem('bestStreakDisplay');
    this.updateDisplayedStreak();
  }


  cycleBestStreakWindow(): void {
    this.displayedStreakIndex = (this.displayedStreakIndex + 1) % this.currentStats.streaks.length;
    localStorage.setItem('bestStreakDisplay', this.displayedStreakIndex.toString());
    this.updateDisplayedStreak();
  }


  private updateDisplayedStreak(): void {
    if (this.currentStats) {
      this.displayedStreak = this.currentStats.streaks[this.displayedStreakIndex % this.currentStats.streaks.length];
    }
  }


}
