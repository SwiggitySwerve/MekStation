import {
  CombatLocation,
  getFrontCombatLocation,
  getTransferCombatLocation,
  isRearCombatLocation,
} from '@/types/gameplay';

import {
  addDestroyedLocation,
  getRearArmorLocation,
  getArmForSideTorso,
  isLocationDestroyed,
} from './helpers';
import { applyDamageToLocationCore } from './locationApplication';
import {
  IDamageWithTransferResult,
  ILocationDamageResult,
  IUnitDamageState,
} from './types';

export function applyDamageToLocation(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): ILocationDamageResult {
  return applyDamageToLocationCore(state, location, damage);
}

export function applyDamageWithTransfer(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): IDamageWithTransferResult {
  const results: IDamageWithTransferResult['results'] = [];
  let currentState = state;
  let currentLocation: CombatLocation | null = location;
  let currentDamage = damage;

  while (currentLocation && currentDamage > 0) {
    const { state: newState, result } = applyDamageToLocation(
      currentState,
      currentLocation,
      currentDamage,
    );
    currentState = newState;
    results.push(result);

    if (result.transferredDamage > 0 && result.transferLocation) {
      currentLocation = result.transferLocation;
      currentDamage = result.transferredDamage;
    } else {
      break;
    }
  }

  return {
    state: currentState,
    results,
  };
}

export function applyInternalDamageToLocation(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): ILocationDamageResult {
  if (isLocationDestroyed(state, location)) {
    const transferTo = getTransferCombatLocation(location);
    if (transferTo) {
      return {
        state,
        result: {
          location,
          damage,
          armorDamage: 0,
          structureDamage: 0,
          armorRemaining: 0,
          structureRemaining: 0,
          destroyed: true,
          transferredDamage: damage,
          transferLocation: transferTo,
        },
      };
    }

    return {
      state,
      result: {
        location,
        damage,
        armorDamage: 0,
        structureDamage: 0,
        armorRemaining: 0,
        structureRemaining: 0,
        destroyed: true,
        transferredDamage: 0,
      },
    };
  }

  const isRear = isRearCombatLocation(location);
  const structureKey = isRear ? getFrontCombatLocation(location) : location;
  const rearArmorLocation = getRearArmorLocation(location);
  const armorRemaining = rearArmorLocation
    ? (state.rearArmor[rearArmorLocation] ?? 0)
    : (state.armor[location] ?? 0);
  const currentStructure = state.structure[structureKey] ?? 0;

  let remainingDamage = damage;
  let structureDamage = 0;
  let destroyed = false;
  let transferredDamage = 0;

  let newArmor = { ...state.armor };
  let newStructure = { ...state.structure };
  let newDestroyedLocations = state.destroyedLocations;

  if (remainingDamage > 0 && currentStructure > 0) {
    structureDamage = Math.min(currentStructure, remainingDamage);
    remainingDamage -= structureDamage;

    newStructure = {
      ...newStructure,
      [structureKey]: currentStructure - structureDamage,
    };

    if (newStructure[structureKey] <= 0) {
      destroyed = true;
      newDestroyedLocations = addDestroyedLocation(
        newDestroyedLocations,
        location,
      );

      if (isRear) {
        newDestroyedLocations = addDestroyedLocation(
          newDestroyedLocations,
          structureKey,
        );
      }

      const cascadedArm = getArmForSideTorso(structureKey);
      if (cascadedArm && !newDestroyedLocations.includes(cascadedArm)) {
        newDestroyedLocations = addDestroyedLocation(
          newDestroyedLocations,
          cascadedArm,
        );
        newArmor = { ...newArmor, [cascadedArm]: 0 };
        newStructure = { ...newStructure, [cascadedArm]: 0 };
      }

      if (remainingDamage > 0) {
        const transferTo = getTransferCombatLocation(location);
        if (transferTo) {
          transferredDamage = remainingDamage;
        }
      }
    }
  }

  const structureRemaining = newStructure[structureKey];

  return {
    state: {
      ...state,
      armor: newArmor,
      structure: newStructure,
      destroyedLocations: newDestroyedLocations,
    },
    result: {
      location,
      damage,
      armorDamage: 0,
      structureDamage,
      armorRemaining,
      structureRemaining,
      destroyed,
      transferredDamage,
      transferLocation:
        transferredDamage > 0
          ? (getTransferCombatLocation(location) ?? undefined)
          : undefined,
    },
  };
}

export function applyInternalDamageWithTransfer(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): IDamageWithTransferResult {
  const results: IDamageWithTransferResult['results'] = [];
  let currentState = state;
  let currentLocation: CombatLocation | null = location;
  let currentDamage = damage;

  while (currentLocation && currentDamage > 0) {
    const { state: newState, result } = applyInternalDamageToLocation(
      currentState,
      currentLocation,
      currentDamage,
    );
    currentState = newState;
    results.push(result);

    if (result.transferredDamage > 0 && result.transferLocation) {
      currentLocation = result.transferLocation;
      currentDamage = result.transferredDamage;
    } else {
      break;
    }
  }

  return {
    state: currentState,
    results,
  };
}
