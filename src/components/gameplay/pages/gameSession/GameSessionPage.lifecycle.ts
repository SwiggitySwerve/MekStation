import type { NextRouter } from 'next/router';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';
import type { IGameSession } from '@/types/gameplay';

import {
  deriveReconnectRoomCode,
  useP2PReconnectSession,
} from '@/hooks/useP2PReconnectSession';
import { GameStatus } from '@/types/gameplay';
import { logger } from '@/utils/logger';

interface GameSessionLifecycleParams {
  readonly router: NextRouter;
  readonly routeId: string | null;
  readonly matchId: string | null;
  readonly session: IGameSession | null;
  readonly interactiveSession: InteractiveSession | null;
  readonly isSpectatorMode: boolean;
  readonly isCompletedForRedirect: boolean;
  readonly isCampaignBound: boolean;
  readonly loadSession: (id: string) => Promise<void>;
  readonly createDemoSession: () => void;
}

export const ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE =
  'Leaving now interrupts the active battle. Your match is saved locally when possible, but recovery may be unavailable in this browser state.';

export function shouldWarnBeforeInteractiveBattleUnload(params: {
  readonly routeId: string | null;
  readonly session: IGameSession | null;
  readonly interactiveSession: InteractiveSession | null;
  readonly isSpectatorMode: boolean;
}): boolean {
  return Boolean(
    params.session &&
    params.interactiveSession &&
    typeof params.routeId === 'string' &&
    params.routeId !== 'demo' &&
    !params.isSpectatorMode &&
    params.session.currentState.status !== GameStatus.Completed,
  );
}

function firstRouteValue(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  if (!candidate || /^\[[^\]]+\]$/.test(candidate)) return null;
  return candidate;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function gameSessionIdFromPath(asPath: string): string | null {
  const segments = asPath
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);
  const gamesIndex = segments.indexOf('games');
  const gameId = gamesIndex >= 0 ? segments[gamesIndex + 1] : null;
  return gameId && segments.length === gamesIndex + 2 ? gameId : null;
}

export function resolveGameSessionRouteId(
  routeId: string | string[] | undefined,
  asPath: string,
): string | null {
  return firstRouteValue(routeId) ?? gameSessionIdFromPath(asPath);
}

export function useInteractiveBattleBeforeUnloadWarning(
  shouldWarn: boolean,
): void {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent): string => {
      event.preventDefault();
      event.returnValue = ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE;
      return ACTIVE_INTERACTIVE_BATTLE_UNLOAD_MESSAGE;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);
}

function loadRouteSession(
  routeId: string | null,
  loadSession: (id: string) => Promise<void>,
  createDemoSession: () => void,
): void {
  if (routeId === 'demo') {
    createDemoSession();
    return;
  }
  if (typeof routeId === 'string') {
    void loadSession(routeId);
  }
}

function canPersistCompletedSession(
  session: IGameSession | null,
  isCompletedForRedirect: boolean,
  hasPersisted: boolean,
  routeId: string | null,
): session is IGameSession {
  return Boolean(
    session &&
    isCompletedForRedirect &&
    !hasPersisted &&
    typeof routeId === 'string' &&
    routeId !== 'demo',
  );
}

function persistMatchLog(
  session: IGameSession,
  onPersisted: () => void,
): () => void {
  let cancelled = false;
  void import('@/lib/combat/combatResolution').then(({ finalize }) =>
    finalize(session)
      .then(() => {
        if (!cancelled) onPersisted();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        logger.warn('match log persistence failed:', err);
        onPersisted();
      }),
  );
  return () => {
    cancelled = true;
  };
}

function shouldPersistEncounter(
  session: IGameSession | null,
  isCompletedForRedirect: boolean,
  routeId: string | null,
  alreadyFired: boolean,
): session is IGameSession {
  return Boolean(
    session &&
    isCompletedForRedirect &&
    typeof routeId === 'string' &&
    routeId !== 'demo' &&
    session.config.encounterId &&
    !alreadyFired,
  );
}

function persistEncounterReplay(session: IGameSession): () => void {
  let cancelled = false;
  void import('@/components/encounter/persistEncounterFromSession').then(
    ({ persistEncounterFromSession }) =>
      persistEncounterFromSession(session).then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          logger.warn('[encounter] replay-library persist failed', {
            status: result.status,
            error: result.error,
            gameId: session.id,
          });
        }
      }),
  );

  return () => {
    cancelled = true;
  };
}

function shouldRedirectCompletedGame(
  isCompletedForRedirect: boolean,
  isCampaignBound: boolean,
  routeId: string | null,
): routeId is string {
  return (
    isCompletedForRedirect &&
    !isCampaignBound &&
    typeof routeId === 'string' &&
    routeId !== 'demo'
  );
}

export function useGameSessionLifecycle({
  router,
  routeId,
  matchId,
  session,
  interactiveSession,
  isSpectatorMode,
  isCompletedForRedirect,
  isCampaignBound,
  loadSession,
  createDemoSession,
}: GameSessionLifecycleParams): void {
  const [hasPersisted, setHasPersisted] = useState(false);
  const encounterPersistFiredRef = useRef(false);

  const redirectReconnectToLobby = useCallback(
    (reconnectMatchId: string, reason: string) => {
      const roomCode = deriveReconnectRoomCode(reconnectMatchId);
      const target = roomCode
        ? `/gameplay/lobby/${encodeURIComponent(roomCode)}`
        : '/gameplay/games';
      void router.replace(`${target}?error=${encodeURIComponent(reason)}`);
    },
    [router],
  );

  useP2PReconnectSession(matchId, {
    redirectToLobby: redirectReconnectToLobby,
  });

  useInteractiveBattleBeforeUnloadWarning(
    shouldWarnBeforeInteractiveBattleUnload({
      routeId,
      session,
      interactiveSession,
      isSpectatorMode,
    }),
  );

  useEffect(() => {
    loadRouteSession(routeId, loadSession, createDemoSession);
  }, [routeId, loadSession, createDemoSession]);

  useEffect(() => {
    if (
      !canPersistCompletedSession(
        session,
        isCompletedForRedirect,
        hasPersisted,
        routeId,
      )
    ) {
      return;
    }
    return persistMatchLog(session, () => setHasPersisted(true));
  }, [session, isCompletedForRedirect, hasPersisted, routeId]);

  useEffect(() => {
    if (
      !shouldPersistEncounter(
        session,
        isCompletedForRedirect,
        routeId,
        encounterPersistFiredRef.current,
      )
    ) {
      return;
    }
    encounterPersistFiredRef.current = true;
    return persistEncounterReplay(session);
  }, [session, isCompletedForRedirect, routeId]);

  useEffect(() => {
    if (
      shouldRedirectCompletedGame(
        isCompletedForRedirect,
        isCampaignBound,
        routeId,
      )
    ) {
      void router.replace(`/gameplay/games/${routeId}/victory`);
    }
  }, [isCompletedForRedirect, isCampaignBound, routeId, router]);
}
