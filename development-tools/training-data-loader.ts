import { readFileSync } from 'fs';
import { SavedGameStateV3 } from '../src/app/model/saved-game-data/saved-game-data.v3';
import { BoardStatAnalyzer } from '../src/app/service/board-stat-analyzer';
import { generateGameBoard } from '../src/app/service/gameboard-generator';
import { difficultyReportToGameStat, RawGenericFeatureSet } from '../src/app/service/ml-core';


export function computeStatsFromBackupFile(backupPath = 'development-tools/somebers-backup.somebers.json'): RawGenericFeatureSet[] {
  const backupRaw = readFileSync(backupPath, 'utf8');
  const savedState = JSON.parse(backupRaw) as SavedGameStateV3;

  const out: RawGenericFeatureSet[] = [];
  for (const game of savedState.inProgressGames ?? []) {
    if (!game?.completed) continue;
    if ((game.timeSpent ?? 0) <= 15000) continue;
    if ((game.moveHistory?.filter((correctMove) => !correctMove).length ?? 0) > 3) continue;

    const gameBoard = generateGameBoard(game.gameNumber);
    const stats = BoardStatAnalyzer.evaluate(gameBoard.playArea);
    const s = difficultyReportToGameStat(stats, game.timeSpent, game.gameNumber)

    out.push(s);
  }
  return out;
}


export function buildRawGameStatForGameNumber(gameNumber: number): RawGenericFeatureSet {
  const playArea = generateGameBoard(gameNumber).playArea;
  const stats = BoardStatAnalyzer.evaluate(playArea);

  return difficultyReportToGameStat(stats, 0, gameNumber);
}
