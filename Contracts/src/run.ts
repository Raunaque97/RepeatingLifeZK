/**
 * This file specifies how to run the `SudokuZkApp` smart contract locally using the `Mina.LocalBlockchain()` method.
 * The `Mina.LocalBlockchain()` method specifies a ledger of accounts and contains logic for updating the ledger.
 *
 * Please note that this deployment is local and does not deploy to a live network.
 * If you wish to deploy to a live network, please use the zkapp-cli to deploy.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/run.js`.
 */

import { AccountUpdate, Mina, PrivateKey } from 'o1js';
import { Board, GameOfLife, generateProof } from './gameOfLife.js';
import { GameOfLifeZkProgram } from './gameOfLifeZkProgram.js';
import { getNextState } from './gameOfLifeSimulator.js';

// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkApp = new GameOfLife(zkAppAddress);

console.log('compiling ...');
console.time('compiling took');
const { verificationKey } = await GameOfLifeZkProgram.compile();
console.log('GameOfLifeZkProgram verificationKey', verificationKey);
await GameOfLife.compile();
console.timeEnd('compiling took');

console.log('creating Deploy transaction ...');
console.time('deploying took');
let tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkApp.deploy();
});
console.log('proving deploy txn ...');
await tx.prove();
await tx.sign([zkAppPrivateKey, senderKey]).send();
console.timeEnd('deploying took');

let solution = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

console.log('Submitting Still solution ...');
console.time('submitting took');
tx = await Mina.transaction(sender, () => {
  zkApp.submitStillSolution(Board.from(solution));
});
await tx.prove();
console.timeEnd('submitting took');
await tx.sign([senderKey]).send();

// Repeater solution
solution = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
// console.log(
//   getNextState(getNextState(solution))
//     .map((row) => row.join(''))
//     .join('\n')
// );
console.log('Submitting Repeater solution ...');
console.time('generating resursiveProof took');
let resursiveProof = await generateProof(solution, 2);
console.timeEnd('generating resursiveProof took');
// const isCorrect = await verify(proof3.toJSON(), verificationKey);
// expect(isCorrect).toBe(true);
tx = await Mina.transaction(sender, () => {
  let zkApp = new GameOfLife(zkAppAddress);
  zkApp.submitRepeaterSolution(resursiveProof);
});
console.time('submitting took');
await tx.prove();
console.timeEnd('submitting took');
await tx.sign([senderKey]).send();
