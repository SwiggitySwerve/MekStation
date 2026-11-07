/** Match lifecycle completion is a projection of committed terminal events. */
import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchStore } from './IMatchStore';

/** Never call with speculative engine events: the whole command must be durable. */
export async function markMatchCompleted(
  store: IMatchStore,
  matchId: string,
  committedEvents: readonly IGameEvent[],
): Promise<boolean> {
  if (
    !committedEvents.some((event) => event.type === GameEventType.GameEnded)
  ) {
    return false;
  }
  // Store completion only. Host teardown has a separate outcome safety net.
  await store.closeMatch(matchId);
  return true;
}
