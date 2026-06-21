import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameState,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
} from '@/types/gameplay';
import { PILOT_DEATH_WOUND_THRESHOLD } from '@/utils/gameplay/damage/constants';
import { applyDestroyedLocationPhysicalEquipmentState } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { applyCriticalHitComponentDamage } from './criticalHitComponentDamage';
import {
  applyCriticalHitEquipmentState,
  applyElectronicWarfareEquipmentCritical,
} from './criticalHitEquipmentState';
import { DEFAULT_COMPONENT_DAMAGE } from './initialization';
import {
  applyVehicleCriticalToCombatState,
  applyVehicleDamageToCombatState,
  applyVehicleDestroyedToCombatState,
} from './vehicleCombatStateUpdates';

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

function markCriticalSlotManifestEntryDestroyed(
  manifest: CriticalSlotManifest | undefined,
  payload: ICriticalHitResolvedPayload,
): CriticalSlotManifest | undefined {
  if (!manifest || !payload.destroyed) {
    return manifest;
  }

  const slots = manifest[payload.location];
  if (!slots) {
    return manifest;
  }

  return {
    ...manifest,
    [payload.location]: slots.map((slot) =>
      slot.slotIndex === payload.slotIndex
        ? { ...slot, destroyed: true }
        : slot,
    ),
  };
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
        edgePointsRemaining:
          payload.edgePointsRemaining ?? unit.edgePointsRemaining,
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
  const updatedDamage = applyCriticalHitComponentDamage(
    componentDamage,
    payload,
  );
  const updatedUnit = applyCriticalHitEquipmentState(unit, payload);
  const electronicWarfare = applyElectronicWarfareEquipmentCritical(
    state.electronicWarfare,
    payload,
  );
  const criticalSlotManifest = markCriticalSlotManifestEntryDestroyed(
    unit.criticalSlotManifest,
    payload,
  );

  return {
    ...state,
    ...(electronicWarfare ? { electronicWarfare } : {}),
    units: {
      ...state.units,
      [payload.unitId]: {
        ...updatedUnit,
        componentDamage: updatedDamage,
        ...(criticalSlotManifest !== undefined ? { criticalSlotManifest } : {}),
        edgePointsRemaining:
          payload.edgePointsRemaining ?? updatedUnit.edgePointsRemaining,
        combatState: applyVehicleCriticalToCombatState(updatedUnit, payload),
      },
    },
  };
}
