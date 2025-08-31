import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule],
})
export class SettingsComponent implements OnInit {
  deleteConfirmation = '';
  shapesModeEnabled: boolean = false;

  ngOnInit(): void {
    const savedShapesMode = localStorage.getItem('shapesModeEnabled');
    if (savedShapesMode !== null) {
      this.shapesModeEnabled = JSON.parse(savedShapesMode);
    }
  }

  onShapesModeChange(event: MatSlideToggleChange): void {
    this.shapesModeEnabled = event.checked;
    localStorage.setItem('shapesModeEnabled', JSON.stringify(this.shapesModeEnabled));
  }

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