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

import { AccountUpdate, Mina, PrivateKey, shutdown, UInt32 } from 'snarkyjs';
import { Board, GameOfLife, GameOfLifeZkProgram } from './gameOfLife.js';
import { getNextState } from './gameOfLifeSimulator.js';
// setup
const Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

const { privateKey: senderKey, publicKey: sender } = Local.testAccounts[0];
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
// create an instance of the smart contract
const zkApp = new GameOfLife(zkAppAddress);

console.log('compiling...');
const { verificationKey } = await GameOfLifeZkProgram.compile();
console.log('verificationKey', verificationKey);
await GameOfLife.compile();
console.log('creating Deploy transaction...');
let tx = await Mina.transaction(sender, () => {
  AccountUpdate.fundNewAccount(sender);
  zkApp.deploy();
});
console.log('proving...');
let time = Date.now();
await tx.prove();
console.log('proving Deploy took', Date.now() - time, 'ms');
await tx.sign([zkAppPrivateKey, senderKey]).send();

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

// console.log('Submitting solution...');
// tx = await Mina.transaction(sender, () => {
//   zkApp.submitStillSolution(Board.from(solution));
// });
// time = Date.now();
// await tx.prove();
// console.log('proving took', Date.now() - time, 'ms');
// await tx.sign([senderKey]).send();

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

time = Date.now();
let proof1 = await GameOfLifeZkProgram.init(
  {
    state: Board.from(solution),
    initialState: Board.from(solution),
    step: UInt32.zero,
  },
  Board.from(solution)
);
console.log('generating proof1 took', Date.now() - time, 'ms');
time = Date.now();
let proof2 = await GameOfLifeZkProgram.step(
  {
    state: Board.from(getNextState(solution)),
    initialState: Board.from(solution),
    step: UInt32.from(1),
  },
  Board.from(solution),
  Board.from(getNextState(solution)),
  proof1
);
console.log('generating proof2 took', Date.now() - time, 'ms');
time = Date.now();
let proof3 = await GameOfLifeZkProgram.step(
  {
    state: Board.from(solution),
    initialState: Board.from(solution),
    step: UInt32.from(2),
  },
  Board.from(getNextState(solution)),
  Board.from(solution),
  proof2
);
console.log('generating proof3 took', Date.now() - time, 'ms');

// const isCorrect = await verify(proof3.toJSON(), verificationKey);
// expect(isCorrect).toBe(true);

tx = await Mina.transaction(sender, () => {
  let zkApp = new GameOfLife(zkAppAddress);
  zkApp.submitRepeaterSolution(proof3, UInt32.from(2));
});
time = Date.now();
await tx.prove();
console.log('proving took', Date.now() - time, 'ms');
await tx.sign([senderKey]).send();

// cleanup
await shutdown();
