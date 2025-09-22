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
    path: 'backup',
    loadComponent: () => import('./component/backup/backup').then(m => m.BackupComponent),
  },
  {
    path: 'resume',
    loadComponent: () => import('./component/resume/resume').then(m => m.ResumeComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./component/board/board').then(m => m.Board)
  },
];
