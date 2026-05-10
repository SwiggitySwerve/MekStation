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
    if (routeId === 'demo') {
      createDemoSession();
    } else if (typeof routeId === 'string') {
      void loadSession(routeId);
    }
  }, [routeId, loadSession, createDemoSession]);

  useEffect(() => {
    if (!session || !isCompletedForRedirect || hasPersisted) return;
    if (typeof routeId !== 'string' || routeId === 'demo') return;
    let cancelled = false;
    void import('@/lib/combat/combatResolution').then(({ finalize }) =>
      finalize(session)
        .then(() => {
          if (!cancelled) setHasPersisted(true);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          logger.warn('match log persistence failed:', err);
          setHasPersisted(true);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [session, isCompletedForRedirect, hasPersisted, routeId]);

  useEffect(() => {
    if (!session || !isCompletedForRedirect) return;
    if (typeof routeId !== 'string' || routeId === 'demo') return;
    if (!session.config.encounterId) return;
    if (encounterPersistFiredRef.current) return;
    encounterPersistFiredRef.current = true;

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
  }, [session, isCompletedForRedirect, routeId]);

  useEffect(() => {
    if (
      isCompletedForRedirect &&
      !isCampaignBound &&
      typeof routeId === 'string' &&
      routeId !== 'demo'
    ) {
      void router.replace(`/gameplay/games/${routeId}/victory`);
    }
  }, [isCompletedForRedirect, isCampaignBound, routeId, router]);
}
