import { SavedGameStateV3 } from "../../model/saved-game-data/saved-game-data.v3";


export class NoopSaveDataService {
  service = new NoopSaveDataPrivateService();
}


class NoopSaveDataPrivateService {

  constructor() {
  }

  saveNoWait(_gameState: SavedGameStateV3): void { }

  async save(_gameState: SavedGameStateV3): Promise<void> {
    return;
  }

  async load(): Promise<SavedGameStateV3 | undefined> {
    return undefined;
  }

  generateSaverDto(): SavedGameStateV3 {
    return new SavedGameStateV3();
  }
}
