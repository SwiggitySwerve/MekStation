import type { CombatLocation } from '@/types/gameplay';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { getMaxTechHeatCriticalDamageAvoidTN } from '@/constants/heat';

import type {
  CriticalHitEvent,
  CriticalSlotManifest,
  IComponentDamageState,
} from './criticalHitResolution/types';

import { resolveCriticalHits } from './criticalHitResolution';

export const MAXTECH_HEAT_CRITICAL_LOCATIONS: readonly CombatLocation[] = [
  'head',
  'center_torso',
  'right_torso',
  'left_torso',
  'right_arm',
  'left_arm',
  'right_leg',
  'left_leg',
];

export function getMaxTechHeatCriticalLocation(
  locationIndex: number,
): CombatLocation {
  const normalizedIndex =
    ((Math.trunc(locationIndex) % MAXTECH_HEAT_CRITICAL_LOCATIONS.length) +
      MAXTECH_HEAT_CRITICAL_LOCATIONS.length) %
    MAXTECH_HEAT_CRITICAL_LOCATIONS.length;
  return MAXTECH_HEAT_CRITICAL_LOCATIONS[normalizedIndex];
}

export interface IMaxTechHeatCriticalDamageResult {
  readonly targetNumber: number;
  readonly roll: number;
  readonly applied: boolean;
  readonly location?: CombatLocation;
  readonly events: readonly CriticalHitEvent[];
  readonly updatedManifest: CriticalSlotManifest;
  readonly updatedComponentDamage: IComponentDamageState;
  readonly unitDestroyed: boolean;
  readonly destructionCause?: 'engine_destroyed' | 'pilot_death';
}

export function resolveMaxTechHeatCriticalDamage(options: {
  readonly unitId: string;
  readonly heat: number;
  readonly manifest: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly d6Roller: D6Roller;
  readonly locationIndexRoller: () => number;
  readonly targetNumberModifier?: number;
}): IMaxTechHeatCriticalDamageResult {
  const {
    componentDamage,
    d6Roller,
    heat,
    locationIndexRoller,
    manifest,
    targetNumberModifier = 0,
    unitId,
  } = options;
  const targetNumber = getMaxTechHeatCriticalDamageAvoidTN(
    heat,
    targetNumberModifier,
  );

  if (targetNumber <= 0) {
    return {
      targetNumber,
      roll: 0,
      applied: false,
      events: [],
      updatedManifest: manifest,
      updatedComponentDamage: componentDamage,
      unitDestroyed: false,
    };
  }

  const roll = d6Roller() + d6Roller();
  if (roll >= targetNumber) {
    return {
      targetNumber,
      roll,
      applied: false,
      events: [],
      updatedManifest: manifest,
      updatedComponentDamage: componentDamage,
      unitDestroyed: false,
    };
  }

  const location = getMaxTechHeatCriticalLocation(locationIndexRoller());
  const criticalResult = resolveCriticalHits(
    unitId,
    location,
    manifest,
    componentDamage,
    d6Roller,
    1,
  );

  return {
    targetNumber,
    roll,
    applied: true,
    location,
    events: criticalResult.events,
    updatedManifest: criticalResult.updatedManifest,
    updatedComponentDamage: criticalResult.updatedComponentDamage,
    unitDestroyed: criticalResult.unitDestroyed,
    destructionCause: criticalResult.destructionCause,
  };
}
