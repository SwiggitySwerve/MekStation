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
  persistInteractiveSessionMatchLogEvent(context, event);
  applyBattlefieldWreckTerrainForNewInteractiveSessionEvents(
    context,
    sessionBeforeEvent,
  );
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
    persistInteractiveSessionMatchLogEvent(context, event);
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
