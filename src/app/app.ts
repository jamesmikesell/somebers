import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MATERIAL_IMPORTS } from './material-imports';
import { BoardUiService } from './service/board-ui.service';
import { PwaInstallService } from './service/pwa-install.service';
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
  showStartOver = false;

  private destroy = new Subject<void>();


  constructor(
    public versionCheckService: VersionCheckService,
    public boardUiService: BoardUiService,
    // Force early construction so it can capture beforeinstallprompt events
    _pwaInstallService: PwaInstallService,
    private settingsService: SettingsService,
  ) {
    versionCheckService.startVersionCheck();
    const colorMode = this.settingsService.getColorMode();
    const colorModeIndex = this.colorModes.findIndex(m => m.mode === colorMode);
    if (colorModeIndex > -1)
      this.currentColorModeIndex = colorModeIndex;

    this.setColorMode();
  }


  ngOnInit(): void {
    this.boardUiService.boardVisible$
      .pipe(takeUntil(this.destroy))
      .subscribe(visible => setTimeout(() => this.boardVisible = visible, 0))

    this.boardUiService.canUndo$
      .pipe(takeUntil(this.destroy))
      .subscribe(canUndo => setTimeout(() => this.canUndo = canUndo, 0))

    this.boardUiService.showStartOver$
      .pipe(takeUntil(this.destroy))
      .subscribe(show => setTimeout(() => this.showStartOver = show, 0))
  }


  ngOnDestroy(): void {
    this.destroy.next();
  }


  toggleColorMode() {
    this.currentColorModeIndex = (this.currentColorModeIndex + 1) % this.colorModes.length;
    this.setColorMode();
    this.settingsService.setColorMode(this.currentColorMode.mode);
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


  private setColorMode(): void {
    document.body.style.colorScheme = this.currentColorMode.cssScheme;

    const computedStyle = window.getComputedStyle(document.body);
    computedStyle.backgroundColor;

    const themeColorMeta = this.getOrCreateThemeColorMeta();
    themeColorMeta.content = computedStyle.backgroundColor;
  }


  requestStartOver(): void {
    this.boardUiService.requestRestart();
  }
}


interface ColorMode {
  mode: ColorModeSetting;
  cssScheme: "light" | "dark" | "light dark";
  label: string;
  icon: string;
}
