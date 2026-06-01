import {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameState,
  IHeatPayload,
  IMotiveDamagedPayload,
  IMotivePenaltyAppliedPayload,
  IPilotHitPayload,
  ITurretLockedPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  IVehicleCombatState,
  IVehicleCrewStunnedPayload,
  IVehicleImmobilizedPayload,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { DEFAULT_COMPONENT_DAMAGE } from './initialization';
import { applyVehicleCriticalLocationDamage } from './vehicleCriticalLocationDamage';
import { applyVehicleCriticalToEnvelope } from './vehicleCriticalReplay';

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

  // Per `add-bot-retreat-behavior` § 2 (Trigger A): bootstrap the retreat
  // baseline. If a producer didn't seed `startingInternalStructure` for
  // this location yet, capture the pre-damage value as the starting
  // baseline. The first damage event for a location is the canonical
  // moment to lock the starting points — by definition the location was
  // at full structure before this hit. After bootstrap the value is
  // immutable for the rest of the match (subsequent damage updates
  // `structure`, never `startingInternalStructure`).
  const newStartingStructure: Record<string, number> = {
    ...(unit.startingInternalStructure ?? {}),
  };
  if (newStartingStructure[payload.location] === undefined) {
    const preDamage = unit.structure[payload.location];
    if (typeof preDamage === 'number') {
      newStartingStructure[payload.location] = preDamage;
    }
  }

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
    startingInternalStructure: newStartingStructure,
    destroyedLocations: newDestroyedLocations,
    destroyedEquipment: payload.criticals
      ? [...unit.destroyedEquipment, ...payload.criticals]
      : unit.destroyedEquipment,
    damageThisPhase: currentDamageThisPhase + payload.damage,
    combatState: applyVehicleDamageToEnvelope(unit, payload),
  };

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
  };
}

function applyVehicleDamageToEnvelope(
  unit: IUnitGameState,
  payload: IDamageAppliedPayload,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const armor = {
    ...(vehicleState.armor as Record<string, number>),
    [payload.location]: payload.armorRemaining,
  };
  const structure = {
    ...(vehicleState.structure as Record<string, number>),
    [payload.location]: payload.structureRemaining,
  };
  const location =
    payload.location as (typeof vehicleState.destroyedLocations)[number];
  const destroyedLocations = payload.locationDestroyed
    ? vehicleState.destroyedLocations.includes(location)
      ? vehicleState.destroyedLocations
      : [...vehicleState.destroyedLocations, location]
    : vehicleState.destroyedLocations;

  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      armor: armor as typeof vehicleState.armor,
      structure: structure as typeof vehicleState.structure,
      destroyedLocations:
        destroyedLocations as typeof vehicleState.destroyedLocations,
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
        combatState:
          unit.combatState?.kind === 'vehicle'
            ? {
                kind: 'vehicle',
                state: {
                  ...unit.combatState.state,
                  destroyed: true,
                  destructionCause:
                    payload.cause === 'engine_destroyed'
                      ? 'engine_destroyed'
                      : payload.cause === 'ammo_explosion'
                        ? 'ammo_explosion'
                        : (unit.combatState.state.destructionCause ?? 'damage'),
                },
              }
            : unit.combatState,
      },
    },
  };
}

export function applyMotiveDamaged(
  state: IGameState,
  payload: IMotiveDamagedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit || unit.combatState?.kind !== 'vehicle') {
    return state;
  }

  const vehicleState = unit.combatState.state;
  const nextMotive = {
    ...vehicleState.motive,
    penaltyMP: vehicleState.motive.penaltyMP + Math.max(0, payload.mpPenalty),
    immobilized:
      vehicleState.motive.immobilized || payload.severity === 'immobilized',
    sinking:
      vehicleState.motive.sinking ||
      (payload.severity === 'heavy' &&
        (vehicleState.motionType === GroundMotionType.NAVAL ||
          vehicleState.motionType === GroundMotionType.HYDROFOIL ||
          vehicleState.motionType === GroundMotionType.SUBMARINE)),
  };

  return updateVehicleUnit(state, payload.unitId, {
    ...vehicleState,
    motive: nextMotive,
  });
}

export function applyMotivePenaltyApplied(
  state: IGameState,
  _payload: IMotivePenaltyAppliedPayload,
): IGameState {
  return state;
}

export function applyVehicleImmobilized(
  state: IGameState,
  payload: IVehicleImmobilizedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit || unit.combatState?.kind !== 'vehicle') {
    return state;
  }

  const vehicleState = unit.combatState.state;
  return updateVehicleUnit(state, payload.unitId, {
    ...vehicleState,
    motive: {
      ...vehicleState.motive,
      immobilized: true,
    },
  });
}

export function applyTurretLocked(
  state: IGameState,
  payload: ITurretLockedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit || unit.combatState?.kind !== 'vehicle') {
    return state;
  }

  const vehicleState = unit.combatState.state;
  return updateVehicleUnit(state, payload.unitId, {
    ...vehicleState,
    turretLock: payload.secondary
      ? { ...vehicleState.turretLock, secondaryLocked: true }
      : { ...vehicleState.turretLock, primaryLocked: true },
    motive: payload.secondary
      ? vehicleState.motive
      : { ...vehicleState.motive, turretLocked: true },
  });
}

export function applyVehicleCrewStunned(
  state: IGameState,
  payload: IVehicleCrewStunnedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit || unit.combatState?.kind !== 'vehicle') {
    return state;
  }

  const vehicleState = unit.combatState.state;
  return updateVehicleUnit(state, payload.unitId, {
    ...vehicleState,
    motive: {
      ...vehicleState.motive,
      crewStunnedPhases:
        vehicleState.motive.crewStunnedPhases + payload.phasesStunned,
    },
  });
}

function updateVehicleUnit(
  state: IGameState,
  unitId: string,
  vehicleState: IVehicleCombatState,
): IGameState {
  const unit = state.units[unitId];
  if (!unit || unit.combatState?.kind !== 'vehicle') {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        combatState: {
          kind: 'vehicle',
          state: vehicleState,
        },
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
      if (payload.destroyed) {
        updatedDamage = {
          ...updatedDamage,
          weaponsDestroyed: [
            ...updatedDamage.weaponsDestroyed,
            payload.componentName,
          ],
        };
      }
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

  if (unit.combatState?.kind === 'vehicle') {
    updatedDamage = applyVehicleCriticalLocationDamage(updatedDamage, payload);
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        componentDamage: updatedDamage,
        combatState: applyVehicleCriticalToEnvelope(unit, payload),
      },
    },
  };
}
