import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NextGameFilterDialogLauncher } from './dialog/next-game-filter/next-game-filter-dialog';
import { MATERIAL_IMPORTS } from './material-imports';
import { BoardUiService } from './service/board-ui.service';
import { NextGameFilterOptions, NextGameFilterService } from './service/next-game-filter.service';
import { PwaInstallService } from './service/pwa-install.service';
import { SaveDataService } from './service/save-data.service';
import { ColorModeSetting, SettingsService } from './service/settings.service';
import { VersionCheckService } from './service/version-check.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ...MATERIAL_IMPORTS, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {

  colorModes: ColorMode[] = [
    { mode: 'auto', cssScheme: 'light dark', label: 'Theme (Auto)', icon: 'brightness_auto' },
    { mode: 'light', cssScheme: 'light', label: 'Theme (Light)', icon: 'light_mode' },
    { mode: 'dark', cssScheme: 'dark', label: 'Theme (Dark)', icon: 'dark_mode' }
  ];
  currentColorModeIndex = 0;
  get currentColorMode() { return this.colorModes[this.currentColorModeIndex] }
  boardVisible = false;
  canUndo = false;
  nextGameFilterEnabled = false;
  nextGameFilterRangeLabel?: string;
  nextGameFilterFpHidden = false;
  get menuBadgeVisible(): boolean {
    return this.versionCheckService.isUpdateAvailable || (this.nextGameFilterEnabled && this.boardVisible);
  }
  get menuBadgeLabel(): string {
    if (this.boardVisible && this.nextGameFilterEnabled && this.versionCheckService.isUpdateAvailable)
      return 'Fltr +';
    if (this.boardVisible && this.nextGameFilterEnabled)
      return 'Fltr';
    if (this.versionCheckService.isUpdateAvailable)
      return '!';
    return '';
  }

  private destroy = new Subject<void>();


  constructor(
    public versionCheckService: VersionCheckService,
    public boardUiService: BoardUiService,
    // Force early construction so it can capture beforeinstallprompt events
    _pwaInstallService: PwaInstallService,
    private settingsService: SettingsService,
    private nextGameFilterService: NextGameFilterService,
    private nextGameFilterDialogLauncher: NextGameFilterDialogLauncher,
    private saveDataService: SaveDataService,
    private router: Router,
  ) {
    versionCheckService.startVersionCheck();
    const colorMode = this.settingsService.getColorMode();
    this.currentColorModeIndex = this.getColorModeIndex(colorMode);

    this.setColorMode();
  }


  ngOnInit(): void {
    void this.redirectFirstTimeVisitor();

    this.boardUiService.boardVisible$
      .pipe(takeUntil(this.destroy))
      .subscribe(visible => setTimeout(() => this.boardVisible = visible, 0))

    this.boardUiService.canUndo$
      .pipe(takeUntil(this.destroy))
      .subscribe(canUndo => setTimeout(() => this.canUndo = canUndo, 0))

    this.nextGameFilterService.options$
      .pipe(takeUntil(this.destroy))
      .subscribe(options => this.updateNextGameFilterLabel(options));
  }


  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }


  toggleColorMode(): void {
    const nextMode = this.getNextColorMode(this.currentColorMode.mode, this.getDeviceColorScheme());
    this.currentColorModeIndex = this.getColorModeIndex(nextMode);

    this.setColorMode();
    this.settingsService.setColorMode(this.currentColorMode.mode);
  }

  private async redirectFirstTimeVisitor(): Promise<void> {
    try {
      const savedData = await this.saveDataService.service.load();
      const hasSeenGame = !!savedData && savedData.currentGameNumber != null;
      if (!hasSeenGame && !this.router.url.startsWith('/tutorial')) {
        await this.router.navigateByUrl('/tutorial');
      }
    } catch (error) {
      console.warn('Unable to check save data for first-visit redirect', error);
      if (!this.router.url.startsWith('/tutorial')) {
        await this.router.navigateByUrl('/tutorial');
      }
    }
  }


  private getOrCreateThemeColorMeta(): HTMLMetaElement {
    let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    return themeColorMeta;
  }


  private updateNextGameFilterLabel(options: NextGameFilterOptions): void {
    this.nextGameFilterEnabled = options?.enabled === true;
    if (!this.nextGameFilterEnabled) {
      this.nextGameFilterRangeLabel = undefined;
      this.nextGameFilterFpHidden = false;
      return;
    }

    this.nextGameFilterFpHidden = options.excludeFpPlus === true;
    if (options.mode === 'difficulty') {
      this.nextGameFilterRangeLabel = this.formatDifficultyRange(options.minDifficulty, options.maxDifficulty);
    } else if (options.mode === 'time') {
      this.nextGameFilterRangeLabel = this.formatTimeRange(options.minTimeSeconds, options.maxTimeSeconds);
    } else {
      this.nextGameFilterRangeLabel = this.formatBoardSizeRange(options.minBoardSize, options.maxBoardSize);
    }
  }


  private formatDifficultyRange(min?: number, max?: number): string | undefined {
    const minVal = this.toSingleDecimal(min);
    const maxVal = this.toSingleDecimal(max);
    if (minVal == null && maxVal == null)
      return undefined;
    if (minVal != null && maxVal != null)
      return `${minVal} - ${maxVal}◇`;
    if (minVal != null)
      return `${minVal}◇+`;
    if (maxVal == null)
      return undefined;
    return `<=${maxVal}◇`;
  }


  private formatTimeRange(minSeconds?: number, maxSeconds?: number): string | undefined {
    const min = this.secondsToMinutes(minSeconds);
    const max = this.secondsToMinutes(maxSeconds);
    if (min == null && max == null)
      return undefined;
    if (min != null && max != null)
      return `${min} - ${max}m`;
    if (min != null)
      return `${min}m+`;
    if (max == null)
      return undefined;
    return `<=${max}m`;
  }


  private formatBoardSizeRange(min?: number, max?: number): string | undefined {
    const minSize = this.toBoardSize(min);
    const maxSize = this.toBoardSize(max);
    if (minSize == null && maxSize == null)
      return undefined;
    if (minSize != null && maxSize != null)
      return `${minSize}x${minSize} - ${maxSize}x${maxSize}`;
    if (minSize != null)
      return `${minSize}x${minSize}+`;
    if (maxSize == null)
      return undefined;
    return `<=${maxSize}x${maxSize}`;
  }


  private toSingleDecimal(value?: number): string | undefined {
    if (!Number.isFinite(value))
      return undefined;

    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  }


  private secondsToMinutes(totalSeconds?: number): string | undefined {
    if (!Number.isFinite(totalSeconds))
      return undefined;

    const minutes = Math.round((totalSeconds / 60) * 10) / 10;
    return Number.isInteger(minutes) ? `${minutes}` : minutes.toFixed(1);
  }


  private toBoardSize(value?: number): number | undefined {
    if (!Number.isFinite(value))
      return undefined;

    const rounded = Math.round(value);
    if (rounded < 5 || rounded > 9)
      return undefined;

    return rounded;
  }


  private setColorMode(): void {
    document.body.style.colorScheme = this.currentColorMode.cssScheme;

    const computedStyle = window.getComputedStyle(document.body);

    const themeColorMeta = this.getOrCreateThemeColorMeta();
    themeColorMeta.content = computedStyle.backgroundColor;
  }

  private getColorModeIndex(mode: ColorModeSetting): number {
    const index = this.colorModes.findIndex(m => m.mode === mode);
    return index > -1 ? index : 0;
  }

  private getDeviceColorScheme(): ColorModeSetting | undefined {
    if (!window.matchMedia)
      return undefined;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    if (prefersDark.matches)
      return 'dark';

    const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
    if (prefersLight.matches)
      return 'light';

    return undefined;
  }

  private getNextColorMode(currentMode: ColorModeSetting, devicePreference?: ColorModeSetting): ColorModeSetting {
    if (currentMode === 'auto') {
      if (devicePreference === 'dark')
        return 'light';
      if (devicePreference === 'light')
        return 'dark';
      return 'light';
    }

    return 'auto';
  }


  requestStartOver(): void {
    this.boardUiService.requestRestart();
  }


  async openNextGameFilter(): Promise<void> {
    const result = await this.nextGameFilterDialogLauncher.open();
    if (result)
      this.nextGameFilterService.setOptions(result);
  }
}


interface ColorMode {
  mode: ColorModeSetting;
  cssScheme: "light" | "dark" | "light dark";
  label: string;
  icon: string;
}
