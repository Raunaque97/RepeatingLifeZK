# Mina zkApp: RepeatingLife

The is a Play on [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life).
The objective of the game is to find patterns that repeat themselves. Submit proof of solutions on mina chain to win points.

point system using customToken [WIP]

## How to get started

- `npm run build` for building the contracts.
- `npm run start` to start `run.ts` inside contracts.
- `npm run dev` to test the svelt frontend.
- `zk config` for setting up the config file and create keys.
- `npm run deploy` for deploying the contracts on the chain using `customDeploy` script inside contracts.

A simple frontend is implemented in `UI/` for testing the contracts.

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```
