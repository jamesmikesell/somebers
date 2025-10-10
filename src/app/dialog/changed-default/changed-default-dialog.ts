import { Component, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MATERIAL_IMPORTS } from '../../material-imports';

@Component({
  standalone: true,
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './changed-default-dialog.html',
})
export class ChangedDefaultDialog {
  constructor(private dialogRef: MatDialogRef<ChangedDefaultDialog>) {}

  close(): void {
    this.dialogRef.close();
  }
}

@Injectable({ providedIn: 'root' })
export class ChangedDefaultDialogLauncher {
  constructor(private dialog: MatDialog) {}

  async open(): Promise<void> {
    const ref = this.dialog.open(ChangedDefaultDialog, {
      disableClose: true,
    });

    await firstValueFrom(ref.afterClosed());
  }
}
