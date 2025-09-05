import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { deleteDB } from 'idb';
import { IdbService } from '../../service/idb.service';

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
      localStorage.clear();
      await deleteDB(IdbService.dbName);
      await this.deleteAllIndexedDbDatabases()

      window.location.reload();
    }
  }


  private async deleteAllIndexedDbDatabases(): Promise<void> {
    const dbs = await indexedDB.databases();
    const deletionPromises = dbs.map(db => {
      return new Promise<void>((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => reject(deleteReq.error);
      });
    });


    try {
      await Promise.all(deletionPromises);
      console.log('All databases deleted successfully');
    } catch (error) {
      console.error('Error deleting databases:', error);
    }
  };

}