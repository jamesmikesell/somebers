import { Injectable } from '@angular/core';
import { ChangedDefaultDialogLauncher } from '../dialog/changed-default/changed-default-dialog';
import { SaveDataService } from './save-data.service';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ChangedDefaultService {
  private checkPromise: Promise<void> | null = null;

  constructor(
    private settingsService: SettingsService,
    private saveDataService: SaveDataService,
    private dialogLauncher: ChangedDefaultDialogLauncher,
  ) { }

  // TODO: delete this file in a few weeks

  maybeShowAutoClearNotice(): Promise<void> {
    if (!this.checkPromise)
      this.checkPromise = this.evaluateChangedAutoClearDefault();

    return this.checkPromise;
  }

  private async evaluateChangedAutoClearDefault(): Promise<void> {
    if (this.settingsService.hasAutoClearUnneededCellsSetting())
      return;

    this.settingsService.setAutoClearUnneededCells(true);

    let savedData;
    try {
      savedData = await this.saveDataService.service.load();
    } catch (error) {
      console.error('changed-default: failed to load saved data', error);
      return;
    }

    if (!savedData?.inProgressGames?.length)
      return;

    await this.dialogLauncher.open();
  }
}
