import {
  CombatLocation,
  IDamageResult,
  ILocationDamage,
  IPilotDamageResult,
} from '@/types/gameplay';

import { roll2d6 } from '../hitLocation';

export type RearArmorLocation = 'center_torso' | 'left_torso' | 'right_torso';

export interface IUnitDamageState {
  readonly armor: Readonly<Record<CombatLocation, number>>;
  readonly rearArmor: Readonly<Record<RearArmorLocation, number>>;
  readonly structure: Readonly<Record<CombatLocation, number>>;
  readonly destroyedLocations: readonly CombatLocation[];
  readonly pilotWounds: number;
  readonly pilotConscious: boolean;
  readonly destroyed: boolean;
  readonly destructionCause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed';
}

export interface ILocationDamageResult {
  state: IUnitDamageState;
  result: ILocationDamage;
}

export interface IDamageWithTransferResult {
  state: IUnitDamageState;
  results: ILocationDamage[];
}

export interface IPilotDamageResultWithState {
  state: IUnitDamageState;
  result: IPilotDamageResult;
}

export interface IDestructionCheckResult {
  state: IUnitDamageState;
  destroyed: boolean;
  cause?: 'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed';
}

export interface IResolveDamageResult {
  state: IUnitDamageState;
  result: IDamageResult;
}

export interface ITerrainDamageResult extends IResolveDamageResult {
  terrainEffects?: {
    drowningCheckTriggered: boolean;
    drowningRoll?: ReturnType<typeof roll2d6>;
    drowningCheckPassed?: boolean;
    drowningDamage?: number;
  };
}

export type PilotDamageSource =
  | 'head_hit'
  | 'ammo_explosion'
  | 'mech_destruction'
  | 'fall'
  | 'physical_attack'
  | 'heat';
