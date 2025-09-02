import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CelebrationComponent } from "./component/celebration/celebration";
import { MATERIAL_IMPORTS } from './material-imports';
import { VersionCheckService } from './service/version-check.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CelebrationComponent, ...MATERIAL_IMPORTS, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {


  colorModes: ColorMode[] = [
    { mode: 'auto', cssScheme: 'light dark', label: 'Auto', icon: 'brightness_auto' },
    { mode: 'light', cssScheme: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', cssScheme: 'dark', label: 'Dark', icon: 'dark_mode' }
  ];
  currentModeIndex = 0;

  get currentColorMode() {
    return this.colorModes[this.currentModeIndex];
  }

  constructor(public versionCheckService: VersionCheckService) {
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