import {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameState,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
} from '@/types/gameplay';

import { DEFAULT_COMPONENT_DAMAGE } from './gameStateInitialization';

function getArmForSideTorso(location: string): string | null {
  if (location === 'left_torso' || location === 'left_torso_rear') {
    return 'left_arm';
  }
  if (location === 'right_torso' || location === 'right_torso_rear') {
    return 'right_arm';
  }
  return null;
}

export function applyDamageApplied(
  state: IGameState,
  payload: IDamageAppliedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const newDestroyedLocations = [...unit.destroyedLocations];
  const newArmor = { ...unit.armor };
  const newStructure = { ...unit.structure };

  newArmor[payload.location] = payload.armorRemaining;
  newStructure[payload.location] = payload.structureRemaining;

  if (
    payload.locationDestroyed &&
    !newDestroyedLocations.includes(payload.location)
  ) {
    newDestroyedLocations.push(payload.location);

    const cascadedArm = getArmForSideTorso(payload.location);
    if (cascadedArm && !newDestroyedLocations.includes(cascadedArm)) {
      newDestroyedLocations.push(cascadedArm);
      newArmor[cascadedArm] = 0;
      newStructure[cascadedArm] = 0;
    }
  }

  const currentDamageThisPhase = unit.damageThisPhase ?? 0;

  const updatedUnit: IUnitGameState = {
    ...unit,
    armor: newArmor,
    structure: newStructure,
    destroyedLocations: newDestroyedLocations,
    destroyedEquipment: payload.criticals
      ? [...unit.destroyedEquipment, ...payload.criticals]
      : unit.destroyedEquipment,
    damageThisPhase: currentDamageThisPhase + payload.damage,
  };

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
  };
}

export function applyHeatChange(
  state: IGameState,
  payload: IHeatPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        heat: payload.newTotal,
      },
    },
  };
}

export function applyPilotHit(
  state: IGameState,
  payload: IPilotHitPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const conscious = payload.consciousnessCheckRequired
    ? (payload.consciousnessCheckPassed ?? false)
    : unit.pilotConscious;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pilotWounds: payload.totalWounds,
        pilotConscious: conscious,
      },
    },
  };
}

export function applyUnitDestroyed(
  state: IGameState,
  payload: IUnitDestroyedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        destroyed: true,
      },
    },
  };
}

export function applyCriticalHitResolved(
  state: IGameState,
  payload: ICriticalHitResolvedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const componentDamage = unit.componentDamage ?? {
    ...DEFAULT_COMPONENT_DAMAGE,
  };

  let updatedDamage = { ...componentDamage };

  switch (payload.componentType) {
    case 'engine':
      updatedDamage = {
        ...updatedDamage,
        engineHits: updatedDamage.engineHits + 1,
      };
      break;
    case 'gyro':
      updatedDamage = {
        ...updatedDamage,
        gyroHits: updatedDamage.gyroHits + 1,
      };
      break;
    case 'sensor':
      updatedDamage = {
        ...updatedDamage,
        sensorHits: updatedDamage.sensorHits + 1,
      };
      break;
    case 'life_support':
      updatedDamage = {
        ...updatedDamage,
        lifeSupport: updatedDamage.lifeSupport + 1,
      };
      break;
    case 'cockpit':
      updatedDamage = { ...updatedDamage, cockpitHit: true };
      break;
    case 'weapon':
      updatedDamage = {
        ...updatedDamage,
        weaponsDestroyed: [
          ...updatedDamage.weaponsDestroyed,
          payload.componentName,
        ],
      };
      break;
    case 'heat_sink':
      updatedDamage = {
        ...updatedDamage,
        heatSinksDestroyed: updatedDamage.heatSinksDestroyed + 1,
      };
      break;
    case 'jump_jet':
      updatedDamage = {
        ...updatedDamage,
        jumpJetsDestroyed: updatedDamage.jumpJetsDestroyed + 1,
      };
      break;
    case 'actuator':
      updatedDamage = {
        ...updatedDamage,
        actuators: {
          ...updatedDamage.actuators,
          [payload.componentName]: true,
        },
      };
      break;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        componentDamage: updatedDamage,
      },
    },
  };
}
