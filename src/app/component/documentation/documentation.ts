import { Component } from '@angular/core';
import { AppVersion } from '../../app-version';
import { Title } from '../title/title';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { InstallComponent } from '../install/install.component';

@Component({
  selector: 'app-documentation',
  imports: [Title, InstallComponent, ...MATERIAL_IMPORTS],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
})
export class Documentation {
  AppVersion = AppVersion;
}
 
