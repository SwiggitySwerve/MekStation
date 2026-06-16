import type { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import type { IElectronicWarfareState } from '@/utils/gameplay/electronicWarfare';

import {
  ICriticalHitResolvedPayload,
  IComponentDamageState,
  IDamageAppliedPayload,
  IGameState,
  IHeatPayload,
  IArtemisFcsKind,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  IVehicleCombatState,
} from '@/types/gameplay';
import { asCombatLocation } from '@/utils/gameplay/criticalHitResolution/actuatorEffects';
import { PILOT_DEATH_WOUND_THRESHOLD } from '@/utils/gameplay/damage/constants';
import {
  applyDamagedPhysicalEquipmentCritical,
  applyDestroyedLocationPhysicalEquipmentState,
} from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { DEFAULT_COMPONENT_DAMAGE } from './initialization';
import { applyVehicleCriticalLocationDamage } from './vehicleCriticalLocationDamage';

const SCM_CRITICAL_DISABLE_THRESHOLD = 6;

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
      if (
        payload.destroyed === false &&
        isAutocannonCriticalComponent(payload)
      ) {
        updatedDamage = applyPlaytestAutocannonFirstCritical(
          updatedDamage,
          payload,
        );
      } else {
        updatedDamage = {
          ...updatedDamage,
          weaponsDestroyed: [
            ...updatedDamage.weaponsDestroyed,
            payload.weaponId ?? payload.componentName,
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
    case 'actuator': {
      // Per audit 2026-06-09 A-6: mirror `applyActuatorHit`'s per-location
      // bookkeeping into the event-sourced replay path. Store-fed readers
      // (hull-down entry pricing per MegaMek HullDownStep.java:61-82,
      // QuadVee conversion gates, AirMek landing control) consume
      // `actuatorsByLocation` from this reducer's output in live and
      // replay flows. For actuator slots `componentName` carries the
      // canonical `ActuatorType` value (see criticalHitResolution/manifest).
      const combatLocation = asCombatLocation(payload.location);
      updatedDamage = {
        ...updatedDamage,
        actuators: {
          ...updatedDamage.actuators,
          [payload.componentName]: true,
        },
        ...(combatLocation
          ? {
              actuatorsByLocation: {
                ...updatedDamage.actuatorsByLocation,
                [combatLocation]: {
                  ...updatedDamage.actuatorsByLocation?.[combatLocation],
                  [payload.componentName as ActuatorType]: true,
                },
              },
            }
          : {}),
      };
      break;
    }
    case 'equipment':
      if (isSuperCooledMyomerCriticalComponent(payload.componentName)) {
        updatedDamage = {
          ...updatedDamage,
          superCooledMyomerHits: Math.min(
            (updatedDamage.superCooledMyomerHits ?? 0) + 1,
            SCM_CRITICAL_DISABLE_THRESHOLD,
          ),
        };
      } else if (
        isEmergencyCoolantSystemCriticalComponent(payload.componentName)
      ) {
        updatedDamage = {
          ...updatedDamage,
          emergencyCoolantSystemDamaged: true,
        };
      } else if (
        payload.destroyed === false &&
        isAutocannonCriticalComponent(payload)
      ) {
        updatedDamage = applyPlaytestAutocannonFirstCritical(
          updatedDamage,
          payload,
        );
      } else if (isHarJelCriticalComponent(payload)) {
        updatedDamage = applyHarJelBreachCritical(updatedDamage, payload);
      } else if (isRiscLaserPulseModuleLinkedCritical(payload)) {
        updatedDamage = {
          ...updatedDamage,
          weaponsDestroyed: [
            ...updatedDamage.weaponsDestroyed,
            payload.linkedCriticalWeaponId,
          ],
        };
      }
      break;
  }
  updatedDamage = applyVehicleCriticalLocationDamage(updatedDamage, payload);

  const updatedUnit = applyDestroyedArtemisFcsState(
    applyGenericEquipmentDestroyedState(
      applyDamagedPhysicalEquipmentCritical(unit, payload),
      payload,
    ),
    payload,
  );
  const electronicWarfare = applyElectronicWarfareEquipmentCritical(
    state.electronicWarfare,
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
        edgePointsRemaining:
          payload.edgePointsRemaining ?? updatedUnit.edgePointsRemaining,
        combatState: applyVehicleCriticalToCombatState(updatedUnit, payload),
      },
    },
  };
}

function normalizeEquipmentText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isECMCriticalComponent(componentName: string): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return normalized.includes('ecm') || normalized.includes('cews');
}

