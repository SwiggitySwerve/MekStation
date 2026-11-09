import type { NextRouter } from 'next/router';

import { useCallback, useEffect, useRef } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';
import type { MatchLogPrefixVerdict } from '@/lib/p2p/matchLogPrefix';
import type { IGameSession } from '@/types/gameplay';

import { toastHelpers } from '@/components/shared/Toast';
import { useP2PPeerPresence } from '@/hooks/useP2PPeerPresence';
import {
  deriveReconnectRoomCode,
  useP2PReconnectSession,
} from '@/hooks/useP2PReconnectSession';
import { useP2PMirrorStore } from '@/lib/p2p/p2pMirrorStore';
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
  hasAttempted: boolean,
  routeId: string | null,
): session is IGameSession {
  return Boolean(
    session &&
    isCompletedForRedirect &&
    !hasAttempted &&
    typeof routeId === 'string' &&
    routeId !== 'demo',
  );
}

type PersistenceStatus = 'pending' | 'saved' | 'failed';

function persistSessionArtifact(
  session: IGameSession,
  statuses: Map<string, PersistenceStatus>,
  persist: () => Promise<unknown>,
  failureMessage: string,
): void {
  statuses.set(session.id, 'pending');
  // Saves belong to the captured session and must settle even after the
  // page has redirected to victory. A rerender must not cancel or repeat them.
  void (async () => {
    try {
      await persist();
      statuses.set(session.id, 'saved');
    } catch (error) {
      statuses.set(session.id, 'failed');
      logger.warn(failureMessage, { sessionId: session.id, error });
      toastHelpers.error(failureMessage);
    }
  })();
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
  const matchLogStatuses = useRef(new Map<string, PersistenceStatus>());
  const encounterReplayStatuses = useRef(new Map<string, PersistenceStatus>());

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

  // The verdict has always been produced; nothing ever received it
  // (finding #62), so a client whose history disagreed with its peer's
  // discarded its log, kept playing the stale board, and said nothing
  // (finding #79). Recording it is what lets the dock refuse.
  const recordMirrorDivergence = useCallback(
    (verdict: MatchLogPrefixVerdict) => {
      if (!matchId) return;
      useP2PMirrorStore.getState().recordDivergence(matchId, verdict);
    },
    [matchId],
  );

  useP2PReconnectSession(matchId, {
    redirectToLobby: redirectReconnectToLobby,
    onMirrorPrefixDivergence: recordMirrorDivergence,
  });

  // The reconnect hook above answers "was the host there when I loaded
  // this page". This one answers "is my peer there NOW" - the case a
  // player actually hits, and the one nothing watched before umbrella
  // 19.2. Both write the same store field.
  useP2PPeerPresence(matchId);

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
        session ? matchLogStatuses.current.has(session.id) : false,
        routeId,
      )
    ) {
      return;
    }
    persistSessionArtifact(
      session,
      matchLogStatuses.current,
      async () => {
        const { finalize } = await import('@/lib/combat/combatResolution');
        await finalize(session);
      },
      'Failed to save match log. Battle results are still available.',
    );
  }, [session, isCompletedForRedirect, routeId]);

  useEffect(() => {
    if (
      !shouldPersistEncounter(
        session,
        isCompletedForRedirect,
        routeId,
        session ? encounterReplayStatuses.current.has(session.id) : false,
      )
    ) {
      return;
    }
    persistSessionArtifact(
      session,
      encounterReplayStatuses.current,
      async () => {
        const { persistEncounterFromSession } =
          await import('@/components/encounter/persistEncounterFromSession');
        const result = await persistEncounterFromSession(session);
        if (!result.ok) {
          throw new Error(
            `Replay save failed (${result.status ?? 'network error'})`,
            { cause: result.error },
          );
        }
      },
      'Failed to save encounter replay. Battle results are still available.',
    );
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
