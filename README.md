# Mina zkApp: RepeatingLife

The is a Play on [Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life).
The objective of the game is to find patterns that repeat themselves. Submit proof of solutions on mina chain to win points.

## How to get started

1. `npm run build` for building the contracts.
2. `zk config` for setting up the config file and create keys.
3. `zk deploy [alias]` for deploying the contracts on the chain.

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

## License
