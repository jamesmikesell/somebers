import { readFileSync } from 'fs';
import { SavedGameStateV3 } from '../model/saved-game-data/saved-game-data.v3';
import { BoardStatAnalyzer, DifficultyReport } from '../service/board-stat-analyzer';
import { generatePlayArea } from '../service/gameboard-generator';
import { difficultyReportToGameStat, RawGenericFeatureSet } from '../service/ml-core';


export function computeStatsFromBackupFile(backupPath = 'src/app/development-tools/somebers-backup.somebers.json'): RawGenericFeatureSet[] {
  const backupRaw = readFileSync(backupPath, 'utf8');
  const savedState = JSON.parse(backupRaw) as SavedGameStateV3;

  const out: RawGenericFeatureSet[] = [];
  for (const game of savedState.inProgressGames ?? []) {
    if (!game) continue;
    if (!game.completed) continue;
    if (!game.timeSpent || game.timeSpent <= 15000) continue;
    if (!game.moveHistory || game.moveHistory.filter((correctMove) => !correctMove).length > 3) continue;

    const gameBoard = generatePlayArea(game.gameNumber);
    const stats = BoardStatAnalyzer.evaluate(gameBoard.playArea);
    const s = difficultyReportToGameStat(stats, game.timeSpent, game.gameNumber)

    out.push(s);
  }
  return out;
}

export function buildRawGameStatForGameNumber(gameNumber: number): RawGenericFeatureSet {
  const playArea = generatePlayArea(gameNumber).playArea;
  const stats = BoardStatAnalyzer.evaluate(playArea);

  return difficultyReportToGameStat(stats, 0, gameNumber);
}
