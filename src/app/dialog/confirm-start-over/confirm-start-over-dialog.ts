import { Component, Inject, Injectable } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../material-imports';
import { map, Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './confirm-start-over-dialog.html',
})
export class ConfirmStartOverDialog {
  constructor(
    private dialogRef: MatDialogRef<ConfirmStartOverDialog, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: { gameNumber: number },
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

@Injectable({ providedIn: 'root' })
export class ConfirmStartOverDialogLauncher {
  constructor(private dialog: MatDialog) {}

  open(gameNumber: number): Observable<boolean> {
    const ref = this.dialog.open(ConfirmStartOverDialog, {
      data: { gameNumber },
    });
    return ref.afterClosed().pipe(map(result => !!result));
  }
}
