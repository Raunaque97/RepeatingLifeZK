<script>
  export let board;
  export let frozen = false;

  function toggleCell(row, col) {
    if (!frozen) board[row][col] = 1 - board[row][col];
  }
</script>

<div class="grid {frozen ? 'frozen' : ''}">
  {#each board as row, i}
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
  .frozen {
    background-color: rgba(0, 0, 0, 0.5);
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
