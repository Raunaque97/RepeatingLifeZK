import { getNextState } from '../../../src/gameOfLifeSimulator';

export function isStillLife(board: number[][]): boolean {
  const nextState = getNextState(board);
  return nextState.every((row, i) =>
    row.every((cell, j) => cell === board[i][j])
  );
}

// returns number of steps until the board repeats itself or -1 if it never does
export function findRepeatStep(board: number[][]): number {
  // simulate in a while loop until we find the initial state again or get stuck in a stillLife
  let nextState = getNextState(board);
  let steps = 0;
  while (true) {
    steps++;
    if (
      nextState.every((row, i) => row.every((cell, j) => cell === board[i][j]))
    ) {
      return steps;
    } else if (isStillLife(nextState)) {
      return -1;
    }
    nextState = getNextState(nextState);
  }
}
