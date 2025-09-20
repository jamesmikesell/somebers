
import { Injectable } from '@angular/core';
import { DataSaveVersion, DataSaveWrapper } from '../model/saved-game-data/saved-game-data';
import { SavedGameStateV0 } from '../model/saved-game-data/saved-game-data.v0';
import { SavedGameStateV1 } from '../model/saved-game-data/saved-game-data.v1';
import { SavedGameStateV2 } from '../model/saved-game-data/saved-game-data.v2';
import { SavedGameStateV3 } from '../model/saved-game-data/saved-game-data.v3';
import { SaveDataRepositoryService } from './save-data-repository.service';



@Injectable({
  providedIn: 'root'
})
export class SaveDataService {
  service: SaveDataPrivateService<SavedGameStateV3>;

  constructor(private repo: SaveDataRepositoryService) {
    this.service = new SaveDataPrivateService<SavedGameStateV3>(this.repo);
  }

}




class SaveDataPrivateService<T extends DataSaveVersion> {

  private gameVersions: Constructor[] = [
    SavedGameStateV0,
    SavedGameStateV1,
    SavedGameStateV2,
    SavedGameStateV3,
  ];

  constructor(private repo: SaveDataRepositoryService) {
    this.checkForDuplicateVersionDtos();
  }


  saveNoWait(gameState: T): void {
    this.save(gameState).catch(e => console.error(e));
  }


  async save(gameState: T): Promise<void> {
    let wrapper: DataSaveWrapper<DataSaveVersion> = {
      version: gameState.version,
      data: gameState,
    }

    await this.repo.saveWrapperToIdb(wrapper)
  }


  async load(): Promise<T | null | undefined> {
    await this.repo.init();
    let appData = await this.repo.getAppData();
    if (!appData)
      return undefined;

    try {
      return await this.migrate(appData);
    } catch (e) {
      console.warn('Error parsing saved data.', e);
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


  private async migrate(wrapper: DataSaveWrapper<DataSaveVersion>): Promise<T> {
    let migratedData = wrapper.data;
    let currentAppVersionNumber = this.generateSaverDto().version;

    for (let nextUpgradeVersion = wrapper.version + 1; nextUpgradeVersion <= currentAppVersionNumber; nextUpgradeVersion++) {
      switch (nextUpgradeVersion) {
        case 1:
          migratedData = new SavedGameStateV1(migratedData as any as SavedGameStateV0)
          break;
        case 2:
          migratedData = new SavedGameStateV2(migratedData as any as SavedGameStateV1)
          break;
        case 3:
          migratedData = new SavedGameStateV3(migratedData as any as SavedGameStateV2)
          break;

        default:
          console.warn(`No migration path defined for version ${nextUpgradeVersion}`);
          return undefined;
      }
    }

    await this.save(migratedData as T);
    return migratedData as T;
  }

}


type Constructor<T = any> = new (...args: any[]) => T;
