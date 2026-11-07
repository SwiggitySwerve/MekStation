import type {
  CombatLocation,
  IGameSession,
  IGameEvent,
  ICriticalHitResolvedPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase } from '@/types/gameplay';

import type {
  CriticalHitEvent,
  ICriticalResolutionResult,
} from './criticalHitResolution';
import type { D6Roller } from './diceTypes';

import {
  buildDefaultCriticalSlotManifest,
  resolveCriticalHits,
} from './criticalHitResolution';
import {
  createDamageAppliedEvent,
  createLocationDestroyedEvent,
} from './gameEvents';
import {
  buildDefaultComponentDamageState,
  emitCriticalEvents,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';

/** The normal-check adapter retains the critical owner's complete payload. */
export function retainPhysicalCriticalPayloads(
  events: readonly IGameEvent[],
  criticalEvents: readonly CriticalHitEvent[],
): IGameEvent[] {
  const remaining = criticalEvents.filter(
    (critical) => critical.type === 'critical_hit_resolved',
  );
  return events.map((event) => {
    if (event.type !== GameEventType.CriticalHitResolved) return event;
    const payload = event.payload as ICriticalHitResolvedPayload;
    const index = remaining.findIndex(
      (critical) =>
        critical.payload.unitId === payload.unitId &&
        critical.payload.location === payload.location &&
        critical.payload.slotIndex === payload.slotIndex,
    );
    if (index < 0) return event;
    const [source] = remaining.splice(index, 1);
    return { ...event, payload: source.payload };
  });
}

/** Translate the critical owner's limb/head flags to replayable location events. */
export function physicalCriticalLocationEvents(input: {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly unitId: string;
  readonly location: CombatLocation;
  readonly result: Pick<
    ICriticalResolutionResult,
    'locationBlownOff' | 'headDestroyed'
  >;
}): readonly IGameEvent[] {
  if (!input.result.locationBlownOff && !input.result.headDestroyed) return [];
  const context = {
    gameId: input.gameId,
    turn: input.turn,
    phase: GamePhase.PhysicalAttack,
    unitId: input.unitId,
    location: input.location,
  };
  return [
    createDamageAppliedEvent({
      ...context,
      sequence: input.sequence,
      damage: 0,
      armorRemaining: 0,
      structureRemaining: 0,
      locationDestroyed: true,
    }),
    createLocationDestroyedEvent({ ...context, sequence: input.sequence + 1 }),
  ];
}

/** Apply extra normal determinations through the existing critical/event owners. */
export function appendPhysicalCriticalChecks(
  session: IGameSession,
  options: {
    readonly unitId: string;
    readonly sourceUnitId: string;
    readonly locations: readonly CombatLocation[];
    readonly d6Roller: D6Roller;
  },
): IGameSession {
  let current = session;
  for (const location of options.locations) {
    const unit = current.currentState.units[options.unitId];
    if (!unit || unit.destroyed) break;
    const result = resolveCriticalHits(
      options.unitId,
      location,
      unit.criticalSlotManifest ?? buildDefaultCriticalSlotManifest(),
      unit.componentDamage ?? buildDefaultComponentDamageState(),
      options.d6Roller,
      undefined,
      undefined,
      {
        optionalRules: current.config.optionalRules,
        pilotAbilities: unit.abilities,
        edgePointsRemaining: unit.edgePointsRemaining,
        turn: current.currentState.turn,
        unitId: options.unitId,
      },
    );
    current = emitCriticalEvents(
      current,
      result.events,
      current.currentState.turn,
      options.unitId,
      {
        phase: GamePhase.PhysicalAttack,
        sourceUnitId: options.sourceUnitId,
        emitCriticalHitPrelude: true,
      },
    );
    current = physicalCriticalLocationEvents({
      gameId: current.id,
      sequence: current.events.length,
      turn: current.currentState.turn,
      unitId: options.unitId,
      location,
      result,
    }).reduce(appendEvent, current);
  }
  return current;
}
