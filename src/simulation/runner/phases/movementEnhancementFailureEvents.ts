import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution';

import {
  GameEventType,
  type GamePhase,
  type IGameEvent,
} from '@/types/gameplay';

import {
  appendPsrTriggeredEvent,
  appendUnitDestroyedEvent,
  createGameEvent,
} from './utils';

export function emitMovementEnhancementFailureCriticalEvents(options: {
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

    if (event.type === 'unit_destroyed') {
      appendUnitDestroyedEvent({
        events,
        gameId,
        turn,
        phase,
        unitId,
        cause:
          event.payload.cause === 'damage'
            ? 'engine_destroyed'
            : event.payload.cause,
        actorId: unitId,
      });
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      appendPsrTriggeredEvent({
        events,
        gameId,
        turn,
        phase,
        unitId,
        reason: payload.reason,
        additionalModifier: payload.additionalModifier,
        triggerSource: payload.triggerSource,
        actorId: unitId,
        ...(pilotingSkill !== undefined
          ? { basePilotingSkill: pilotingSkill }
          : {}),
        ...(payload.reasonCode !== undefined
          ? { reasonCode: payload.reasonCode }
          : {}),
      });
    }
  }
}
