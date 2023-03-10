import {
  Field,
  SmartContract,
  method,
  isReady,
  Poseidon,
  Struct,
  Circuit,
  UInt32,
  Experimental,
  SelfProof,
} from 'snarkyjs';

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
  hash() {
    return Poseidon.hash(
      this.value
        .flat()
        .map((v) => v.toFields())
        .flat()
    );
  }
}

class RollupState extends Struct({
  stateHash: Field,
  initialStateHash: Field,
  step: UInt32,
}) {}

export const GameOfLifeZkProgram = Experimental.ZkProgram({
  publicInput: RollupState, // hash of the board

  methods: {
    init: {
      privateInputs: [Board],
      method(rollupState: RollupState, board: Board) {
        rollupState.stateHash.equals(board.hash()).assertTrue('invalid board');
        rollupState.initialStateHash
          .equals(rollupState.stateHash)
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
        rollupState.stateHash
          .equals(newBoard.hash())
          .assertTrue('invalid new board');
        // initialStateHash should not change
        rollupState.initialStateHash
          .equals(earlierProof.publicInput.initialStateHash)
          .assertTrue('invalid initial state');
        // verify correct oldBoard is provided
        oldBoard
          .hash()
          .equals(earlierProof.publicInput.stateHash)
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
  @method submitRepeaterSolution(
    zkProgram: GameOfLifeRecursiveProof,
    n: UInt32
  ) {
    zkProgram.verify();
    zkProgram.publicInput.initialStateHash.assertEquals(
      zkProgram.publicInput.stateHash
    );
    zkProgram.publicInput.step.assertEquals(n);
    // n >= 2
    n.greaterThan(UInt32.from(1)).assertTrue('n must be greater than 1');
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
