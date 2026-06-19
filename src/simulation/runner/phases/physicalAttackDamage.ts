import {
  CombatLocation,
  IGameEvent,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';
import {
  resolveCriticalHits,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import {
  determinePhysicalHitLocation,
  type IPhysicalDamageCluster,
} from '@/utils/gameplay/physicalAttacks';
import { applyPhysicalEquipmentCriticalEvents } from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { emitPhysicalCriticalEvents } from './physicalAttackCriticalEvents';
import { applyPhysicalDamage } from './physicalAttackDamageApplication';
import { getOrSeedPhysicalCriticalManifest } from './physicalAttackDamageApplication';
import { applyCriticalPSRTriggers } from './weaponAttackPsrTriggers';

export function applyPhysicalDamageClusters(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly number[];
  hitTable: 'punch' | 'kick';
  d6Roller: () => number;
  optionalRules?: readonly string[];
  sourceUnitId?: string;
  firstHitLocation?: CombatLocation;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  let currentState = options.state;
  for (let i = 0; i < options.clusters.length; i++) {
    const hitLocation =
      i === 0 && options.firstHitLocation
        ? options.firstHitLocation
        : determinePhysicalHitLocation(options.hitTable, options.d6Roller);
    currentState = applyPhysicalDamage({
      state: currentState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation,
      damage: options.clusters[i],
      d6Roller: options.d6Roller,
      optionalRules: options.optionalRules,
      manifestsByUnit: options.manifestsByUnit,
      ...(options.sourceUnitId !== undefined
        ? { sourceUnitId: options.sourceUnitId }
        : {}),
    });
  }
  return currentState;
}

export function applyPhysicalCriticalHits(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  locations: readonly CombatLocation[];
  d6Roller: () => number;
  optionalRules?: readonly string[];
  sourceUnitId?: string;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  let currentState = options.state;

  for (const location of options.locations) {
    const unitBefore = currentState.units[options.unitId];
    if (!unitBefore || unitBefore.destroyed) continue;

    const manifest = getOrSeedPhysicalCriticalManifest(
      options.manifestsByUnit,
      options.unitId,
    );
    if (!manifest) continue;

    const criticalResult = resolveCriticalHits(
      options.unitId,
      location,
      manifest,
      unitBefore.componentDamage ?? buildDefaultComponentDamageState(),
      options.d6Roller,
      1,
      undefined,
      {
        optionalRules: options.optionalRules,
        pilotAbilities: unitBefore.abilities,
        edgePointsRemaining: unitBefore.edgePointsRemaining,
        turn: currentState.turn,
        unitId: options.unitId,
      },
    );

    options.manifestsByUnit?.set(
      options.unitId,
      criticalResult.updatedManifest,
    );

    let unitAfterCritical: IUnitGameState = {
      ...unitBefore,
      componentDamage: criticalResult.updatedComponentDamage,
      ...(criticalResult.edgePointsRemaining !== undefined
        ? { edgePointsRemaining: criticalResult.edgePointsRemaining }
        : {}),
    };
    unitAfterCritical = applyPhysicalEquipmentCriticalEvents(
      unitAfterCritical,
      criticalResult.events,
    );

    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [options.unitId]: unitAfterCritical,
      },
    };
    currentState = applyCriticalPSRTriggers(
      currentState,
      criticalResult.events,
    );

    emitPhysicalCriticalEvents({
      events: options.events,
      gameId: options.gameId,
      turn: currentState.turn,
      attackerId: options.sourceUnitId ?? options.unitId,
      targetId: options.unitId,
      critEvents: criticalResult.events,
      targetPilotingSkill: unitBefore.piloting,
    });
  }

  return currentState;
}

export function applyPhysicalDamageClusterLocations(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly IPhysicalDamageCluster[];
  d6Roller: () => number;
  optionalRules?: readonly string[];
  sourceUnitId?: string;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  let currentState = options.state;
  for (const cluster of options.clusters) {
    currentState = applyPhysicalDamage({
      state: currentState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation: cluster.location,
      damage: cluster.damage,
      d6Roller: options.d6Roller,
      optionalRules: options.optionalRules,
      manifestsByUnit: options.manifestsByUnit,
      ...(options.sourceUnitId !== undefined
        ? { sourceUnitId: options.sourceUnitId }
        : {}),
    });
  }
  return currentState;
}

export function applyDfaAttackerLegDamage(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly number[];
  d6Roller: () => number;
  optionalRules?: readonly string[];
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  return options.clusters.reduce((nextState, clusterDamage, index) => {
    const leg: CombatLocation = index % 2 === 0 ? 'left_leg' : 'right_leg';
    return applyPhysicalDamage({
      state: nextState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation: leg,
      damage: clusterDamage,
      d6Roller: options.d6Roller,
      optionalRules: options.optionalRules,
      manifestsByUnit: options.manifestsByUnit,
    });
  }, options.state);
}
