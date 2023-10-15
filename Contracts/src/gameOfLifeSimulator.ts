// returns a new array containing the next state of the board
export function getNextState(board: number[][]): number[][] {
  const nextState: number[][] = [];
  for (let i = 0; i < board.length; i++) {
    nextState.push([]);
    for (let j = 0; j < board[i].length; j++) {
      let aliveNeighbours = getAliveNeighbours(board, i, j);
      // if the cell is 0 (dead) and has 3 alive neighbours it becomes alive
      if (board[i][j] === 0 && aliveNeighbours === 3) {
        nextState[i].push(1);
      }
      // if the cell is alive it survives if it has 2 or 3 alive neighbours
      else if (
        board[i][j] === 1 &&
        (aliveNeighbours === 2 || aliveNeighbours === 3)
      ) {
        nextState[i].push(1);
      } else {
        nextState[i].push(0);
      }
    }
  }
  return nextState;
}

function getAliveNeighbours(board: number[][], i: number, j: number): number {
  let aliveNeighbours = 0;
  // check all neighbours
  for (let k = -1; k <= 1; k++) {
    for (let l = -1; l <= 1; l++) {
      if (
        (k !== 0 || l !== 0) && // if the neighbour is not the cell itself
        k + i >= 0 &&
        k + i < board.length &&
        l + j >= 0 &&
        l + j < board[i].length &&
        board[i + k][j + l] === 1
      ) {
        aliveNeighbours++;
      }
    }
  }
  return aliveNeighbours;
}
