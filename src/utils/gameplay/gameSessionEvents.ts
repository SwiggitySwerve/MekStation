import type { IGameEvent, IGameSession } from '@/types/gameplay';

import { deriveState } from './gameState';

export function appendEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  const events = [...session.events, event];
  const currentState = deriveState(session.id, events);

  return {
    ...session,
    events,
    currentState,
    updatedAt: new Date().toISOString(),
  };
}
