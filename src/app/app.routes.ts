import { Routes } from '@angular/router';
import { SettingsComponent } from './component/settings/settings';
import { Board } from './component/board/board';
import { Documentation } from './component/documentation/documentation';
import { ExportComponent } from './component/export/export';
import { TransferComplete } from './component/transfer-complete/transfer-complete';

export const routes: Routes = [
  {
    path: '',
    component: Board
  },
  {
    path: 'documentation',
    component: Documentation
  },
  {
    path: 'settings',
    component: SettingsComponent,
  },
  {
    path: 'export',
    component: ExportComponent,
  },
  {
    path: 'transferComplete',
    component: TransferComplete,
  },
  {
    path: '**',
    component: Board
  },
];
