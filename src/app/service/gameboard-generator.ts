import { DisplayCell, GameBoard } from '../model/game-board';
import { BoardGroupGenerator } from '../model/grouping';
import { Random } from '../model/random';


export function generateGameBoard(gameNumber: number): GameBoard {
  let gameSeed = Random.generateFromSeed(gameNumber) * Number.MAX_SAFE_INTEGER;

  // This grid offset is to ensure the first few games a player completes start off with small and easy grid sizes [5, 5, 5, 6, 6, 6, 7, 7, 8]
  const gridStartOffset = gameNumber + 87228;
  let gridMin = 5;
  let gridMax = 9;
  const gridSize = Math.floor(Random.generateFromSeed(gridStartOffset) * (gridMax - gridMin + 1) + gridMin);
  const grid = new BoardGroupGenerator(gameNumber).generateRandomContiguousGroups(gridSize);

  let random = new Random(gameSeed);
  let gameBoard = new GameBoard();
  gameBoard.playArea = grid.map((row) => row.map((cellGroupNumber) => {
    let cell = new DisplayCell();
    cell.value = Math.floor(random.next() * 9) + 1;
    cell.groupNumber = cellGroupNumber;
    cell.required = random.next() < 0.4;

    return cell
  }));

  gameBoard.constructBoard(gameNumber);

  return gameBoard;
}

