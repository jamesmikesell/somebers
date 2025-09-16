import { Routes } from '@angular/router';


export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./component/board/board').then(m => m.Board)
  },
  {
    path: 'documentation',
    loadComponent: () => import('./component/documentation/documentation').then(m => m.Documentation)
  },
  {
    path: 'settings',
    loadComponent: () => import('./component/settings/settings').then(m => m.SettingsComponent),
  },
  {
    path: 'export',
    loadComponent: () => import('./component/export/export').then(m => m.ExportComponent),
  },
  {
    path: 'backup',
    loadComponent: () => import('./component/backup/backup').then(m => m.BackupComponent),
  },
  {
    path: 'transferComplete',
    loadComponent: () => import('./component/transfer-complete/transfer-complete').then(m => m.TransferComplete),
  },
  {
    path: '**',
    loadComponent: () => import('./component/board/board').then(m => m.Board)
  },
];
