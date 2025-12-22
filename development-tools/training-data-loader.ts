import { readFileSync } from 'fs';
import { SimpleCell } from '../src/app/model/game-board';
import { BoardGroupVersion } from '../src/app/model/grouping';
import { SavedGameStateV3 } from '../src/app/model/saved-game-data/saved-game-data.v3';
import { BoardStatAnalyzer } from '../src/app/service/board-stat-analyzer';
import { generateGameBoard } from '../src/app/service/gameboard-generator';
import { RawGenericFeatureSet } from '../src/app/service/ml-core';
import { difficultyReportToGameStat, GamePlayStats } from '../src/app/service/ml-difficulty-stats';


export async function computeStatsFromBackupFile(backupPath = 'development-tools/backup.json'): Promise<RawGenericFeatureSet[]> {
  const backupRaw = readFileSync(backupPath, 'utf8');
  const savedState = JSON.parse(backupRaw) as SavedGameStateV3;

  const completionTimes = savedState.inProgressGames
    .filter(x => x.completed && x.timeSpent > 15000 && x.moveHistory && x.moveHistory.length)
    .map(x => x.moveHistory[x.moveHistory.length - 1].timestamp)

  const firstGameDate = Math.min(...completionTimes);
  const lastGameDate = Math.max(...completionTimes);
  const gameDatesDiff = lastGameDate - firstGameDate;

  const filteredGames = savedState.inProgressGames.filter(game => {
    if (!game?.completed
      || (game.timeSpent ?? 0) <= 10000
      || (game.moveHistory?.filter((correctMove) => !correctMove).length ?? 0) > 10
    ) {
      return false;
    }

    return true;
  })

  if (!filteredGames.some(game => game.gameNumber === 471)) {
    const lastGame = filteredGames[filteredGames.length - 1];
    const moveHistoryClone = lastGame?.moveHistory ? lastGame.moveHistory.map(move => ({ ...move })) : [];
    filteredGames.push({
      gameNumber: 471,
      completed: true,
      moveHistory: moveHistoryClone,
      timeSpent: 4 * 60 * 60 * 1000,
    });
    console.log('');
    console.warn('!!! WARNING !!! Injected fake game 471 into training set with a fake solve time of 4 hours.');
    console.log('');
  }

  console.log("Generating Stats...")
  const out: RawGenericFeatureSet[] = [];
  for (const game of filteredGames ?? []) {
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
    
    const baseLayout = toSimpleGrid(gameBoard.playArea);
    const augmentedLayouts = buildAugmentedLayouts(baseLayout);
    // const augmentedLayouts = [baseLayout];
    for (const layout of augmentedLayouts) {
      const stats = BoardStatAnalyzer.evaluate(layout);
      const s = difficultyReportToGameStat(stats, gamePlayStats)

      out.push(s);
    }
  }

  return JSON.parse(JSON.stringify(out)) as RawGenericFeatureSet[];
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

function toSimpleGrid(grid: SimpleCell[][]): SimpleCell[][] {
  return grid.map(row => row.map(cell => ({
    required: cell.required,
    value: cell.value,
    groupNumber: cell.groupNumber,
  })));
}

function buildAugmentedLayouts(baseLayout: SimpleCell[][]): SimpleCell[][][] {
  const rotations = buildRotations(baseLayout);
  const flipped = flipHorizontal(baseLayout);
  const flippedRotations = buildRotations(flipped);

  return [baseLayout, ...rotations, flipped, ...flippedRotations];
}

function buildRotations(layout: SimpleCell[][]): SimpleCell[][][] {
  const rotated90 = rotate90(layout);
  const rotated180 = rotate90(rotated90);
  const rotated270 = rotate90(rotated180);
  return [rotated90, rotated180, rotated270];
}

function rotate90(layout: SimpleCell[][]): SimpleCell[][] {
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const rotated: SimpleCell[][] = Array.from({ length: cols }, () => Array(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = layout[r][c];
    }
  }

  return rotated;
}

function flipHorizontal(layout: SimpleCell[][]): SimpleCell[][] {
  return layout.map(row => [...row].reverse());
}
