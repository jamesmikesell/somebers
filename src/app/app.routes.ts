import { Routes } from '@angular/router';
import { BackupComponent } from './component/backup/backup';
import { Board } from './component/board/board';
import { Documentation } from './component/documentation/documentation';
import { ExportComponent } from './component/export/export';
import { SettingsComponent } from './component/settings/settings';
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
    path: 'backup',
    component: BackupComponent,
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
