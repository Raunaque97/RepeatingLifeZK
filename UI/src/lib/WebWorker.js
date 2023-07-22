import { Mina, PublicKey } from 'snarkyjs';
import { Board, generateProof } from '../../../build/src';

// console.log('worker loaded');
let gameOfLifeContractInstance = undefined;
onmessage = async (msg) => {
  // console.log('Message received from main script', msg.data);
  switch (msg.data.type) {
    case 'syn':
      postMessage({ ack: true });
      break;
    case 'loadContract':
      await loadContract(msg.data.address);
      postMessage({ loaded: true });
      break;
    case 'getSubmitSolutionTxProof':
      let txJson = await getSubmitSolutionTxProof(
        msg.data.steps,
        msg.data.solution
      );
      postMessage({ txJson: txJson });
      break;
    default:
      console.error('Unknown message type received', msg.data.type);
  }
};

async function loadContract(address) {
  const { GameOfLife, GameOfLifeZkProgram } = await import(
    '../../../build/src'
  );
  console.log('compiling zk program');
  let time = Date.now();
  await GameOfLifeZkProgram.compile();
  console.log('compiling game of life contract');
  await GameOfLife.compile();
  console.log('compiling took', (Date.now() - time) / 1000, 's');
  const zkAppAddress = PublicKey.fromBase58(address);
  // await fetchAccount({ publicKey: zkAppAddress });
  gameOfLifeContractInstance = new GameOfLife(zkAppAddress);
}

async function getSubmitSolutionTxProof(repeatStep, solution) {
  if (!gameOfLifeContractInstance) {
    console.warn('contract not loaded');
    return;
  }
  console.log('creating tx');
  try {
    const tx = await Mina.transaction(async () => {
      if (repeatStep == 1) {
        const solutionBoard = Board.from(solution);
        gameOfLifeContractInstance.submitStillSolution(solutionBoard);
      } else {
        const resursiveProof = await generateProof(solution, repeatStep);
        gameOfLifeContractInstance.submitRepeaterSolution(resursiveProof);
      }
    });
    // proving takes a while
    console.log('proving tx');
    let time = Date.now();
    await tx.prove();
    console.log('proving took', (Date.now() - time) / 1000, 's');
    return tx.toJSON();
  } catch (err) {
    console.log(err.message);
  }
}
