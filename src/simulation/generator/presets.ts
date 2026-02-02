import { ISimulationConfig } from '../core/types';

export const LIGHT_SKIRMISH: ISimulationConfig = {
  seed: 0,
  turnLimit: 10,
  unitCount: { player: 2, opponent: 2 },
  mapRadius: 5,
};

export const STANDARD_LANCE: ISimulationConfig = {
  seed: 0,
  turnLimit: 20,
  unitCount: { player: 4, opponent: 4 },
  mapRadius: 7,
};

export const STRESS_TEST: ISimulationConfig = {
  seed: 0,
  turnLimit: 50,
  unitCount: { player: 4, opponent: 4 },
  mapRadius: 10,
};
