import {
  CombatLocation,
  getFrontCombatLocation,
  isRearCombatLocation,
} from '@/types/gameplay';

import { STANDARD_STRUCTURE_TABLE } from './constants';
import { getRearArmorLocation } from './helpers';
import { IUnitDamageState, RearArmorLocation } from './types';

export function createDamageState(
  tonnage: number,
  armorValues: Record<CombatLocation, number>,
  rearArmorValues: Record<RearArmorLocation, number>,
): IUnitDamageState {
  const structureTable =
    STANDARD_STRUCTURE_TABLE[tonnage] ?? STANDARD_STRUCTURE_TABLE[50];

  const structure: Record<CombatLocation, number> = {
    head: structureTable.head,
    center_torso: structureTable.centerTorso,
    center_torso_rear: structureTable.centerTorso,
    left_torso: structureTable.sideTorso,
    left_torso_rear: structureTable.sideTorso,
    right_torso: structureTable.sideTorso,
    right_torso_rear: structureTable.sideTorso,
    left_arm: structureTable.arm,
    right_arm: structureTable.arm,
    left_leg: structureTable.leg,
    right_leg: structureTable.leg,
  };

  return {
    armor: { ...armorValues },
    rearArmor: { ...rearArmorValues },
    structure,
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
  };
}

export function getLocationDamageCapacity(
  state: IUnitDamageState,
  location: CombatLocation,
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  const rearArmorLocation = getRearArmorLocation(location);

  const armor = rearArmorLocation
    ? (state.rearArmor[rearArmorLocation] ?? 0)
    : (state.armor[location] ?? 0);
  const structure = state.structure[armorKey] ?? 0;

  return armor + structure;
}

export function getLocationHealthPercent(
  state: IUnitDamageState,
  location: CombatLocation,
  maxArmor: number,
  maxStructure: number,
): number {
  const isRear = isRearCombatLocation(location);
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  const rearArmorLocation = getRearArmorLocation(location);

  const currentArmor = rearArmorLocation
    ? (state.rearArmor[rearArmorLocation] ?? 0)
    : (state.armor[location] ?? 0);
  const currentStructure = state.structure[armorKey] ?? 0;

  const maxTotal = maxArmor + maxStructure;
  const currentTotal = currentArmor + currentStructure;

  return maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
}
