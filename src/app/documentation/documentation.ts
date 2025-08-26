import { Component } from '@angular/core';
import { AppVersion } from '../app-version';

@Component({
  selector: 'app-documentation',
  imports: [],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss'
})
export class Documentation {
  AppVersion = AppVersion;

}
