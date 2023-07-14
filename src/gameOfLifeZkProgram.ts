import { verifyCorrectTransition, verifyValidBoard } from './gameOfLife.js';
import {
  Struct,
  UInt32,
  Experimental,
  SelfProof,
  isReady,
  Circuit,
  Empty,
} from 'snarkyjs';

await isReady;

export const boardSize = 8;

export class Board extends Struct({
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
  initialState: Board, // initial board
  state: Board, // current state of the board after step
  step: UInt32,
}) {}

/**
 * Proofs that the RollupState is valid, given the initialState and step count, the final state is correct
 */
export const GameOfLifeZkProgram = Experimental.ZkProgram({
  publicInput: RollupState,

  methods: {
    // inialize the state.
    init: {
      privateInputs: [],
      method(rollupState: RollupState) {
        rollupState.initialState
          .equals(rollupState.state)
          .assertTrue('invalid initial state');
        rollupState.step.equals(UInt32.zero).assertTrue('step starts with 0');
        verifyValidBoard(rollupState.state);
      },
    },
    // run a step of the game of life
    step: {
      privateInputs: [SelfProof],
      method(
        rollupState: RollupState,
        earlierProof: SelfProof<RollupState, Empty>
      ) {
        earlierProof.verify();
        // step ++
        rollupState.step
          .equals(earlierProof.publicInput.step.add(1))
          .assertTrue();
        // initialState is the same
        rollupState.initialState
          .equals(earlierProof.publicInput.initialState)
          .assertTrue('initial states not same');
        verifyValidBoard(rollupState.state);
        verifyCorrectTransition(
          earlierProof.publicInput.state,
          rollupState.state
        );
      },
    },
    // TODO add method to join two proofs together, for parallel execution
  },
});
let Proof_ = Experimental.ZkProgram.Proof(GameOfLifeZkProgram);
export class GameOfLifeRecursiveProof extends Proof_ {}
