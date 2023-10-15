import WebWorker from './WebWorker?worker';

/**
 * Uses webWorker to interact with the mina blockchain
 */
export default class ContractController {
  worker: Worker | undefined;
  loaded = false;
  workerReady = false;
  readonly zkAppAddress =
    'B62qoddkoudymaz67Akgpq78xnHEQGfFKFu3b1gKegHfViS7u67fitc';

  // define constructor
  constructor() {
    this.worker = new WebWorker();

    this.worker.onmessage = (m) => {
      console.log('Message received from worker', m.data);
      if (m.data?.ack) {
        this.workerReady = true;
      }
    };
    this.worker.onerror = (e) => {
      console.log('Error received from worker', e);
    };
    // this.worker.postMessage({ type: 'syn' });
    console.log('Worker created', this.worker);
  }

  async loadContract(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.loaded) {
        resolve();
        return;
      }
      if (!this.worker) {
        reject();
        return;
      }
      // send a syn in a loop until worker is ready
      // This is a workaround as there is no way to know when the worker is ready
      while (!this.workerReady) {
        this.worker.postMessage({ type: 'syn' });
        await new Promise((r) => setTimeout(r, 1000));
      }
      this.worker.postMessage({
        type: 'loadContract',
        address: this.zkAppAddress,
      });
      this.worker.onmessage = (msg) => {
        if (msg.data.loaded) {
          this.loaded = true;
          resolve();
        }
        reject();
      };
    });
  }

  async submitSolution(solution: number[][], steps: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.worker || !this.loaded || !this.workerReady) {
        reject();
        return;
      }
      this.worker.onmessage = async (msg) => {
        if (msg.data.txJson) {
          // send the transaction
          console.log('submitting on-chain ...');
          try {
            const { hash } = await window?.mina?.sendTransaction({
              transaction: msg.data.txJson,
              feePayer: {
                fee: '0.1',
              },
            });
            console.log('transaction hash:', hash);
            resolve();
          } catch (e) {
            console.log('error submitting transaction', e);
            reject();
            return;
          }
        }
        reject();
      };
      this.worker.postMessage({
        type: 'getSubmitSolutionTxProof',
        solution: solution,
        steps: steps,
      });
    });
  }
}
