import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { Title } from "../title/title";

@Component({
  selector: 'app-resume',
  imports: [...MATERIAL_IMPORTS, Title],
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
})
export class ResumeComponent {

  constructor(
    private router: Router
  ) { }


  async resume(): Promise<void> {
    await this.router.navigateByUrl('/');
  }
}
