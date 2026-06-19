import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameSession,
} from '@/types/gameplay';

import { type CriticalHitEvent } from './criticalHitResolution';
import {
  createComponentDestroyedEvent,
  createCriticalHitResolvedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { createEventBase } from './gameEvents/base';
import { appendEvent } from './gameSessionCore';

function createHeatCriticalHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  component: string,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHit,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload: {
      unitId,
      location,
      component,
      count: 1,
    },
  };
}

function mapCriticalDestructionCause(
  cause: string,
):
  | 'damage'
  | 'ammo_explosion'
  | 'pilot_death'
  | 'engine_destroyed'
  | 'impossible_displacement'
  | 'ct_destroyed'
  | 'head_destroyed' {
  return cause === 'damage'
    ? 'engine_destroyed'
    : (cause as
        | 'damage'
        | 'ammo_explosion'
        | 'pilot_death'
        | 'engine_destroyed'
        | 'impossible_displacement'
        | 'ct_destroyed'
        | 'head_destroyed');
}

export function emitHeatCriticalEvents(
  session: IGameSession,
  criticalEvents: readonly CriticalHitEvent[],
  turn: number,
  unitId: string,
): IGameSession {
  let currentSession = session;

  for (const event of criticalEvents) {
    const sequence = currentSession.events.length;

    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createHeatCriticalHitEvent(
          currentSession.id,
          sequence,
          turn,
          payload.unitId,
          payload.location,
          payload.componentType,
        ),
      );
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          currentSession.events.length,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.location,
          payload.slotIndex,
          payload.componentType,
          payload.componentName,
          payload.effect,
          payload.destroyed,
        ),
      );
      if (payload.destroyed) {
        currentSession = appendEvent(
          currentSession,
          createComponentDestroyedEvent(
            currentSession.id,
            currentSession.events.length,
            turn,
            payload.unitId,
            payload.location,
            payload.componentType,
            payload.slotIndex,
            payload.componentName,
            GamePhase.Heat,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      const psrUnit = currentSession.units.find((u) => u.id === payload.unitId);
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.reason,
          payload.additionalModifier,
          payload.triggerSource,
          psrUnit?.piloting,
          payload.reasonCode,
        ),
      );
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.wounds,
          payload.totalWounds,
          payload.source,
          payload.consciousnessCheckRequired,
          payload.consciousnessCheckPassed,
        ),
      );
      continue;
    }

    if (event.type === 'unit_destroyed') {
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          unitId,
          mapCriticalDestructionCause(event.payload.cause),
        ),
      );
    }
  }

  return currentSession;
}
