import type { NextRouter } from 'next/router';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { IGameSession } from '@/types/gameplay';

import {
  deriveReconnectRoomCode,
  useP2PReconnectSession,
} from '@/hooks/useP2PReconnectSession';
import { logger } from '@/utils/logger';

interface GameSessionLifecycleParams {
  readonly router: NextRouter;
  readonly routeId: string | string[] | undefined;
  readonly matchId: string | null;
  readonly session: IGameSession | null;
  readonly isCompletedForRedirect: boolean;
  readonly isCampaignBound: boolean;
  readonly loadSession: (id: string) => Promise<void>;
  readonly createDemoSession: () => void;
}

function loadRouteSession(
  routeId: string | string[] | undefined,
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
  routeId: string | string[] | undefined,
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
  routeId: string | string[] | undefined,
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
  routeId: string | string[] | undefined,
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
