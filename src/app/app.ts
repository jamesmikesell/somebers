import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersion } from './app-version';
import { CelebrationComponent } from "./component/celebration/celebration";
import { MATERIAL_IMPORTS } from './material-imports';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CelebrationComponent, ...MATERIAL_IMPORTS],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  AppVersion = AppVersion;

  colorModes = [
    { mode: 'auto', scheme: 'light dark', label: 'Auto', icon: 'brightness_auto' },
    { mode: 'light', scheme: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', scheme: 'dark', label: 'Dark', icon: 'dark_mode' }
  ];
  currentModeIndex = 0;

  get currentColorMode() {
    return this.colorModes[this.currentModeIndex];
  }

  constructor() {
  }

  toggleColorMode() {
    this.currentModeIndex = (this.currentModeIndex + 1) % this.colorModes.length;
    document.body.style.colorScheme = this.currentColorMode.scheme;
  }
}

