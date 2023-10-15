import { GameOfLife, generateProof } from './gameOfLife.js';
import {
  Board,
  boardSize,
  GameOfLifeZkProgram,
  GameOfLifeRecursiveProof,
} from './gameOfLifeZkProgram.js';
import { getNextState } from './gameOfLifeSimulator';

export {
  Board,
  boardSize,
  GameOfLife,
  GameOfLifeZkProgram,
  GameOfLifeRecursiveProof,
  generateProof,
  getNextState,
};
