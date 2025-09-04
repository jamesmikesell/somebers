import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Title } from '../title/title';

@Component({
  selector: 'app-transfer-complete',
  standalone: true,
  imports: [CommonModule, MatButtonModule, Title],
  templateUrl: './transfer-complete.html',
  styleUrls: ['./transfer-complete.scss'],
})
export class TransferComplete {
  goHome(): void {
    const loc = window.location;
    const url = `${loc.origin}${loc.pathname}#/`;

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
}
