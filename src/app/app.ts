import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersion } from './app-version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  AppVersion = AppVersion;

  constructor() { }
}

