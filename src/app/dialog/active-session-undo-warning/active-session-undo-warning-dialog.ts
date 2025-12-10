import { Component, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MATERIAL_IMPORTS } from '../../material-imports';

export type ActiveSessionUndoDialogResult = 'sessions' | 'close';

@Component({
  standalone: true,
  imports: [...MATERIAL_IMPORTS, RouterLink],
  templateUrl: './active-session-undo-warning-dialog.html',
})
export class ActiveSessionUndoWarningDialog {

  constructor(
    private dialogRef: MatDialogRef<ActiveSessionUndoWarningDialog, ActiveSessionUndoDialogResult>,
  ) {}


  close(): void {
    this.dialogRef.close('close');
  }


  goToSessions(): void {
    this.dialogRef.close('sessions');
  }
}

@Injectable({ providedIn: 'root' })
export class ActiveSessionUndoWarningDialogLauncher {
  private openDialogRef: MatDialogRef<ActiveSessionUndoWarningDialog, ActiveSessionUndoDialogResult> | null = null;

  constructor(private dialog: MatDialog) {}


  open(): Observable<ActiveSessionUndoDialogResult | undefined> {
    if (this.openDialogRef)
      return this.openDialogRef.afterClosed();

    this.openDialogRef = this.dialog.open(ActiveSessionUndoWarningDialog, {
      disableClose: false,
    });

    this.openDialogRef.afterClosed().subscribe(() => this.openDialogRef = null);

    return this.openDialogRef.afterClosed();
  }
}
