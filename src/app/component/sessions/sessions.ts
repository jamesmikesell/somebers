import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { DurationPipe } from '../../pipe/duration.pipe';
import { SessionService, SessionState, SessionStats } from '../../service/session.service';
import { Title } from '../title/title';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, ...MATERIAL_IMPORTS, Title, DurationPipe],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class SessionsComponent implements OnInit, OnDestroy {

  state: SessionState;
  stats: SessionStats | null = null;
  loading = false;

  private destroy = new Subject<void>();

  constructor(
    private sessionService: SessionService,
  ) { }


  ngOnInit(): void {
    this.state = this.sessionService.currentState;
    this.loadStats();

    this.sessionService.state$
      .pipe(takeUntil(this.destroy))
      .subscribe(state => {
        this.state = state;
        this.loadStats();
      });
  }


  ngOnDestroy(): void {
    this.destroy.next();
  }


  async startSession(): Promise<void> {
    this.sessionService.startSession();
    await this.loadStats();
  }


  async endSession(): Promise<void> {
    this.sessionService.endSession();
    await this.loadStats();
  }


  private async loadStats(): Promise<void> {
    this.loading = true;
    try {
      this.stats = await this.sessionService.computeSessionStats();
    } finally {
      this.loading = false;
    }
  }
}
