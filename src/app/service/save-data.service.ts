
import { Injectable } from '@angular/core';
import { DataSaveVersion, DataSaveWrapper } from '../model/saved-game-data/saved-game-data';
import { SavedGameStateV1 } from '../model/saved-game-data/saved-game-data.v1';
import { SavedGameStateV0 } from '../model/saved-game-data/saved-game-data.v0';



@Injectable({
  providedIn: 'root'
})
export class SaveDataService {
  service = new SaveDataPrivateService<SavedGameStateV1>();
}




class SaveDataPrivateService<T extends DataSaveVersion> {

  private readonly LOCAL_STORAGE_KEY = 'someNumbersSavedGame';

  private gameVersions: Constructor[] = [
    SavedGameStateV0,
    SavedGameStateV1,
  ];

  constructor() {
    this.checkForDuplicateVersionDtos();
  }


  save(gameState: T): void {
    let wrapper: DataSaveWrapper<DataSaveVersion> = {
      version: gameState.version,
      data: gameState,
    }

    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(wrapper));
  }


  load(): T {
    const savedDataString = localStorage.getItem(this.LOCAL_STORAGE_KEY) || this.tryLoadLegacy();
    if (!savedDataString)
      return null;

    let appData: DataSaveWrapper<DataSaveVersion>;
    try {
      appData = JSON.parse(savedDataString);
      return this.migrate(appData)
    } catch (e) {
      console.warn('Error parsing saved data, attempting migration from unversioned data.', e);
      return undefined;
    }
  }


  generateSaverDto(): T {
    return (new this.gameVersions[this.gameVersions.length - 1]() as T)
  }


  private checkForDuplicateVersionDtos(): void {
    const versions = new Set<number>();
    for (const version of this.gameVersions) {
      const instance = new version();
      if (versions.has(instance.version)) {
        console.error(`Duplicate game state version found: ${instance.version}`);
      }
      versions.add(instance.version);
    }
  }


  private migrate(wrapper: DataSaveWrapper<DataSaveVersion>): T {
    let migratedData = wrapper.data;
    let currentAppVersionNumber = this.generateSaverDto().version;

    for (let nextUpgradeVersion = wrapper.version + 1; nextUpgradeVersion <= currentAppVersionNumber; nextUpgradeVersion++) {
      switch (nextUpgradeVersion) {
        case 1:
          migratedData = new SavedGameStateV1(migratedData as any as SavedGameStateV0)
          break;
        // case 2:
        //   migratedData = new SavedGameStateV2(migratedData as any as SavedGameStateV1)
        //   break;

        default:
          console.warn(`No migration path defined for version ${nextUpgradeVersion}`);
          return undefined;
      }
    }

    this.save(migratedData as T);
    return migratedData as T;
  }


  // TODO: delete this in a few weeks
  private tryLoadLegacy(): string {
    let GAME_NUMBER = "gameNumberV2";
    let SAVED_STATE = "gameStateV4";

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

    return JSON.stringify(wrapper);
  }

}


type Constructor<T = any> = new (...args: any[]) => T;
