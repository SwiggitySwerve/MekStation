import {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameState,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  IVehicleCombatState,
} from '@/types/gameplay';
import { PILOT_DEATH_WOUND_THRESHOLD } from '@/utils/gameplay/damage/constants';
import {
  applyDamagedPhysicalEquipmentCritical,
  applyDestroyedLocationPhysicalEquipmentState,
} from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { DEFAULT_COMPONENT_DAMAGE } from './initialization';
import { applyVehicleCriticalLocationDamage } from './vehicleCriticalLocationDamage';

function getArmForSideTorso(location: string): string | null {
  if (location === 'left_torso' || location === 'left_torso_rear') {
    return 'left_arm';
  }
  if (location === 'right_torso' || location === 'right_torso_rear') {
    return 'right_arm';
  }
  return null;
}

function getRearTorsoLocation(location: string): string | null {
  if (location === 'center_torso') return 'center_torso_rear';
  if (location === 'left_torso') return 'left_torso_rear';
  if (location === 'right_torso') return 'right_torso_rear';
  return null;
}

function getFrontTorsoLocation(location: string): string | null {
  if (location === 'center_torso_rear') return 'center_torso';
  if (location === 'left_torso_rear') return 'left_torso';
  if (location === 'right_torso_rear') return 'right_torso';
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
  const rearTorsoLocation = getRearTorsoLocation(payload.location);
  if (rearTorsoLocation) {
    newStructure[rearTorsoLocation] = payload.structureRemaining;
  }
  const frontTorsoLocation = getFrontTorsoLocation(payload.location);
  if (frontTorsoLocation) {
    newStructure[frontTorsoLocation] = payload.structureRemaining;
  }

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

  const unitAfterDamage: IUnitGameState = {
    ...unit,
    armor: newArmor,
    structure: newStructure,
    startingInternalStructure: newStartingStructure,
    destroyedLocations: newDestroyedLocations,
    destroyedEquipment: payload.criticals
      ? [...unit.destroyedEquipment, ...payload.criticals]
      : unit.destroyedEquipment,
    damageThisPhase: currentDamageThisPhase + payload.damage,
    combatState: applyVehicleDamageToCombatState(
      unit,
      payload,
      newDestroyedLocations,
    ),
  };

  const updatedUnit: IUnitGameState =
    applyDestroyedLocationPhysicalEquipmentState(
      unitAfterDamage,
      newDestroyedLocations,
    );

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
  const pilotDead = payload.totalWounds >= PILOT_DEATH_WOUND_THRESHOLD;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pilotWounds: payload.totalWounds,
        pilotConscious: pilotDead ? false : conscious,
        ...(pilotDead
          ? {
              destroyed: true as const,
              destructionCause: 'pilot_death' as const,
            }
          : {}),
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
        destructionCause: payload.cause,
        combatState: applyVehicleDestroyedToCombatState(unit, payload),
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
  updatedDamage = applyVehicleCriticalLocationDamage(updatedDamage, payload);

  const updatedUnit = applyDamagedPhysicalEquipmentCritical(unit, payload);

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...updatedUnit,
        componentDamage: updatedDamage,
        combatState: applyVehicleCriticalToCombatState(updatedUnit, payload),
      },
    },
  };
}

function applyVehicleDamageToCombatState(
  unit: IUnitGameState,
  payload: IDamageAppliedPayload,
  destroyedLocations: readonly string[],
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = unit.combatState.state;
  const armor = {
    ...(vehicle.armor as Record<string, number>),
    [payload.location]: payload.armorRemaining,
  } as IVehicleCombatState['armor'];
  const structure = {
    ...(vehicle.structure as Record<string, number>),
    [payload.location]: payload.structureRemaining,
  } as IVehicleCombatState['structure'];

  return {
    kind: 'vehicle',
    state: {
      ...vehicle,
      armor,
      structure,
      destroyedLocations:
        destroyedLocations as IVehicleCombatState['destroyedLocations'],
    },
  };
}

function applyVehicleDestroyedToCombatState(
  unit: IUnitGameState,
  payload: IUnitDestroyedPayload,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = unit.combatState.state;
  return {
    kind: 'vehicle',
    state: {
      ...vehicle,
      destroyed: true,
      destructionCause:
        vehicle.destructionCause ??
        vehicleCauseFromUnitDestroyed(payload.cause),
    },
  };
}

function vehicleCauseFromUnitDestroyed(
  cause: IUnitDestroyedPayload['cause'],
): IVehicleCombatState['destructionCause'] {
  if (cause === 'ammo_explosion' || cause === 'engine_destroyed') {
    return cause;
  }
  return 'damage';
}

function applyVehicleCriticalToCombatState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = unit.combatState.state;
  const motive = { ...vehicle.motive };
  let next: IVehicleCombatState = { ...vehicle, motive };

  switch (payload.effect) {
    case 'crew_stunned':
      next = {
        ...next,
        motive: {
          ...next.motive,
          crewStunnedPhases: next.motive.crewStunnedPhases + 2,
        },
      };
      break;
    case 'driver_hit':
    case 'pilot_hit':
    case 'copilot_hit': {
      const driverHits = next.motive.driverHits + 1;
      next = {
        ...next,
        motive: { ...next.motive, driverHits },
        ...(driverHits >= 2
          ? {
              destroyed: true as const,
              destructionCause: 'crew_killed' as const,
            }
          : {}),
      };
      break;
    }
    case 'commander_hit': {
      const commanderHits = next.motive.commanderHits + 1;
      next = {
        ...next,
        motive: { ...next.motive, commanderHits },
        ...(commanderHits >= 2
          ? {
              destroyed: true as const,
              destructionCause: 'crew_killed' as const,
            }
          : {}),
      };
      break;
    }
    case 'crew_killed':
      next = { ...next, destroyed: true, destructionCause: 'crew_killed' };
      break;
    case 'engine_hit': {
      const engineHits = next.motive.engineHits + 1;
      next = {
        ...next,
        motive: { ...next.motive, engineHits },
        ...(engineHits >= 2
          ? {
              destroyed: true as const,
              destructionCause: 'engine_destroyed' as const,
            }
          : {}),
      };
      break;
    }
    case 'fuel_tank':
      next = {
        ...next,
        motive: { ...next.motive, engineHits: next.motive.engineHits + 1 },
      };
      break;
    case 'ammo_explosion':
      next = { ...next, destroyed: true, destructionCause: 'ammo_explosion' };
      break;
    case 'turret_destroyed':
      next = { ...next, destroyed: true, destructionCause: 'turret_destroyed' };
      break;
    case 'turret_jammed':
    case 'turret_locked':
      next = {
        ...next,
        turretLock: { ...next.turretLock, primaryLocked: true },
        motive: { ...next.motive, turretLocked: true },
      };
      break;
    case 'rotor_destroyed':
      next = {
        ...next,
        motive: { ...next.motive, immobilized: true },
      };
      break;
  }

  return { kind: 'vehicle', state: next };
}
