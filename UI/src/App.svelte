<script lang="ts">
  import { onMount } from 'svelte';
  import { Mina, PublicKey, fetchAccount } from 'snarkyjs';
  import { Board, generateProof } from 'game_of_life';
  import GameOfLifeSim from './lib/GameOfLifeSim.svelte';
  import InputBoard from './lib/InputBoard.svelte';
  import { getNextState } from '../../src/gameOfLifeSimulator';
  import { findRepeatStep } from './lib/Helpers';
  import ContractController from './lib/ContractController';

  let accounts;
  let submitting = false;
  let contractLoaded = false;
  let solution = Array(8)
    .fill([])
    .map(() => Array(8).fill(0));

  Mina.Network('https://proxy.berkeley.minaexplorer.com/graphql');

  let contractController = new ContractController();
  onMount(async () => {
    await contractController.loadContract();
    contractLoaded = true;
  });

  async function connectWallet() {
    try {
      // Accounts is an array of string Mina addresses.
      accounts = await window?.mina?.requestAccounts();
    } catch (err) {
      console.log(err.message);
    }
  }

  async function onSubmit() {
    console.log('submitting...');
    submitting = true;
    if (solution.every((row) => row.every((cell) => cell == 0))) {
      console.log('%c Invalid solution!', 'color: red ; font-weight: bold');
      submitting = false;
      return;
    }
    let repeatStep = findRepeatStep(solution);
    if (repeatStep == 1) {
      //found a still life
      console.log(
        '%c Great! You found a still life!',
        'color: green ; font-weight: bold'
      );
    } else if (repeatStep > 1) {
      //found a repeating pattern
      console.log(
        '%c Great! You found a repeating pattern!',
        'color: green ; font-weight: bold'
      );
    } else {
      //not a valid solution
      console.log('%c Invalid solution!', 'color: red ; font-weight: bold');
      submitting = false;
      return;
    }
    try {
      await contractController
        .submitSolution(solution, repeatStep)
        .catch((err) => {
          console.warn('submit failed', err);
        });
    } catch (err) {
      console.log(err);
    } finally {
      submitting = false;
    }
  }
</script>

<main>
  <h1>Repeating Life, Game of Life</h1>
  <div style="justify-content: right;">
    {#if accounts}
      <h3>connected to: {accounts[0].substring(0, 7)}...</h3>
    {:else}
      <button on:click={connectWallet}>Connect Wallet</button>
    {/if}
  </div>

  <div
    style="background-color: rgba(0, 0, 0, 0.6); margin: 20px; padding: 20px; border-radius: 15px;"
  >
    <div style="text-align: left;">
      <h3>Rules Of life</h3>
      The Game of Life is a cellular automaton invented by John Conway in 1970.<br
      />
      The rules are simple:<br />
      {' '}1. Any live cell with two or three live neighbours survives. <br />
      {' '}2. Any dead cell with exactly three live neighbours becomes a live
      cell.<br />
      {' '}3. All other live cells die in the next generation. <br />
    </div>
    <h4>
      The Objective of this game is to find <strong>special</strong>
      configurations of cells that will survive forever. <br />
      Stays same or repeats after some time. <br />
    </h4>
  </div>
  <div style="display: flex; padding: 10px; justify-content: space-evenly;">
    <GameOfLifeSim />
    <div>
      {#if !contractLoaded}
        <h3>compiling contracts ...</h3>
      {:else}
        <!-- submit button -->
        {#if submitting}
          <InputBoard bind:board={solution} frozen={true} />
          <h3>submitting...</h3>
        {:else}
          <InputBoard bind:board={solution} frozen={false} />
          <button on:click={onSubmit}>Submit</button>
        {/if}
      {/if}
    </div>
  </div>
</main>

<style>
</style>
