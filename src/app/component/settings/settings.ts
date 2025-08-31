import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class SettingsComponent {
  deleteConfirmation = '';

  get canDelete(): boolean {
    return this.deleteConfirmation.toLowerCase() === 'delete all data';
  }

  deleteAllData(): void {
    if (this.canDelete) {
      localStorage.clear();
      window.location.reload();
    }
  }
}