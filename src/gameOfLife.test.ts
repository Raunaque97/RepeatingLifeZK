import { Board, GameOfLife } from './gameOfLife';
import { getNextState } from './gameOfLifeSimulator';
import {
  PrivateKey,
  PublicKey,
  Mina,
  AccountUpdate,
  UInt32,
  verify,
} from 'o1js';
import { GameOfLifeZkProgram } from './gameOfLifeZkProgram';

describe('gameOfLife Contract', () => {
  let zkApp: GameOfLife,
    zkAppPrivateKey: PrivateKey,
    zkAppAddress: PublicKey,
    sender: PublicKey,
    senderKey: PrivateKey;

  beforeEach(async () => {
    let Local = Mina.LocalBlockchain({ proofsEnabled: false });
    Mina.setActiveInstance(Local);
    sender = Local.testAccounts[0].publicKey;
    senderKey = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new GameOfLife(zkAppAddress);
  });

  it('accepts a correct StillSolution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sender, senderKey);

    let tx = await Mina.transaction(sender, () => {
      let zkApp = new GameOfLife(zkAppAddress);
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
      zkApp.submitStillSolution(Board.from(solution));
    });
    await tx.prove();
    await tx.sign([senderKey]).send();
  });

  it('rejects an incorrect solution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sender, senderKey);

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new GameOfLife(zkAppAddress);
        let solution = [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 1, 0, 0, 0, 0],
          [0, 0, 1, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        zkApp.submitStillSolution(Board.from(solution));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow('transition is not correct for 4,3');

    await expect(async () => {
      let tx = await Mina.transaction(sender, () => {
        let zkApp = new GameOfLife(zkAppAddress);
        let solution = [
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 1, 0, 0, 0, 0],
          [0, 0, 1, 2, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        zkApp.submitStillSolution(Board.from(solution));
      });
      await tx.prove();
      await tx.sign([senderKey]).send();
    }).rejects.toThrow('4,3 has invalid value');
  });

  it('accepts a correct RepeaterSolution', async () => {
    await deploy(zkApp, zkAppPrivateKey, sender, senderKey);

    let solution = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];

    const { verificationKey } = await GameOfLifeZkProgram.compile();
    let proof1 = await GameOfLifeZkProgram.init({
      state: Board.from(solution),
      initialState: Board.from(solution),
      step: UInt32.zero,
    });
    let proof2 = await GameOfLifeZkProgram.step(
      {
        state: Board.from(getNextState(solution)),
        initialState: Board.from(solution),
        step: UInt32.one,
      },
      proof1
    );
    let proof3 = await GameOfLifeZkProgram.step(
      {
        state: Board.from(solution),
        initialState: Board.from(solution),
        step: UInt32.from(2),
      },
      proof2
    );

    const isCorrect = await verify(proof3.toJSON(), verificationKey);
    expect(isCorrect).toBe(true);

    let tx = await Mina.transaction(sender, () => {
      let zkApp = new GameOfLife(zkAppAddress);
      zkApp.submitRepeaterSolution(proof3);
    });
    await tx.prove();
  });
});

async function deploy(
  zkApp: GameOfLife,
  zkAppPrivateKey: PrivateKey,
  sender: PublicKey,
  senderKey: PrivateKey
) {
  let tx = await Mina.transaction(sender, () => {
    AccountUpdate.fundNewAccount(sender);
    zkApp.deploy();
  });
  await tx.prove();
  // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
  await tx.sign([zkAppPrivateKey, senderKey]).send();
}
