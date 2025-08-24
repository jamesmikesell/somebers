import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppVersion } from './app-version';
import { CelebrationComponent } from "./component/celebration/celebration";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CelebrationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  AppVersion = AppVersion;

  constructor() { }
}

