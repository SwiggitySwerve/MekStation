import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GameEventType,
  type GamePhase,
  type IComponentDamageState,
  type IGameEvent,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  applyCriticalHitEffect,
  buildDefaultCriticalSlotManifest,
  selectCriticalSlot,
  type CriticalHitEvent,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';

import { createGameEvent } from './utils';

const MASC_FAILURE_LEG_CRITICAL_LOCATIONS = ['left_leg', 'right_leg'] as const;

export interface IMASCFailureCriticalDamageResult {
  readonly unit: IUnitGameState;
  readonly manifest: CriticalSlotManifest;
  readonly criticalEvents: readonly CriticalHitEvent[];
}

function markCriticalSlotDestroyed(
  manifest: CriticalSlotManifest,
  location: string,
  slotIndex: number,
): CriticalSlotManifest {
  const slots = manifest[location] ?? [];
  return {
    ...manifest,
    [location]: slots.map((slot) =>
      slot.slotIndex === slotIndex ? { ...slot, destroyed: true } : slot,
    ),
  };
}

function emitMASCFailureCriticalEvents(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly unitId: string;
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly pilotingSkill?: number;
}): void {
  const { criticalEvents, events, gameId, phase, pilotingSkill, turn, unitId } =
    options;

  for (const event of criticalEvents) {
    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHit,
          turn,
          phase,
          {
            unitId,
            location: payload.location,
            sourceUnitId: unitId,
            component: payload.componentType,
            count: 1,
          },
          unitId,
        ),
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHitResolved,
          turn,
          phase,
          {
            unitId,
            location: payload.location,
            slotIndex: payload.slotIndex,
            componentType: payload.componentType,
            componentName: payload.componentName,
            ...(payload.ammoBinId !== undefined
              ? { ammoBinId: payload.ammoBinId }
              : {}),
            effect: payload.effect,
            destroyed: payload.destroyed,
          },
          unitId,
        ),
      );

      if (payload.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.ComponentDestroyed,
            turn,
            phase,
            {
              unitId,
              location: payload.location,
              componentType: payload.componentType,
              slotIndex: payload.slotIndex,
              componentName: payload.componentName,
              ...(payload.ammoBinId !== undefined
                ? { ammoBinId: payload.ammoBinId }
                : {}),
            },
            unitId,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRTriggered,
          turn,
          phase,
          {
            unitId,
            reason: payload.reason,
            additionalModifier: payload.additionalModifier,
            triggerSource: payload.triggerSource,
            ...(pilotingSkill !== undefined
              ? { basePilotingSkill: pilotingSkill }
              : {}),
            ...(payload.reasonCode !== undefined
              ? { reasonCode: payload.reasonCode }
              : {}),
          },
          unitId,
        ),
      );
    }
  }
}

export function applyMASCFailureCriticalDamage(options: {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly manifest?: CriticalSlotManifest;
  readonly componentDamage: IComponentDamageState;
  readonly slotRoller: D6Roller;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly turn?: number;
  readonly phase?: GamePhase;
}): IMASCFailureCriticalDamageResult {
  const {
    componentDamage,
    events,
    gameId,
    phase,
    slotRoller,
    turn,
    unit,
    unitId,
  } = options;
  let currentManifest = options.manifest ?? buildDefaultCriticalSlotManifest();
  let currentDamage = componentDamage;
  const criticalEvents: CriticalHitEvent[] = [];

  for (const location of MASC_FAILURE_LEG_CRITICAL_LOCATIONS) {
    const slot = selectCriticalSlot(currentManifest, location, slotRoller);
    if (!slot) continue;

    currentManifest = markCriticalSlotDestroyed(
      currentManifest,
      location,
      slot.slotIndex,
    );
    const applied = applyCriticalHitEffect(
      slot,
      unitId,
      location,
      currentDamage,
    );
    currentDamage = applied.updatedComponentDamage;
    criticalEvents.push(...applied.events);
  }

  if (
    criticalEvents.length > 0 &&
    events !== undefined &&
    gameId !== undefined &&
    turn !== undefined &&
    phase !== undefined
  ) {
    emitMASCFailureCriticalEvents({
      events,
      gameId,
      turn,
      phase,
      unitId,
      criticalEvents,
      pilotingSkill: unit.piloting,
    });
  }

  return {
    unit: {
      ...unit,
      componentDamage: currentDamage,
    },
    manifest: currentManifest,
    criticalEvents,
  };
}
