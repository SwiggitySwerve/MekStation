import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';
import {
  buildDefaultCriticalSlotManifest,
  resolveCriticalHits,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { isHeadHit } from '@/utils/gameplay/hitLocation';
import {
  determinePhysicalHitLocation,
  type IPhysicalDamageCluster,
} from '@/utils/gameplay/physicalAttacks';
import {
  applyPhysicalEquipmentCriticalEvents,
  physicalEquipmentLifecycleEventsFromManifest,
} from '@/utils/gameplay/physicalAttacks/equipmentLifecycle';

import { HEAD_HIT_DAMAGE_CAP } from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { emitPhysicalCriticalEvents } from './physicalAttackCriticalEvents';
import { createGameEvent } from './utils';
import { applyCriticalPSRTriggers } from './weaponAttackPsrTriggers';

function capPhysicalDamageForLocation(
  hitLocation: CombatLocation,
  damage: number,
): number {
  if (isHeadHit(hitLocation) && damage > HEAD_HIT_DAMAGE_CAP) {
    return HEAD_HIT_DAMAGE_CAP;
  }
  return damage;
}

function getOrSeedPhysicalCriticalManifest(
  manifestsByUnit: Map<string, CriticalSlotManifest> | undefined,
  unitId: string,
): CriticalSlotManifest | undefined {
  if (!manifestsByUnit) return undefined;

  const existing = manifestsByUnit.get(unitId);
  if (existing) return existing;

  const seeded = buildDefaultCriticalSlotManifest();
  manifestsByUnit.set(unitId, seeded);
  return seeded;
}

function applyPhysicalDamage(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  hitLocation: CombatLocation;
  damage: number;
  d6Roller: () => number;
  optionalRules?: readonly string[];
  sourceUnitId?: string;
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  const {
    d6Roller,
    damage,
    events,
    gameId,
    hitLocation,
    manifestsByUnit,
    sourceUnitId,
    state,
    unitId,
  } = options;
  const unitBefore = state.units[unitId];
  if (!unitBefore || unitBefore.destroyed) return state;

  const cappedDamage = capPhysicalDamageForLocation(hitLocation, damage);
  const manifest = getOrSeedPhysicalCriticalManifest(manifestsByUnit, unitId);
  const damageState = buildDamageState(unitBefore);
  const dmgResult = resolveDamage(
    manifest === undefined
      ? damageState
      : {
          ...damageState,
          turn: state.turn,
          criticalContext: {
            unitId,
            manifest,
            componentDamage:
              unitBefore.componentDamage ?? buildDefaultComponentDamageState(),
            optionalRules: options.optionalRules,
          },
        },
    hitLocation,
    cappedDamage,
    d6Roller,
  );
  if (manifestsByUnit && dmgResult.manifest) {
    manifestsByUnit.set(unitId, dmgResult.manifest);
  }
  const sourceLifecycleEvents = physicalEquipmentLifecycleEventsFromManifest({
    unit: unitBefore,
    manifest,
  });
  const criticalEvents =
    sourceLifecycleEvents.length === 0
      ? dmgResult.criticalEvents
      : [...sourceLifecycleEvents, ...(dmgResult.criticalEvents ?? [])];

  let nextState = applyDamageResultToState(
    state,
    unitId,
    dmgResult.state,
    dmgResult.result,
    dmgResult.componentDamage,
  );
  if (criticalEvents && criticalEvents.length > 0) {
    const unitAfterEquipmentEvents = applyPhysicalEquipmentCriticalEvents(
      nextState.units[unitId],
      criticalEvents,
    );
    if (unitAfterEquipmentEvents !== nextState.units[unitId]) {
      nextState = {
        ...nextState,
        units: {
          ...nextState.units,
          [unitId]: unitAfterEquipmentEvents,
        },
      };
    }
    if (dmgResult.criticalEvents) {
      nextState = applyCriticalPSRTriggers(nextState, dmgResult.criticalEvents);
    }
  }

  for (const locationDamage of dmgResult.result.locationDamages) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        nextState.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          location: locationDamage.location,
          damage: locationDamage.damage,
          armorRemaining: locationDamage.armorRemaining,
          structureRemaining: locationDamage.structureRemaining,
          locationDestroyed: locationDamage.destroyed,
          ...(sourceUnitId !== undefined ? { sourceUnitId } : {}),
        },
        sourceUnitId ?? unitId,
      ),
    );
  }

  if (criticalEvents && criticalEvents.length > 0) {
    emitPhysicalCriticalEvents({
      events,
      gameId,
      turn: nextState.turn,
      ...(sourceUnitId !== undefined ? { attackerId: sourceUnitId } : {}),
      targetId: unitId,
      critEvents: criticalEvents,
      targetPilotingSkill: unitBefore.piloting,
    });
  }

  const unitAfter = nextState.units[unitId];
  if (unitAfter.destroyed && !unitBefore.destroyed) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        nextState.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          cause: dmgResult.result.destructionCause ?? 'damage',
          ...(sourceUnitId !== undefined && sourceUnitId !== unitId
            ? { killerUnitId: sourceUnitId }
            : {}),
        },
        sourceUnitId ?? unitId,
      ),
    );
  }

  return nextState;
}

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
