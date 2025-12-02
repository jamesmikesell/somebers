import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { NextGameFilterService } from '../../service/next-game-filter.service';
import { MATERIAL_IMPORTS } from '../../material-imports';

@Component({
  standalone: true,
  selector: 'app-next-game-filter-no-match-dialog',
  templateUrl: './next-game-filter-no-match-dialog.html',
  styleUrl: './next-game-filter-no-match-dialog.scss',
  imports: [
    ...MATERIAL_IMPORTS,
    MatButtonModule,
  ],
})
export class NextGameFilterNoMatchDialog {
  constructor(
    private dialogRef: MatDialogRef<NextGameFilterNoMatchDialog>,
    private filterService: NextGameFilterService,
  ) { }

  close(): void {
    this.dialogRef.close();
  }

  disableFilter(): void {
    const options = this.filterService.getOptions();
    this.filterService.setOptions({ ...options, enabled: false });
    this.dialogRef.close();
  }
}
