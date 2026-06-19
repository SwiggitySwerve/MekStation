import type {
  IEnvironmentalConditions,
  IGameSession,
  IHexCoordinate,
} from '@/types/gameplay';

import type { CriticalSlotManifest } from './criticalHitResolution';
import type { D6Roller, DiceRoller } from './diceTypes';

export interface IResolveHeatPhaseOptions {
  readonly getWaterDepth?: (unitId: string, position: IHexCoordinate) => number;
  readonly getEnvironmentHeatEffect?: (
    unitId: string,
    position: IHexCoordinate,
  ) => number;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly maxTechHeatScale?: boolean;
  readonly criticalManifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly maxTechCriticalLocationRoller?: () => number;
}

export type HeatPhaseUnit = IGameSession['units'][number];
export type HeatPhaseUnitState = IGameSession['currentState']['units'][string];

export interface HeatPhaseUnitContext {
  readonly unitId: string;
  readonly unit: HeatPhaseUnit;
  readonly unitState: HeatPhaseUnitState;
  readonly turn: number;
  readonly hotDogTargetNumberModifier: number;
  readonly diceRoller: DiceRoller;
  readonly options?: IResolveHeatPhaseOptions;
}

export interface HeatCriticalContext {
  readonly enabled: boolean;
  readonly getOrSeedCriticalManifest: (unitId: string) => CriticalSlotManifest;
  readonly heatCriticalD6Roller: D6Roller;
  readonly maxTechCriticalLocationRoller: () => number;
}
