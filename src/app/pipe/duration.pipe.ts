import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const ms = typeof value === 'number' && isFinite(value) && value > 0 ? Math.floor(value) : 0;
    const totalSeconds = Math.floor(ms / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
}

