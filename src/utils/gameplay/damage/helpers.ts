import {
  CombatLocation,
  getFrontCombatLocation,
  isRearCombatLocation,
} from '@/types/gameplay';

import { IUnitDamageState, RearArmorLocation } from './types';

export function isLocationDestroyed(
  state: IUnitDamageState,
  location: CombatLocation,
): boolean {
  return state.destroyedLocations.includes(location);
}

export function addDestroyedLocation(
  destroyedLocations: readonly CombatLocation[],
  location: CombatLocation,
): readonly CombatLocation[] {
  if (destroyedLocations.includes(location)) {
    return destroyedLocations;
  }

  return [...destroyedLocations, location];
}

export function getArmForSideTorso(
  location: CombatLocation,
): CombatLocation | null {
  const frontLocation = getFrontCombatLocation(location);
  const map: Partial<Record<CombatLocation, CombatLocation>> = {
    left_torso: 'left_arm',
    right_torso: 'right_arm',
  };
  return map[frontLocation] ?? null;
}

export function getRearArmorLocation(
  location: CombatLocation,
): RearArmorLocation | null {
  if (!isRearCombatLocation(location)) {
    return null;
  }

  return getFrontCombatLocation(location) as RearArmorLocation;
}
