import { Component } from '@angular/core';
import { AppVersion } from '../../app-version';
import { Title } from "../title/title";

@Component({
  selector: 'app-documentation',
  imports: [Title],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss'
})
export class Documentation {

  AppVersion = AppVersion;

}
