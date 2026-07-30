import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  applyBattlefieldWreckTerrainForSessionEvents,
  terrainChangedPayloadFromBattlefieldWreckResult,
} from '@/utils/gameplay/battlefieldWreckTerrain';
import { createTerrainChangedEvent } from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';

import type { IInteractiveSessionRuntimeContext } from './InteractiveSession.runtime';

import { reportMatchLogDivergence } from './InteractiveSession.persistence';

export function appendAndPersistInteractiveSessionEvent(
  context: IInteractiveSessionRuntimeContext,
  event: IGameEvent,
): void {
  const sessionBeforeEvent = context.getSession();
  context.setSession(appendEvent(sessionBeforeEvent, event));
  applyBattlefieldWreckTerrainForNewInteractiveSessionEvents(
    context,
    sessionBeforeEvent,
  );
}

export function persistNewInteractiveSessionEvents(
  context: IInteractiveSessionRuntimeContext,
  sessionBeforeEvents: IGameSession,
): void {
  if (typeof window === 'undefined') return;

  const session = context.getSession();
  const previousMatchId = sessionBeforeEvents.matchId ?? sessionBeforeEvents.id;
  const currentMatchId = session.matchId ?? session.id;
  if (currentMatchId !== previousMatchId) return;
  const prefixIsUnchanged = sessionBeforeEvents.events.every(
    (event, index) =>
      session.events[index]?.id === event.id &&
      session.events[index]?.sequence === event.sequence,
  );
  if (!prefixIsUnchanged) {
    context.markMatchLogDiverged();
    reportMatchLogDivergence(
      new Error('Interactive session event history is not append-only'),
    );
    return;
  }

  const newEvents = session.events.slice(sessionBeforeEvents.events.length);
  for (const event of newEvents) {
    persistInteractiveSessionMatchLogEvent(context, event);
  }
}

export function applyBattlefieldWreckTerrainForNewInteractiveSessionEvents(
  context: IInteractiveSessionRuntimeContext,
  sessionBeforeEvents: IGameSession,
): void {
  const session = context.getSession();
  const newEvents = session.events.slice(sessionBeforeEvents.events.length);
  const results = applyBattlefieldWreckTerrainForSessionEvents(
    context.grid,
    sessionBeforeEvents,
    newEvents,
    context.tonnageByUnit,
  );
  for (const result of results) {
    const payload = terrainChangedPayloadFromBattlefieldWreckResult(result);
    if (payload === null) continue;

    const current = context.getSession();
    const event = createTerrainChangedEvent(
      current.id,
      current.events.length,
      current.currentState.turn,
      current.currentState.phase,
      payload,
    );
    context.setSession(appendEvent(current, event));
  }
}

function persistInteractiveSessionMatchLogEvent(
  context: IInteractiveSessionRuntimeContext,
  event: IGameEvent,
): void {
  const session = context.getSession();
  void matchLogStorage
    .appendEvent(session.matchId ?? session.id, event)
    .catch((error: unknown) => {
      context.markMatchLogDiverged();
      reportMatchLogDivergence(error);
    });
}
