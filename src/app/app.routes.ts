import { Routes } from '@angular/router';
import { Board } from './component/board/board';
import { Documentation } from './component/documentation/documentation';

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
    path: '**',
    component: Board
  },
];
