import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { openDB } from 'idb';
import { AppVersion } from '../../app-version';
import { IdbService } from '../../service/idb.service';
import { InstallComponent } from '../install/install.component';

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
    RouterLink,
    InstallComponent,
  ],
})
export class SettingsComponent implements OnInit {
  deleteConfirmation = '';
  devModeEnabled: boolean = false;
  shapesModeEnabled: boolean = false;
  scratchPadVisible: boolean = true;
  sectionCompletionAnimationEnabled: boolean = true;
  AppVersion = AppVersion;


  ngOnInit(): void {
    const savedShapesMode = localStorage.getItem('shapesModeEnabled');
    if (savedShapesMode !== null) {
      this.shapesModeEnabled = JSON.parse(savedShapesMode);
    }

    const savedScratchPadVisibility = localStorage.getItem('scratchPadVisible');
    if (savedScratchPadVisibility !== null) {
      this.scratchPadVisible = JSON.parse(savedScratchPadVisibility);
    }

    const savedSectionAnimation = localStorage.getItem('sectionCompletionAnimationEnabled');
    if (savedSectionAnimation !== null)
      this.sectionCompletionAnimationEnabled = JSON.parse(savedSectionAnimation);
  }


  onShapesModeChange(event: MatSlideToggleChange): void {
    this.shapesModeEnabled = event.checked;
    localStorage.setItem('shapesModeEnabled', JSON.stringify(this.shapesModeEnabled));
  }


  onScratchPadVisibleChange(event: MatSlideToggleChange): void {
    this.scratchPadVisible = event.checked;
    localStorage.setItem('scratchPadVisible', JSON.stringify(this.scratchPadVisible));
  }


  onSectionCompletionAnimationChange(event: MatSlideToggleChange): void {
    this.sectionCompletionAnimationEnabled = event.checked;
    localStorage.setItem('sectionCompletionAnimationEnabled', JSON.stringify(this.sectionCompletionAnimationEnabled));
  }


  onDeleteInputChange(): void {
    this.devModeEnabled = this.isDevModeTriggered;
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
