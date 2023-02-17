import {
  Field,
  SmartContract,
  method,
  isReady,
  Poseidon,
  Struct,
  Circuit,
  UInt32,
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

class GameOfLife extends SmartContract {
  @method init() {
    super.init();
  }
  /**
   * a still Solution is a pattern that does not change over time
   * @param solutionBoard
   */
  @method submitStillSolution(solutionBoard: Board) {
    let board = solutionBoard.value;
    // verify wheter all values are only 0 or 1

    for (let i = 0; i < boardSize; i++) {
      for (let j = 0; j < boardSize; j++) {
        board[i][j]
          .equals(UInt32.zero)
          .or(board[i][j].equals(UInt32.one))
          .assertTrue(i + ',' + j + ' has invalid value');
      }
    }

    this.correctTransition(solutionBoard, solutionBoard);
  }

  /**
   * Checks whether the transition from one board to another is valid.
   * Rules:     dead cells with 3 neighbours are born
   *            live cells with 2 or 3 neighbours survive
   * @param from
   * @param to
   */
  correctTransition(from: Board, to: Board) {
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
          .filter(
            ([i, j]) => i >= 0 && i < boardSize && j >= 0 && j < boardSize
          )
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
}
