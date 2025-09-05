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


  // TODO: delete this in a few weeks
  getLocalStorageVersion(): DataSaveWrapper<DataSaveVersion> {
    const localStorageDate = localStorage.getItem(this.KEY);
    if (localStorageDate) {
      localStorage.removeItem(this.KEY);
      return JSON.parse(localStorageDate) as DataSaveWrapper<DataSaveVersion>;
    }

    const legacyV1Data = this.convertLegacyToWrapperObject();
    return legacyV1Data;
  }


  // TODO: delete this in a few weeks
  private convertLegacyToWrapperObject(): DataSaveWrapper<any> | null {
    const GAME_NUMBER = 'gameNumberV2';
    const SAVED_STATE = 'gameStateV4';

    let state: SavedGameStateV0;
    let savedGameString = localStorage.getItem(SAVED_STATE)
    let gameNumber = localStorage.getItem(GAME_NUMBER)
    if (savedGameString) {
      state = JSON.parse(savedGameString);
    } else if (gameNumber) {
      state = {
        fails: 0,
        gameNumber: +gameNumber,
        grid: undefined,
      }
    }

    localStorage.removeItem(SAVED_STATE)
    localStorage.removeItem(GAME_NUMBER)

    let wrapper: DataSaveWrapper<any> = {
      version: 0,
      data: state,
    }

    return wrapper;
  }
}
