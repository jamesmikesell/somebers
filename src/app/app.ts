import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CelebrationComponent } from "./component/celebration/celebration";
import { MATERIAL_IMPORTS } from './material-imports';
import { BoardUiService } from './service/board-ui.service';
import { PwaInstallService } from './service/pwa-install.service';
import { VersionCheckService } from './service/version-check.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CelebrationComponent, ...MATERIAL_IMPORTS, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {

  colorModes: ColorMode[] = [
    { mode: 'auto', cssScheme: 'light dark', label: 'Auto Color Theme', icon: 'brightness_auto' },
    { mode: 'light', cssScheme: 'light', label: 'Light Theme', icon: 'light_mode' },
    { mode: 'dark', cssScheme: 'dark', label: 'Dark Theme', icon: 'dark_mode' }
  ];
  currentModeIndex = 0;
  get currentColorMode() { return this.colorModes[this.currentModeIndex] }
  boardVisible = false;
  canUndo = false;

  private destroy = new Subject<void>();


  constructor(
    public versionCheckService: VersionCheckService,
    public boardUiService: BoardUiService,
    // Force early construction so it can capture beforeinstallprompt events
    _pwaInstallService: PwaInstallService,
  ) {
    versionCheckService.startVersionCheck();
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode) {
      const savedModeIndex = this.colorModes.findIndex(m => m.mode === savedMode);
      if (savedModeIndex > -1) {
        this.currentModeIndex = savedModeIndex;
      }
    }

    this.setColorMode();
  }


  ngOnInit(): void {
    this.boardUiService.boardVisible$
      .pipe(takeUntil(this.destroy))
      .subscribe(visible => setTimeout(() => this.boardVisible = visible, 0))

    this.boardUiService.canUndo$
      .pipe(takeUntil(this.destroy))
      .subscribe(canUndo => setTimeout(() => this.canUndo = canUndo, 0))
  }


  ngOnDestroy(): void {
    this.destroy.next();
  }


  toggleColorMode() {
    this.currentModeIndex = (this.currentModeIndex + 1) % this.colorModes.length;
    this.setColorMode();
    localStorage.setItem('colorMode', this.currentColorMode.mode);
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
}


interface ColorMode {
  mode: "light" | "dark" | "auto";
  cssScheme: "light" | "dark" | "light dark";
  label: string;
  icon: string;
}
