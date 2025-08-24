import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CelebrationConfig {
  title?: string;
  subtitle?: string;
  duration?: number; // in milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class CelebrationService {
  private _isActive = new BehaviorSubject<boolean>(false);
  private _config = new BehaviorSubject<CelebrationConfig>({});

  public isActive$ = this._isActive.asObservable();
  public config$ = this._config.asObservable();

  show(config: CelebrationConfig = {}) {
    const defaultConfig: CelebrationConfig = {
      title: 'AMAZING!',
      subtitle: 'You did something incredible! 🌟',
      duration: 8000
    };

    const finalConfig = { ...defaultConfig, ...config };
    this._config.next(finalConfig);
    this._isActive.next(true);

    // Auto-hide after duration
    setTimeout(() => {
      this.hide();
    }, finalConfig.duration!);
  }

  hide() {
    this._isActive.next(false);
  }
}
