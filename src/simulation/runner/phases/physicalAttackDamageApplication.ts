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
  type CriticalHitEvent,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { buildDefaultComponentDamageState } from '@/utils/gameplay/gameSessionAttackResolutionHelpers';
import { isHeadHit } from '@/utils/gameplay/hitLocation';
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
import { appendUnitDestroyedEvent, createGameEvent } from './utils';
import { applyCriticalPSRTriggers } from './weaponAttackPsrTriggers';

export interface IApplyPhysicalDamageOptions {
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
}

type PhysicalDamageResult = ReturnType<typeof resolveDamage>;

function capPhysicalDamageForLocation(
  hitLocation: CombatLocation,
  damage: number,
): number {
  if (isHeadHit(hitLocation) && damage > HEAD_HIT_DAMAGE_CAP) {
    return HEAD_HIT_DAMAGE_CAP;
  }
  return damage;
}

export function getOrSeedPhysicalCriticalManifest(
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

function resolvePhysicalDamageResult(
  options: IApplyPhysicalDamageOptions & {
    unitBefore: IUnitGameState;
    manifest?: CriticalSlotManifest;
  },
): PhysicalDamageResult {
  const damageState = buildDamageState(options.unitBefore);
  const cappedDamage = capPhysicalDamageForLocation(
    options.hitLocation,
    options.damage,
  );
  return resolveDamage(
    options.manifest === undefined
      ? damageState
      : {
          ...damageState,
          turn: options.state.turn,
          criticalContext: {
            unitId: options.unitId,
            manifest: options.manifest,
            componentDamage:
              options.unitBefore.componentDamage ??
              buildDefaultComponentDamageState(),
            optionalRules: options.optionalRules,
          },
        },
    options.hitLocation,
    cappedDamage,
    options.d6Roller,
  );
}

function mergePhysicalCriticalEvents(options: {
  unitBefore: IUnitGameState;
  manifest?: CriticalSlotManifest;
  damageCriticalEvents?: readonly CriticalHitEvent[];
}): readonly CriticalHitEvent[] {
  const sourceLifecycleEvents = physicalEquipmentLifecycleEventsFromManifest({
    unit: options.unitBefore,
    manifest: options.manifest,
  });
  return [...sourceLifecycleEvents, ...(options.damageCriticalEvents ?? [])];
}

function applyPhysicalCriticalStateEffects(options: {
  state: IGameState;
  unitId: string;
  criticalEvents: readonly CriticalHitEvent[];
  damageCriticalEvents?: readonly CriticalHitEvent[];
}): IGameState {
  if (options.criticalEvents.length === 0) return options.state;

  let nextState = options.state;
  const unitAfterEquipmentEvents = applyPhysicalEquipmentCriticalEvents(
    nextState.units[options.unitId],
    options.criticalEvents,
  );
  if (unitAfterEquipmentEvents !== nextState.units[options.unitId]) {
    nextState = {
      ...nextState,
      units: {
        ...nextState.units,
        [options.unitId]: unitAfterEquipmentEvents,
      },
    };
  }
  return options.damageCriticalEvents
    ? applyCriticalPSRTriggers(nextState, options.damageCriticalEvents)
    : nextState;
}

function emitPhysicalDamageAppliedEvents(options: {
  events: IGameEvent[];
  gameId: string;
  nextState: IGameState;
  unitId: string;
  sourceUnitId?: string;
  damageResult: PhysicalDamageResult;
}): void {
  for (const locationDamage of options.damageResult.result.locationDamages) {
    options.events.push(
      createGameEvent(
        options.gameId,
        options.events.length,
        GameEventType.DamageApplied,
        options.nextState.turn,
        GamePhase.PhysicalAttack,
        {
          unitId: options.unitId,
          location: locationDamage.location,
          damage: locationDamage.damage,
          armorRemaining: locationDamage.armorRemaining,
          structureRemaining: locationDamage.structureRemaining,
          locationDestroyed: locationDamage.destroyed,
          ...(options.sourceUnitId !== undefined
            ? { sourceUnitId: options.sourceUnitId }
            : {}),
        },
        options.sourceUnitId ?? options.unitId,
      ),
    );
  }
}

function emitPhysicalCriticalEventsForDamage(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  sourceUnitId?: string;
  targetId: string;
  criticalEvents: readonly CriticalHitEvent[];
  targetPilotingSkill?: number;
}): void {
  if (options.criticalEvents.length === 0) return;

  emitPhysicalCriticalEvents({
    events: options.events,
    gameId: options.gameId,
    turn: options.turn,
    ...(options.sourceUnitId !== undefined
      ? { attackerId: options.sourceUnitId }
      : {}),
    targetId: options.targetId,
    critEvents: options.criticalEvents,
    targetPilotingSkill: options.targetPilotingSkill,
  });
}

function emitPhysicalUnitDestroyedEvent(options: {
  events: IGameEvent[];
  gameId: string;
  nextState: IGameState;
  unitBefore: IUnitGameState;
  unitId: string;
  sourceUnitId?: string;
  damageResult: PhysicalDamageResult;
}): void {
  const unitAfter = options.nextState.units[options.unitId];
  if (!unitAfter.destroyed || options.unitBefore.destroyed) return;

  appendUnitDestroyedEvent({
    events: options.events,
    gameId: options.gameId,
    turn: options.nextState.turn,
    phase: GamePhase.PhysicalAttack,
    unitId: options.unitId,
    cause: options.damageResult.result.destructionCause ?? 'damage',
    actorId: options.sourceUnitId ?? options.unitId,
    ...(options.sourceUnitId !== undefined &&
    options.sourceUnitId !== options.unitId
      ? { killerUnitId: options.sourceUnitId }
      : {}),
  });
}

export function applyPhysicalDamage(
  options: IApplyPhysicalDamageOptions,
): IGameState {
  const unitBefore = options.state.units[options.unitId];
  if (!unitBefore || unitBefore.destroyed) return options.state;

  const manifest = getOrSeedPhysicalCriticalManifest(
    options.manifestsByUnit,
    options.unitId,
  );
  const damageResult = resolvePhysicalDamageResult({
    ...options,
    unitBefore,
    manifest,
  });
  if (options.manifestsByUnit && damageResult.manifest) {
    options.manifestsByUnit.set(options.unitId, damageResult.manifest);
  }

  const criticalEvents = mergePhysicalCriticalEvents({
    unitBefore,
    manifest,
    damageCriticalEvents: damageResult.criticalEvents,
  });
  let nextState = applyDamageResultToState(
    options.state,
    options.unitId,
    damageResult.state,
    damageResult.result,
    damageResult.componentDamage,
  );
  nextState = applyPhysicalCriticalStateEffects({
    state: nextState,
    unitId: options.unitId,
    criticalEvents,
    damageCriticalEvents: damageResult.criticalEvents,
  });

  emitPhysicalDamageAppliedEvents({ ...options, nextState, damageResult });
  emitPhysicalCriticalEventsForDamage({
    events: options.events,
    gameId: options.gameId,
    turn: nextState.turn,
    sourceUnitId: options.sourceUnitId,
    targetId: options.unitId,
    criticalEvents,
    targetPilotingSkill: unitBefore.piloting,
  });
  emitPhysicalUnitDestroyedEvent({
    ...options,
    nextState,
    unitBefore,
    damageResult,
  });

  return nextState;
}
