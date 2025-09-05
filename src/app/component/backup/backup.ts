import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SaveDataService } from '../../service/save-data.service';
import { Title } from '../title/title';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, Title],
  templateUrl: './backup.html',
  styleUrl: './backup.scss',
})
export class BackupComponent {
  message = '';
  isDragging = false;
  restoreComplete = false;

  constructor(private saveDataService: SaveDataService) { }

  async backup(): Promise<void> {
    this.message = '';
    try {
      const data = await this.saveDataService.service.load();
      if (!data) {
        this.message = 'No saved data found to back up.';
        return;
      }

      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `somebers-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.somebers`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.message = 'Backup downloaded.';
    } catch (e) {
      console.error('Backup failed', e);
      this.message = 'Backup failed. See console for details.';
    }
  }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    await this.handleFile(input.files[0]);
    input.value = '';
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    await this.handleFile(files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  private async handleFile(file: File): Promise<void> {
    this.message = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await this.saveDataService.service.save(data);
      this.restoreComplete = true;
    } catch (e) {
      console.error('Restore failed', e);
      this.message = 'Restore failed. Ensure the file is a valid backup.';
    }
  }
}
