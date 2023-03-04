import {
  SmartContract,
  method,
  isReady,
  Struct,
  Circuit,
  UInt32,
  Experimental,
  SelfProof,
} from 'snarkyjs';
import { getNextState } from './gameOfLifeSimulator.js';

export { Board, GameOfLife };

await isReady;

const boardSize = 8;

class Board extends Struct({
  value: Circuit.array(Circuit.array(UInt32, boardSize), boardSize),
}) {
  static from(value: number[][]) {
    return new Board({
      value: value.map((row) => row.map((v) => UInt32.from(v))),
    });
  }
  equals(other: Board) {
    return this.value
      .map((row, i) =>
        row
          .map((v, j) => v.equals(other.value[i][j]))
          .reduce((a, b) => a.and(b))
      )
      .reduce((a, b) => a.and(b));
  }
}

class RollupState extends Struct({
  state: Board,
  initialState: Board,
  step: UInt32,
}) {}

export const GameOfLifeZkProgram = Experimental.ZkProgram({
  publicInput: RollupState, // hash of the board

  methods: {
    init: {
      privateInputs: [Board],
      method(rollupState: RollupState, board: Board) {
        rollupState.state.equals(board).assertTrue('invalid board');
        rollupState.initialState
          .equals(board)
          .assertTrue('invalid initial state');
        rollupState.step.equals(UInt32.zero).assertTrue('step starts with 0');
        verifyValidBoard(board);
      },
    },
    step: {
      privateInputs: [Board, Board, SelfProof],
      method(
        rollupState: RollupState,
        oldBoard: Board,
        newBoard: Board,
        earlierProof: SelfProof<RollupState>
      ) {
        earlierProof.verify();
        // step ++
        rollupState.step
          .equals(earlierProof.publicInput.step.add(1))
          .assertTrue();
        // stateHash = hash(newBoard)
        rollupState.state.equals(newBoard).assertTrue('invalid new board');
        // initialStateHash should not change
        rollupState.initialState
          .equals(earlierProof.publicInput.initialState)
          .assertTrue('invalid initial state');
        // verify correct oldBoard is provided
        oldBoard
          .equals(earlierProof.publicInput.state)
          .assertTrue('invalid old board');
        verifyValidBoard(newBoard);
        verifyCorrectTransition(oldBoard, newBoard);
      },
    },
  },
});
let Proof_ = Experimental.ZkProgram.Proof(GameOfLifeZkProgram);
export class GameOfLifeRecursiveProof extends Proof_ {}

/****************************************************************************************
 * The GameOfLife contract
 * The contract allows to submit solutions to the Game of Life
 * A solution is a board that is a still solution or a repeater solution
 * A still solution is a pattern that does not change over time
 * A repeater solution is a pattern that repeats itself after a certain number of steps
 ****************************************************************************************/
class GameOfLife extends SmartContract {
  @method init() {
    super.init();
  }
  /**
   * a still Solution is a pattern that does not change over time
   * @param solutionBoard
   */
  @method submitStillSolution(solutionBoard: Board) {
    // verify wheter all values are only 0 or 1
    verifyValidBoard(solutionBoard);
    verifyCorrectTransition(solutionBoard, solutionBoard);
  }
  /**
   * a repeater Solution is a pattern that repeats itself after a certain number of steps(n)
   * @param solutionBoard
   */
  @method submitRepeaterSolution(zkProgram: GameOfLifeRecursiveProof) {
    zkProgram.verify();
    zkProgram.publicInput.initialState
      .equals(zkProgram.publicInput.state)
      .assertTrue('first and last board must be the same');
    // step >= 2
    zkProgram.publicInput.step
      .greaterThan(UInt32.from(1))
      .assertTrue('steps >= 2');
  }
}

/**
 * verify wheter all values are only 0 or 1
 */
function verifyValidBoard(board: Board) {
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      board.value[i][j]
        .equals(UInt32.zero)
        .or(board.value[i][j].equals(UInt32.one))
        .assertTrue(i + ',' + j + ' has invalid value');
    }
  }
}

/****************************************************************************************
 * Utility functions
 ****************************************************************************************/

/**
 * Checks whether the transition from one board to another is valid.
 * Rules:     dead cells with 3 neighbours are born
 *            live cells with 2 or 3 neighbours survive
 * @param from
 * @param to
 */
function verifyCorrectTransition(from: Board, to: Board) {
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      let liveNeighbours = [
        [i - 1, j - 1],
        [i, j - 1],
        [i + 1, j - 1],
        [i - 1, j],
        [i + 1, j],
        [i - 1, j + 1],
        [i, j + 1],
        [i + 1, j + 1],
      ]
        .filter(([i, j]) => i >= 0 && i < boardSize && j >= 0 && j < boardSize)
        .map(([i, j]) => from.value[i][j])
        .reduce((a, b) => a.add(b), UInt32.zero);

      let newValue = Circuit.if(
        from.value[i][j].equals(UInt32.zero),
        // if the cell is dead it is gets reborn if it has 3 neighbours
        Circuit.if(
          liveNeighbours.equals(UInt32.from(3)),
          UInt32.one,
          UInt32.zero
        ),
        // if the cell is alive it survives if it has 2 or 3 neighbours
        Circuit.if(
          liveNeighbours
            .equals(UInt32.from(3))
            .or(liveNeighbours.equals(UInt32.from(2))),
          UInt32.one,
          UInt32.zero
        )
      );

      to.value[i][j]
        .equals(newValue)
        .assertTrue('transition is not correct for ' + i + ',' + j);
    }
  }
}

/**
 * GameOfLifeZkProgram should be compiled
 * @param board
 * @param n number of steps to simulate
 */
export async function generateProof(
  solution: number[][],
  n: number
): Promise<GameOfLifeRecursiveProof> {
  let initialBoard = Board.from(solution);
  let proof = await GameOfLifeZkProgram.init(
    {
      state: initialBoard,
      initialState: initialBoard,
      step: UInt32.zero,
    },
    initialBoard
  );
  let step = 1;
  let board = solution;
  let nextBoard = getNextState(board);
  while (step <= n) {
    proof = await GameOfLifeZkProgram.step(
      {
        state: Board.from(nextBoard),
        initialState: initialBoard,
        step: UInt32.from(step),
      },
      Board.from(board),
      Board.from(nextBoard),
      proof
    );
    step++;
    board = nextBoard;
    nextBoard = getNextState(board);
  }
  return proof;
}
