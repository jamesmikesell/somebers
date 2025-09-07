import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { deleteDB, openDB } from 'idb';
import { IdbService } from '../../service/idb.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
  ],
})
export class SettingsComponent implements OnInit {
  deleteConfirmation = '';
  devModeEnabled: boolean = false;
  shapesModeEnabled: boolean = false;
  gestureMode: string = 'HAMMER';


  ngOnInit(): void {
    const savedShapesMode = localStorage.getItem('shapesModeEnabled');
    if (savedShapesMode !== null) {
      this.shapesModeEnabled = JSON.parse(savedShapesMode);
    }

    const savedGestureMode = localStorage.getItem('gestureMode');
    if (savedGestureMode !== null) {
      this.gestureMode = savedGestureMode;
    }
  }


  onShapesModeChange(event: MatSlideToggleChange): void {
    this.shapesModeEnabled = event.checked;
    localStorage.setItem('shapesModeEnabled', JSON.stringify(this.shapesModeEnabled));
  }


  onDeleteInputChange(): void {
    this.devModeEnabled = this.isDevModeTriggered;
  }


  onGestureModeChange(): void {
    localStorage.setItem('gestureMode', this.gestureMode);
  }


  get isDevModeTriggered(): boolean {
    const lowerCaseInput = this.deleteConfirmation.toLowerCase();
    return lowerCaseInput === 'devmode' || lowerCaseInput === 'dev mode';
  }


  get canDelete(): boolean {
    return this.deleteConfirmation.toLowerCase() === 'delete all data';
  }


  async deleteAllData(): Promise<void> {
    if (this.canDelete) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error(e)
      }

      try {
        const db = await openDB(IdbService.dbName);
        await db.clear(IdbService.storeName);
        db.close();
      } catch (e) {
        console.error(e)
      }

      window.location.href = '/';
    }
  }

}