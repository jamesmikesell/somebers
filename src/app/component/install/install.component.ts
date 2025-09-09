import { Component, OnDestroy, OnInit } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { Subscription } from 'rxjs';
import { PwaInstallService } from '../../service/pwa-install.service';

@Component({
  selector: 'app-install',
  standalone: true,
  exportAs: 'appInstall',
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './install.component.html',
  styleUrls: ['./install.component.scss'],
})
export class InstallComponent implements OnInit, OnDestroy {
  // Public so host templates can read when using exportAs
  canInstall = false;
  installInProgress = false;
  installError: string | null = null;
  installOutcome: 'accepted' | 'dismissed' | null = null;
  isInstalled = false;

  private subs: Subscription[] = [];

  constructor(private pwa: PwaInstallService) {}

  ngOnInit(): void {
    this.subs.push(
      this.pwa.canInstall$.subscribe(v => (this.canInstall = v)),
      this.pwa.installInProgress$.subscribe(v => (this.installInProgress = v)),
      this.pwa.installError$.subscribe(v => (this.installError = v)),
      this.pwa.installOutcome$.subscribe(v => (this.installOutcome = v)),
      this.pwa.isInstalled$.subscribe(v => (this.isInstalled = v)),
    );
  }

  ngOnDestroy(): void {
    try {
      this.subs.forEach(s => s.unsubscribe());
    } catch (error) {
      console.error('install: cleanup failed', error);
    }
  }

  async installPWA(): Promise<void> {
    await this.pwa.promptInstall();
  }
}

