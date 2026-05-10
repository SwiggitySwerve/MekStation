import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import { toast } from '@/components/shared/Toast';
import {
  matchLogStorage,
  type MatchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

export const MATCH_LOG_DIVERGENCE_MESSAGE =
  'Match log save failed — local state may diverge';

export type MatchLogHydrationStorage = Pick<
  MatchLogStorage,
  'getEventsForMatch'
> &
  Partial<Pick<MatchLogStorage, 'getLastSequence'>>;

export async function hydrateSessionFromMatchLog(
  matchId: string,
  storage: MatchLogHydrationStorage = matchLogStorage,
): Promise<IGameSession> {
  const events = await storage.getEventsForMatch(matchId);
  const session = hydrateGameSessionFromEvents(matchId, events);

  if (storage.getLastSequence) {
    const diskTailSequence = await storage.getLastSequence(matchId);
    const memoryTailSequence =
      session.events.length === 0
        ? null
        : session.events[session.events.length - 1].sequence;
    if (diskTailSequence !== memoryTailSequence) {
      showMatchLogDivergenceToast();
    }
  }

  return session;
}

export function showMatchLogDivergenceToast(): void {
  toast({
    message: MATCH_LOG_DIVERGENCE_MESSAGE,
    variant: 'error',
  });
}

export function reportMatchLogDivergence(error: unknown): void {
  logger.error(MATCH_LOG_DIVERGENCE_MESSAGE, error);
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    const testConsole = Reflect.get(globalThis, 'console') as Pick<
      Console,
      'error'
    >;
    testConsole.error(MATCH_LOG_DIVERGENCE_MESSAGE, error);
  }
  showMatchLogDivergenceToast();
}
