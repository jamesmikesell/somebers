import { Random } from "../model/random";

export class BoardTests {

  public static findGameSeedSoFirstFewGamesMatchDifficulty(): void {
    const gridSizeHistory = [];
    const targetPattern = [5, 5, 5, 6, 6, 6, 7, 7, 8];
    let attempts = 0;
    const maxAttempts = 50000000;
    let gridMin = 5;
    let gridMax = 9;
    let game = 1;

    while (attempts < maxAttempts) {
      attempts++;
      const gridSize = Math.floor(Random.generateFromSeed(game) * (gridMax - gridMin + 1) + gridMin);

      gridSizeHistory.push(gridSize);

      if (gridSizeHistory.length > targetPattern.length) {
        gridSizeHistory.shift();
      }

      if (gridSizeHistory.length === targetPattern.length) {
        const matches = gridSizeHistory.every((value, index) => value === targetPattern[index]);
        if (matches) {
          console.log(`Found pattern starting at game ${game - targetPattern.length + 1} after ${attempts} attempts! History: [${gridSizeHistory.join(', ')}]`);
          break;
        }
      }

      game++;
    }

    if (attempts >= maxAttempts)
      console.log(`Pattern not found after ${attempts} attempts. Final history: [${gridSizeHistory.join(', ')}]`);
  }
}