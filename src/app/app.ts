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


  colorModes = [
    { mode: 'auto', scheme: 'light dark', label: 'Auto', icon: 'brightness_auto' },
    { mode: 'light', scheme: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', scheme: 'dark', label: 'Dark', icon: 'dark_mode' }
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
    document.body.style.colorScheme = this.currentColorMode.scheme;
  }

  toggleColorMode() {
    this.currentModeIndex = (this.currentModeIndex + 1) % this.colorModes.length;
    document.body.style.colorScheme = this.currentColorMode.scheme;
    localStorage.setItem('colorMode', this.currentColorMode.mode);
  }
}

