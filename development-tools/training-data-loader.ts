import { readFileSync, writeFileSync } from 'fs';
import { SavedGameStateV3 } from '../src/app/model/saved-game-data/saved-game-data.v3';
import { BoardStatAnalyzer } from '../src/app/service/board-stat-analyzer';
import { generateGameBoard } from '../src/app/service/gameboard-generator';
import { RawGenericFeatureSet } from '../src/app/service/ml-core';
import { difficultyReportToGameStat, GamePlayStats } from '../src/app/service/ml-difficulty-stats';
import { BoardGroupVersion } from '../src/app/model/grouping';
import { DisplayCell, GameBoard } from '../src/app/model/game-board';


export interface BackupGameData {
  gameBoard: GameBoard;
  gamePlayStats: GamePlayStats;
  boardNumber: number;
}


async function buildGameDataFromBackupFile(backupPath = 'development-tools/backup.json'): Promise<BackupGameData[]> {
  const backupRaw = readFileSync(backupPath, 'utf8');
  const savedState = JSON.parse(backupRaw) as SavedGameStateV3;

  const completionTimes = savedState.inProgressGames
    .filter(x => x.completed && x.timeSpent > 15000 && x.moveHistory && x.moveHistory.length)
    .map(x => x.moveHistory[x.moveHistory.length - 1].timestamp)

  const firstGameDate = Math.min(...completionTimes);
  const lastGameDate = Math.max(...completionTimes);
  const gameDatesDiff = lastGameDate - firstGameDate;

  const gameData: BackupGameData[] = [];
  for (const game of savedState.inProgressGames ?? []) {
    if (!game?.completed) continue;
    if ((game.timeSpent ?? 0) <= 15000) continue;
    if ((game.moveHistory?.filter((correctMove) => !correctMove).length ?? 0) > 10) continue;

    const gameBoard = await generateGameBoard(game.gameNumber);
    const completionTime = game.moveHistory[game.moveHistory.length - 1].timestamp;
    const gameDateAsPercent = (completionTime - firstGameDate) / gameDatesDiff;
    const moveTime = game.moveHistory[game.moveHistory.length - 1].timestamp - game.moveHistory[0].timestamp;
    const breaksMinutes = (moveTime - game.timeSpent) / 1000 / 60;
    
    const gamePlayStats: GamePlayStats = {
      timeSpent: game.timeSpent,
      gameNumber: game.gameNumber,
      gameDateAsPercent: gameDateAsPercent,
      breaksMinutes: breaksMinutes,
    }

    gameData.push({ gameBoard, gamePlayStats, boardNumber: game.gameNumber });
  }

  return gameData;
}


export async function computeStatsFromBackupFile(backupPath = 'development-tools/backup.json'): Promise<RawGenericFeatureSet[]> {
  console.log("Generating Stats...")
  const out: RawGenericFeatureSet[] = [];
  const gameData = await buildGameDataFromBackupFile(backupPath);

  for (const { gameBoard, gamePlayStats } of gameData) {
    const stats = BoardStatAnalyzer.evaluate(gameBoard.playArea);
    const s = difficultyReportToGameStat(stats, gamePlayStats)

    out.push(s);
  }
  return out;
}


function projectFullBoard(fullBoard: DisplayCell[][], includeFields?: (keyof DisplayCell)[]): (Partial<DisplayCell> | undefined)[][] {
  const defaultFields: (keyof DisplayCell)[] = ['required', 'value', 'groupNumber'];

  const pickFields = (cell: DisplayCell): Partial<DisplayCell> => {
    const fields: ReadonlyArray<keyof DisplayCell> = includeFields?.length ? includeFields : defaultFields;

    const result: Partial<Record<keyof DisplayCell, DisplayCell[keyof DisplayCell]>> = {};
    fields.forEach(key => {
      result[key] = cell[key];
    });
    return result as Partial<DisplayCell>;
  };

  return fullBoard.map(row => row.map(cell => cell ? pickFields(cell) : undefined));
}


export async function exportGameBoardsFromBackupFile(
  backupPath = 'development-tools/backup.json',
  outputPath = 'development-tools/game-board-export.json',
  includeFullBoardFields?: (keyof DisplayCell)[],
): Promise<Array<{ boardNumber: number; fullBoard: (Partial<DisplayCell> | undefined)[][]; gamePlayStats: GamePlayStats }>> {
  const gameData = await buildGameDataFromBackupFile(backupPath);
  const serializedGames = gameData.map(({ gameBoard, gamePlayStats, boardNumber }) => ({
    boardNumber,
    fullBoard: projectFullBoard(gameBoard.fullBoard, includeFullBoardFields),
    gamePlayStats,
  }));

  writeFileSync(outputPath, JSON.stringify(serializedGames, null, 2));
  return serializedGames;
}


export async function buildRawGameStatForGameNumber(gameNumber: number, version: BoardGroupVersion = 1): Promise<RawGenericFeatureSet> {
  const playArea = (await generateGameBoard(gameNumber, version)).playArea;
  const stats = BoardStatAnalyzer.evaluate(playArea);

  // if (stats.totals.unresolvedCellCountAfterDeduction)
  //   console.log(`Game: ${gameNumber.toString().padStart(4, " ")}  `
  //     + `Size: ${stats.totals.columnsEvaluated}x${stats.totals.columnsEvaluated}  `
  //     + `Deduction Iterations: ${stats.totals.deductionIterations}  `
  //     + `Post-Deduction Cell Count: ${stats.totals.unresolvedCellCountAfterDeduction.toString().padStart(2, " ")}`)

  const gamePlayStats: GamePlayStats = {
    timeSpent: 0,
    gameNumber: gameNumber,
    gameDateAsPercent: 1,
    breaksMinutes: 0,
  }

  return difficultyReportToGameStat(stats, gamePlayStats);
}
