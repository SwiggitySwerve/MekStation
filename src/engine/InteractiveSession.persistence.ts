import { toast } from '@/components/shared/Toast';
import {
  matchLogStorage,
  type MatchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import {
  GameEventType,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

export const MATCH_LOG_DIVERGENCE_MESSAGE =
  'Match log save failed — local state may diverge';
export const INTERACTIVE_SESSION_NOT_FOUND_MESSAGE =
  'Match not found or already cleared';
export const INTERACTIVE_SESSION_CORRUPT_MESSAGE =
  'Match log is corrupt and cannot be recovered';
export const INTERACTIVE_SESSION_STORAGE_UNAVAILABLE_MESSAGE =
  'Match could not be recovered because local match storage is unavailable';

export class InteractiveSessionRecoveryNotFoundError extends Error {
  constructor(readonly matchId: string) {
    super(INTERACTIVE_SESSION_NOT_FOUND_MESSAGE);
    this.name = 'InteractiveSessionRecoveryNotFoundError';
  }
}

export class InteractiveSessionRecoveryCorruptError extends Error {
  constructor(
    readonly matchId: string,
    readonly originalError?: unknown,
  ) {
    super(INTERACTIVE_SESSION_CORRUPT_MESSAGE);
    this.name = 'InteractiveSessionRecoveryCorruptError';
  }
}

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

  await reportTailDivergenceIfNeeded(matchId, session, storage);

  return session;
}

export async function hydrateRecoverableSessionFromMatchLog(
  matchId: string,
  storage: MatchLogHydrationStorage = matchLogStorage,
): Promise<IGameSession> {
  const events = await storage.getEventsForMatch(matchId);
  if (events.length === 0) {
    throw new InteractiveSessionRecoveryNotFoundError(matchId);
  }

  const orderedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
  if (orderedEvents[0]?.type !== GameEventType.GameCreated) {
    throw new InteractiveSessionRecoveryCorruptError(
      matchId,
      new Error('Match log is missing GameCreated'),
    );
  }

  try {
    const session = hydrateGameSessionFromEvents(matchId, orderedEvents);
    await reportTailDivergenceIfNeeded(matchId, session, storage);
    return session;
  } catch (error) {
    throw new InteractiveSessionRecoveryCorruptError(matchId, error);
  }
}

async function reportTailDivergenceIfNeeded(
  matchId: string,
  session: IGameSession,
  storage: MatchLogHydrationStorage,
): Promise<void> {
  if (!storage.getLastSequence) {
    return;
  }

  const diskTailSequence = await storage.getLastSequence(matchId);
  const memoryTailSequence =
    session.events.length === 0
      ? null
      : session.events[session.events.length - 1].sequence;
  if (diskTailSequence !== memoryTailSequence) {
    showMatchLogDivergenceToast();
  }
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