function isGenericECMCriticalComponent(component: string): boolean {
  return (
    component === 'ecm' ||
    component === 'ecmsuite' ||
    component === 'cews' ||
    component === 'cewssuite'
  );
}

function isRiscLaserPulseModuleLinkedCritical(
  payload: ICriticalHitResolvedPayload,
): payload is ICriticalHitResolvedPayload & {
  readonly linkedCriticalWeaponId: string;
} {
  return (
    payload.destroyed === true &&
    normalizeEquipmentText(payload.componentName) === 'risclaserpulsemodule' &&
    typeof payload.linkedCriticalWeaponId === 'string' &&
    payload.linkedCriticalWeaponId.length > 0
  );
}

function isActiveProbeCriticalComponent(componentName: string): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized.includes('activeprobe') ||
    normalized.includes('beagle') ||
    normalized.includes('bloodhound') ||
    normalized.includes('bap') ||
    normalized.includes('cews')
  );
}

function isGenericActiveProbeCriticalComponent(component: string): boolean {
  return (
    component === 'probe' ||
    component === 'activeprobe' ||
    component === 'bap' ||
    component === 'cews' ||
    component === 'cewssuite'
  );
}

function artemisFcsKindForComponent(
  componentName: string,
): IArtemisFcsKind | undefined {
  const normalized = normalizeEquipmentText(componentName);
  if (normalized.includes('ammo') || normalized.includes('capable')) {
    return undefined;
  }

  if (normalized.includes('prototypeartemisiv')) {
    return 'prototype_artemis_iv';
  }
  if (
    normalized.includes('artemisivproto') ||
    normalized.includes('protoartemisiv')
  ) {
    return 'prototype_artemis_iv';
  }
  if (normalized.includes('artemisv')) {
    return 'artemis_v';
  }
  if (normalized.includes('artemisiv')) {
    return 'artemis_iv';
  }

  return undefined;
}

function isSuperCooledMyomerCriticalComponent(componentName: string): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized === 'scm' ||
    normalized === 'supercooledmyomer' ||
    normalized.includes('supercooledmyomer')
  );
}

function isEmergencyCoolantSystemCriticalComponent(
  componentName: string,
): boolean {
  const normalized = normalizeEquipmentText(componentName);
  return (
    normalized === 'emergencycoolantsystem' ||
    normalized.includes('emergencycoolant')
  );
}

function isHarJelCriticalComponent(
  payload: ICriticalHitResolvedPayload,
): boolean {
  return (
    payload.componentType === 'equipment' &&
    payload.breached === true &&
    normalizeEquipmentText(payload.componentName) === 'harjel'
  );
}

function applyHarJelBreachCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  return {
    ...componentDamage,
    breachedLocations: addUniqueString(
      componentDamage.breachedLocations,
      payload.location,
    ),
  };
}

function autocannonCriticalKey(payload: ICriticalHitResolvedPayload): string {
  return payload.weaponId ?? payload.componentName;
}

function isAutocannonCriticalComponent(
  payload: ICriticalHitResolvedPayload,
): boolean {
  const text =
    `${payload.weaponId ?? ''} ${payload.componentName}`.toLowerCase();
  return (
    /\b(?:uac|rac|ac)\s*\/?\s*\d+\b/.test(text) ||
    /\b(?:ultra|rotary)\s+ac\s*\/?\s*\d+\b/.test(text) ||
    /\blb[\s-]?\d+[\s-]?x\s*ac\b/.test(text) ||
    /\blb[\s-]?x\s*ac\s*\/?\s*\d+\b/.test(text) ||
    /\bauto\s*cannon\s*\/?\s*\d+\b/.test(text) ||
    /\bautocannon\s*\/?\s*\d+\b/.test(text)
  );
}

function applyPlaytestAutocannonFirstCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  const key = autocannonCriticalKey(payload);
  const previous = componentDamage.playtestAutocannonFirstCrits ?? [];
  return {
    ...componentDamage,
    playtestAutocannonFirstCrits: previous.includes(key)
      ? previous
      : [...previous, key],
  };
}

function addUniqueString(
  values: readonly string[] | undefined,
  value: string,
): readonly string[] {
  return values?.includes(value) ? values : [...(values ?? []), value];
}

function ecmSuiteMatchesCritical(
  suite: IElectronicWarfareState['ecmSuites'][number],
  unitId: string,
  componentName: string,
): boolean {
  if (!suite.entityId.startsWith(`${unitId}:`)) return false;

  const component = normalizeEquipmentText(componentName);
  const suiteId = normalizeEquipmentText(suite.entityId);
  return (
    suiteId.includes(component) ||
    component.includes(suite.type) ||
    isGenericECMCriticalComponent(component)
  );
}

