import { useCallback, useEffect, useState } from 'react';

import type { IGameSession } from '@/types/gameplay';
import type { IQuickGameInstance } from '@/types/quickgame';

import { hydrateRecoverableSessionFromMatchLog } from '@/engine/InteractiveSession.persistence';
import { matchesQuickGameSession } from '@/stores/useQuickGameStore.helpers';
import { GameStatus } from '@/types/gameplay';

interface RecoveredQuickGameSession {
  readonly gameId: string;
  readonly matchId: string;
  readonly attempt: number;
  readonly session: IGameSession | null;
  readonly error: string | null;
}

export function useQuickGameSession(
  game: IQuickGameInstance | null,
  liveSession: IGameSession | null,
): {
  readonly session: IGameSession | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly retry: () => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [recovered, setRecovered] = useState<RecoveredQuickGameSession | null>(
    null,
  );
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const matchId = game?.activeTacticalSession?.id;
  const matchingLive =
    matchesQuickGameSession(game, liveSession) &&
    (game?.status !== GameStatus.Completed ||
      liveSession.currentState.status === GameStatus.Completed)
      ? liveSession
      : null;

  useEffect(() => {
    if (!game || !matchId || matchingLive) return;
    let cancelled = false;
    const identity = { gameId: game.id, matchId, attempt };
    setRecovered(null);
    void hydrateRecoverableSessionFromMatchLog(matchId).then(
      (session) => {
        if (cancelled) return;
        if (!matchesQuickGameSession(game, session)) {
          setRecovered({
            ...identity,
            session: null,
            error: 'Recorded battle identity does not match this Quick Game.',
          });
          return;
        }
        if (
          game.status === GameStatus.Completed &&
          session.currentState.status !== GameStatus.Completed
        ) {
          setRecovered({
            ...identity,
            session: null,
            error: 'The recorded battle has no completed result.',
          });
          return;
        }
        setRecovered({ ...identity, session, error: null });
      },
      (error) => {
        if (cancelled) return;
        setRecovered({
          ...identity,
          session: null,
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load the recorded battle.',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [game, matchId, matchingLive, attempt]);

  if (matchingLive)
    return { session: matchingLive, isLoading: false, error: null, retry };
  if (!game || !matchId)
    return {
      session: null,
      isLoading: false,
      error: game
        ? 'No recorded tactical battle is linked to this Quick Game.'
        : null,
      retry,
    };
  if (
    recovered?.gameId === game.id &&
    recovered.matchId === matchId &&
    recovered.attempt === attempt
  ) {
    return {
      session: recovered.session,
      isLoading: false,
      error: recovered.error,
      retry,
    };
  }
  return { session: null, isLoading: true, error: null, retry };
}
