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
  const armorKey = isRear ? getFrontCombatLocation(location) : location;
  const rearArmorLocation = getRearArmorLocation(location);

  let currentArmor: number;
  if (rearArmorLocation) {
    currentArmor = state.rearArmor[rearArmorLocation] ?? 0;
  } else {
    currentArmor = state.armor[location] ?? 0;
  }

  const currentStructure = state.structure[armorKey] ?? 0;

  let remainingDamage = damage;
  let armorDamage = 0;
  let structureDamage = 0;
  let destroyed = false;
  let transferredDamage = 0;

  let newArmor = { ...state.armor };
  let newRearArmor = { ...state.rearArmor };
  let newStructure = { ...state.structure };
  let newDestroyedLocations = state.destroyedLocations;

  if (currentArmor > 0) {
    armorDamage = Math.min(currentArmor, remainingDamage);
    remainingDamage -= armorDamage;

    if (rearArmorLocation) {
      newRearArmor = {
        ...newRearArmor,
        [rearArmorLocation]: currentArmor - armorDamage,
      };
    } else {
      newArmor = { ...newArmor, [location]: currentArmor - armorDamage };
    }
  }

  if (remainingDamage > 0 && currentStructure > 0) {
    structureDamage = Math.min(currentStructure, remainingDamage);
    remainingDamage -= structureDamage;

    newStructure = {
      ...newStructure,
      [armorKey]: currentStructure - structureDamage,
    };

    if (newStructure[armorKey] <= 0) {
      destroyed = true;
      newDestroyedLocations = addDestroyedLocation(
        newDestroyedLocations,
        location,
      );

      if (isRear) {
        newDestroyedLocations = addDestroyedLocation(
          newDestroyedLocations,
          armorKey,
        );
      }

      const cascadedArm = getArmForSideTorso(armorKey);
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

  const armorRemaining = rearArmorLocation
    ? newRearArmor[rearArmorLocation]
    : newArmor[location];
  const structureRemaining = newStructure[armorKey];

  const newState: IUnitDamageState = {
    ...state,
    armor: newArmor,
    rearArmor: newRearArmor,
    structure: newStructure,
    destroyedLocations: newDestroyedLocations,
  };

  return {
    state: newState,
    result: {
      location,
      damage,
      armorDamage,
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
