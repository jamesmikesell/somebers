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
  @Input() previousStreak = 0;

  streakAnimationClass = '';



  ngOnChanges(changes: SimpleChanges): void {
    if (changes['streak'] && changes['streak'].currentValue < this.previousStreak && changes['streak'].currentValue === 0) {
      if (this.previousStreak >= 300) {
        this.streakAnimationClass = 'sad-3';
      } else if (this.previousStreak >= 40) {
        this.streakAnimationClass = 'sad-2';
      } else if (this.previousStreak > 0) {
        this.streakAnimationClass = 'sad-1';
      }

      setTimeout(() => {
        this.streakAnimationClass = '';
      }, 1000);
    }
  }
}
