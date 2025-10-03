import { readFileSync } from 'fs';
import { SavedGameStateV3 } from '../src/app/model/saved-game-data/saved-game-data.v3';
import { BoardStatAnalyzer } from '../src/app/service/board-stat-analyzer';
import { generateGameBoard } from '../src/app/service/gameboard-generator';
import { RawGenericFeatureSet } from '../src/app/service/ml-core';
import { difficultyReportToGameStat } from '../src/app/service/ml-difficulty-stats';
import { BoardGroupVersion } from '../src/app/model/grouping';


export async function computeStatsFromBackupFile(backupPath = 'development-tools/backup.json'): Promise<RawGenericFeatureSet[]> {
  const backupRaw = readFileSync(backupPath, 'utf8');
  const savedState = JSON.parse(backupRaw) as SavedGameStateV3;

  const completionTimes = savedState.inProgressGames
    .filter(x => x.completed && x.timeSpent > 15000 && x.moveHistory && x.moveHistory.length)
    .map(x => x.moveHistory[x.moveHistory.length - 1].timestamp)

  const firstGameDate = Math.min(...completionTimes);
  const lastGameDate = Math.max(...completionTimes);
  const gameDatesDiff = lastGameDate - firstGameDate;

  console.log("Generating Stats...")
  const out: RawGenericFeatureSet[] = [];
  for (const game of savedState.inProgressGames ?? []) {
    if (!game?.completed) continue;
    if ((game.timeSpent ?? 0) <= 15000) continue;
    if ((game.moveHistory?.filter((correctMove) => !correctMove).length ?? 0) > 10) continue;

    const gameBoard = await generateGameBoard(game.gameNumber);
    const stats = BoardStatAnalyzer.evaluate(gameBoard.playArea);
    const completionTime = game.moveHistory[game.moveHistory.length - 1].timestamp;
    const autoCompletionAvailable = completionTime > 1758406785000 ? 1 : 0;
    const gameDateAsPercent = (game.moveHistory[game.moveHistory.length - 1].timestamp - firstGameDate) / gameDatesDiff;
    const moveTime = game.moveHistory[game.moveHistory.length - 1].timestamp - game.moveHistory[0].timestamp;
    const breaksMinutes = (moveTime - game.timeSpent) / 1000 / 60;

    const s = difficultyReportToGameStat(stats, game.timeSpent, game.gameNumber, gameDateAsPercent, autoCompletionAvailable, breaksMinutes)

    out.push(s);
  }
  return out;
}


export async function buildRawGameStatForGameNumber(gameNumber: number, version: BoardGroupVersion = 1): Promise<RawGenericFeatureSet> {
  const playArea = (await generateGameBoard(gameNumber, version)).playArea;
  const stats = BoardStatAnalyzer.evaluate(playArea);

  // if (stats.totals.unresolvedCellCountAfterDeduction)
  //   console.log(`Game: ${gameNumber.toString().padStart(4, " ")}  `
  //     + `Size: ${stats.totals.columnsEvaluated}x${stats.totals.columnsEvaluated}  `
  //     + `Deduction Iterations: ${stats.totals.deductionIterations}  `
  //     + `Post-Deduction Cell Count: ${stats.totals.unresolvedCellCountAfterDeduction.toString().padStart(2, " ")}`)

  return difficultyReportToGameStat(stats, 0, gameNumber, 1, 1, 0);
}
