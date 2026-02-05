/**
 * Simulation context that holds seeded random, config, and state
 */

import { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import { SeededRandom } from './SeededRandom';
import { ISimulationConfig } from './types';

export class SimulationContext {
  readonly random: SeededRandom;
  readonly config: ISimulationConfig;
  state: IGameState | null;

  constructor(config: ISimulationConfig) {
    this.config = config;
    this.random = new SeededRandom(config.seed);
    this.state = null;
  }

  reset(): void {
    this.random.reset();
    this.state = null;
  }
}
