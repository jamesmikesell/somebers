import { DisplayCell } from '../src/app/model/game-board';
import { exportGameBoardsFromBackupFile } from './training-data-loader';


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
