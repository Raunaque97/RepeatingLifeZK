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
  MerkleMapWitness,
  state,
  State,
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

const Rollup = Experimental.ZkProgram({
  publicInput: Board,

  methods: {
    init: {
      privateInputs: [],
      method(board: Board) {
        verifyValidBoard(board);
      },
    },
    step: {
      privateInputs: [SelfProof],
      method(newBoard: Board, earlierProof: SelfProof<Board>) {
        earlierProof.verify();
        verifyValidBoard(newBoard);
        verifyCorrectTransition(earlierProof.publicInput, newBoard);
      },
    },
  },
});

class GameOfLife extends SmartContract {
  @state(Field) treeRoot = State<Field>();

  @method init() {
    super.init();
    this.treeRoot.set(Field.zero);
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
        .reduce((a, b) => a.add(b.toString()), Field(0));

      let newValue = Circuit.if(
        from.value[i][j].equals(UInt32.zero),
        // if the cell is dead it is gets reborn if it has 3 neighbours
        Circuit.if(liveNeighbours.equals(3), UInt32.one, UInt32.zero),
        // if the cell is alive it survives if it has 2 or 3 neighbours
        Circuit.if(
          liveNeighbours.equals(3).or(liveNeighbours.equals(2)),
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
