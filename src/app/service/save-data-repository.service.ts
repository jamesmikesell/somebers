import { Injectable } from '@angular/core';
import { IdbService } from './idb.service';
import { DataSaveVersion, DataSaveWrapper } from '../model/saved-game-data/saved-game-data';
import { SavedGameStateV0 } from '../model/saved-game-data/saved-game-data.v0';

@Injectable({ providedIn: 'root' })
export class SaveDataRepositoryService {
  readonly KEY = 'someNumbersSavedGame';

  constructor(private idb: IdbService) { }

  async init(): Promise<void> {
    await this.idb.init();
  }

  async getAppData(): Promise<DataSaveWrapper<DataSaveVersion> | null> {
    return await this.idb.get<DataSaveWrapper<DataSaveVersion>>(this.KEY);
  }


  async saveWrapperToIdb(wrapper: DataSaveWrapper<DataSaveVersion>): Promise<void> {
    await this.idb.set(this.KEY, wrapper);
  }

}
