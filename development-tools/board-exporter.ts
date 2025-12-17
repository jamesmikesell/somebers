import { writeFileSync } from 'fs';
import { DisplayCell } from '../src/app/model/game-board';
import { GamePlayStats } from '../src/app/service/ml-difficulty-stats';
import { buildGameDataFromBackupFile } from './training-data-loader';


// 
// 
// run via:
//   npx ts-node -P tsconfig.node.json --compiler-options '{"module":"CommonJS"}' development-tools/board-exporter.ts 
// 



const [, , backupPathArg, outputPathArg, fieldsArg] = process.argv;

const backupPath = backupPathArg ?? 'development-tools/backup.json';
const outputPath = outputPathArg ?? 'development-tools/game-board-export.json';
const includeFields = fieldsArg
  ? (fieldsArg.split(',').map(f => f.trim()).filter(Boolean) as (keyof DisplayCell)[])
  : undefined;

(async () => {
  try {
    await exportGameBoardsFromBackupFile(backupPath, outputPath, includeFields);
    console.log(`Exported game boards to ${outputPath}`);
  } catch (err) {
    console.error('Failed to export game boards', err);
    process.exit(1);
  }
})();




async function exportGameBoardsFromBackupFile(
  backupPath = 'development-tools/backup.json',
  outputPath = 'development-tools/game-board-export.json',
  includeFullBoardFields?: (keyof DisplayCell)[],
): Promise<Array<{ fullBoard: (Partial<DisplayCell> | undefined)[][]; gamePlayStats: GamePlayStats }>> {
  const gameData = await buildGameDataFromBackupFile(backupPath);
  let serializedGames = gameData.map(({ gameBoard, gamePlayStats }) => ({
    fullBoard: projectFullBoard(gameBoard.fullBoard, includeFullBoardFields),
    gamePlayStats,
  }))

  
  // serializedGames = [serializedGames[5], serializedGames[100], serializedGames[704]];
  // console.log(
  //   downSampled[0].fullBoard.length,
  //   downSampled[1].fullBoard.length,
  //   downSampled[2].fullBoard.length,
  // )

  writeFileSync(outputPath, JSON.stringify(serializedGames, null, 2));
  return serializedGames;
}


function projectFullBoard(fullBoard: DisplayCell[][], includeFields?: (keyof DisplayCell)[]): (Partial<DisplayCell> | undefined)[][] {
  const defaultFields: (keyof DisplayCell)[] = ['colorGroupGoal', 'value', 'groupNumber'];

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
