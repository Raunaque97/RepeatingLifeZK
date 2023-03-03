<script>
  import { getNextState } from '../../../src/gameOfLifeSimulator';

  let grid = Array(8)
    .fill()
    .map(() => Array(8).fill(0)); // initialize an 8x8 grid with all cells dead

  let simulating = false;
  let step;

  function toggleCell(row, col) {
    if (!simulating) grid[row][col] = 1 - grid[row][col];
  }

  let intervalId = null;
  function simulateGame() {
    // simulate the game of life
    if (simulating) return;

    simulating = true;
    step = 1;
    intervalId = setInterval(() => {
      grid = getNextState(grid);
      console.log('simulating', step);
      step++;
    }, 500);
  }
  function stopGame() {
    clearInterval(intervalId);
    simulating = false;
  }
</script>

<div class="grid">
  {#each grid as row, i}
    <div>
      {#each row as cell, j}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <p
          class="cell {cell ? 'alive' : ''}"
          on:click={() => toggleCell(i, j)}
        />
      {/each}
    </div>
  {/each}
  <button on:click={simulating ? stopGame : simulateGame}>
    {simulating ? 'Stop' : 'Start'}
  </button>
</div>

<style>
  .cell {
    width: 20px;
    height: 20px;
    border: 1px solid #ccc;
    background-color: white;
    display: inline-block;
    margin: 2px;
    margin-bottom: 0px;
    margin-top: 0px;
    cursor: pointer;
  }
  .cell.alive {
    background-color: #333;
  }
  .grid {
    margin: 20px auto;
    text-align: center;
  }
  button {
    margin-top: 20px;
    padding: 10px 20px;
    border: none;
    background-color: #333;
    color: white;
    font-size: 16px;
    cursor: pointer;
  }
</style>
