import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { SessionService } from '../../service/session.service';
import { Title } from "../title/title";

@Component({
  selector: 'app-resume',
  imports: [...MATERIAL_IMPORTS, Title],
  templateUrl: './resume.html',
  styleUrl: './resume.scss',
})
export class ResumeComponent {

  constructor(
    private router: Router,
    private sessionService: SessionService,
  ) { }


  async resume(): Promise<void> {
    this.sessionService.refreshFromStorage();
    await this.router.navigateByUrl('/');
  }
}