function activeProbeMatchesCritical(
  probe: IElectronicWarfareState['activeProbes'][number],
  unitId: string,
  componentName: string,
): boolean {
  if (!probe.entityId.startsWith(`${unitId}:`)) return false;

  const component = normalizeEquipmentText(componentName);
  const probeId = normalizeEquipmentText(probe.entityId);
  const probeType = normalizeEquipmentText(probe.type);
  return (
    probeId.includes(component) ||
    component.includes(probeType) ||
    isGenericActiveProbeCriticalComponent(component)
  );
}

function applyElectronicWarfareEquipmentCritical(
  electronicWarfare: IElectronicWarfareState | undefined,
  payload: ICriticalHitResolvedPayload,
): IElectronicWarfareState | undefined {
  if (
    !electronicWarfare ||
    payload.componentType !== 'equipment' ||
    payload.destroyed !== true
  ) {
    return electronicWarfare;
  }

  const isECMCritical = isECMCriticalComponent(payload.componentName);
  const isProbeCritical = isActiveProbeCriticalComponent(payload.componentName);
  if (!isECMCritical && !isProbeCritical) {
    return electronicWarfare;
  }

  return {
    ...electronicWarfare,
    ecmSuites: isECMCritical
      ? electronicWarfare.ecmSuites.map((suite) =>
          ecmSuiteMatchesCritical(suite, payload.unitId, payload.componentName)
            ? { ...suite, operational: false }
            : suite,
        )
      : electronicWarfare.ecmSuites,
    activeProbes: isProbeCritical
      ? electronicWarfare.activeProbes.map((probe) =>
          activeProbeMatchesCritical(
            probe,
            payload.unitId,
            payload.componentName,
          )
            ? { ...probe, operational: false }
            : probe,
        )
      : electronicWarfare.activeProbes,
  };
}

function applyGenericEquipmentDestroyedState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (payload.componentType !== 'equipment' || payload.destroyed !== true) {
    return unit;
  }
  if (isRiscLaserPulseModuleLinkedCritical(payload)) {
    return unit;
  }

  if (unit.destroyedEquipment.includes(payload.componentName)) {
    return unit;
  }

  return {
    ...unit,
    destroyedEquipment: [...unit.destroyedEquipment, payload.componentName],
  };
}

function applyDestroyedArtemisFcsState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState {
  if (payload.componentType !== 'equipment' || payload.destroyed !== true) {
    return unit;
  }

  const kind = artemisFcsKindForComponent(payload.componentName);
  if (kind === undefined) {
    return unit;
  }

  const previous = unit.destroyedArtemisFcs ?? [];
  const alreadyRecorded = previous.some(
    (entry) =>
      entry.kind === kind &&
      entry.location === payload.location &&
      entry.linkedWeaponId === payload.linkedCriticalWeaponId,
  );
  if (alreadyRecorded) {
    return unit;
  }

  return {
    ...unit,
    destroyedArtemisFcs: [
      ...previous,
      {
        kind,
        location: payload.location,
        ...(payload.linkedCriticalWeaponId !== undefined
          ? { linkedWeaponId: payload.linkedCriticalWeaponId }
          : {}),
        componentName: payload.componentName,
      },
    ],
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
      // Fuel tank hit destroys the vehicle outright per MegaMek
      // `Tank.CRIT_FUEL_TANK` (destroyEntity "fuel explosion") and the
      // `align-vehicle-critical-location-tables` game-state delta. The
      // resolver only emits this effect for fuel-bearing engines, so the
      // replay mirror destroys unconditionally.
      next = {
        ...next,
        destroyed: true,
        destructionCause: 'fuel_tank_explosion',
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
    case 'rotor_damage': {
      // VTOL rotor damage: each hit adds 1 MP penalty; immobilized once the
      // penalty reaches the original cruise MP (MegaMek
      // `VTOL.CRIT_ROTOR_DAMAGE`: setMotiveDamage + immobilize at
      // originalWalkMP).
      const penaltyMP = next.motive.penaltyMP + 1;
      next = {
        ...next,
        motive: {
          ...next.motive,
          penaltyMP,
          immobilized:
            next.motive.immobilized ||
            penaltyMP >= next.motive.originalCruiseMP,
        },
      };
      break;
    }
    case 'rotor_destroyed':
      next = {
        ...next,
        motive: { ...next.motive, immobilized: true },
      };
      break;
  }

  return { kind: 'vehicle', state: next };
}
