/**
 * Quick Game Play Component
 * Launches auto-resolved battle via GameEngine and displays progress.
 * Transitions to Results step when battle completes.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

import { Button, Card } from '@/components/ui';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { navigateToGameSession } from '@/lib/gameplay/tacticalNavigation';
import GameSessionPage from '@/pages/gameplay/games/[id]';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { useQuickGameSelector } from '@/stores/useQuickGameStore';
import {
  getQuickGameCompletion,
  matchesQuickGameSession,
} from '@/stores/useQuickGameStore.helpers';
import { GameStatus } from '@/types/gameplay';

// =============================================================================
// Unit Card Component
// =============================================================================

interface UnitCardProps {
  unit: {
    instanceId: string;
    name: string;
    chassis: string;
    variant: string;
    bv: number;
    tonnage: number;
    gunnery: number;
    piloting: number;
    pilotName?: string;
    heat: number;
    isDestroyed: boolean;
    isWithdrawn: boolean;
  };
  isPlayer: boolean;
}

function UnitCard({ unit, isPlayer }: UnitCardProps): React.ReactElement {
  return (
    <div
      className={`rounded-lg border p-3 ${
        unit.isDestroyed
          ? 'border-red-700/50 bg-red-900/30 opacity-60'
          : unit.isWithdrawn
            ? 'border-amber-700/50 bg-amber-900/30 opacity-60'
            : isPlayer
              ? 'border-cyan-700/50 bg-cyan-900/20'
              : 'border-red-700/50 bg-red-900/20'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm font-medium ${unit.isDestroyed ? 'line-through' : ''}`}
          >
            {unit.name}
          </p>
          <p className="text-text-theme-muted text-xs">
            {unit.pilotName && `${unit.pilotName} - `}
            {unit.gunnery}/{unit.piloting}
          </p>
        </div>
        <div className="text-text-theme-muted text-right text-xs">
          <p>{unit.tonnage}t</p>
          <p>{unit.bv} BV</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {unit.heat > 0 && (
          <span className="rounded bg-orange-900/50 px-1.5 py-0.5 text-xs text-orange-300">
            Heat: {unit.heat}
          </span>
        )}
        {unit.isDestroyed && (
          <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300">
            Destroyed
          </span>
        )}
        {unit.isWithdrawn && (
          <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">
            Withdrawn
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Play Component
// =============================================================================

export function QuickGamePlay(): React.ReactElement {
  const router = useRouter();
  const game = useQuickGameSelector((state) => state.game);
  const isLoading = useQuickGameSelector((state) => state.isLoading);
  const error = useQuickGameSelector((state) => state.error);
  const startBattle = useQuickGameSelector((state) => state.startBattle);
  const playAgain = useQuickGameSelector((state) => state.playAgain);
  const reconcileTacticalCompletion = useQuickGameSelector(
    (state) => state.reconcileTacticalCompletion,
  );
  const interactiveSession = useGameplaySelector(
    (state) => state.interactiveSession,
  );
  const session = useGameplaySelector((state) => state.session);
  const spectatorMode = useGameplaySelector((state) => state.spectatorMode);
  const liveTacticalSessionId = session?.matchId ?? session?.id;
  const persistedTacticalSession = game?.activeTacticalSession;
  const hasLiveTacticalSession =
    session?.currentState.status === GameStatus.Active &&
    (!persistedTacticalSession || matchesQuickGameSession(game, session)) &&
    (Boolean(interactiveSession) || spectatorMode?.enabled === true);
  const quickGameId = game?.id;
  const hasRecordedCompletion = Boolean(
    game && getQuickGameCompletion(game, game.id, session),
  );
  const isGameSessionRoute =
    router.asPath?.startsWith('/gameplay/games/') === true ||
    (typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/gameplay/games/'));

  const tacticalSessionId = hasLiveTacticalSession
    ? liveTacticalSessionId
    : persistedTacticalSession?.id;
  const tacticalSpectator = hasLiveTacticalSession
    ? spectatorMode?.enabled === true
    : persistedTacticalSession?.mode === 'spectator';
  const tacticalRouteTarget = tacticalSessionId
    ? JSON.stringify([tacticalSessionId, tacticalSpectator])
    : null;
  const requestedRoute = useRef<{ target: string } | null>(null);
  const [failedRoute, setFailedRoute] = useState<string | null>(null);

  useEffect(() => {
    if (hasRecordedCompletion && quickGameId && session)
      reconcileTacticalCompletion(quickGameId, session);
  }, [
    hasRecordedCompletion,
    quickGameId,
    session,
    reconcileTacticalCompletion,
  ]);

  useEffect(() => {
    if (
      game?.status !== GameStatus.Active ||
      hasRecordedCompletion ||
      isLoading ||
      !tacticalSessionId ||
      isGameSessionRoute
    ) {
      return;
    }

    if (!tacticalRouteTarget || failedRoute === tacticalRouteTarget) return;
    if (requestedRoute.current?.target === tacticalRouteTarget) return;

    const request = { target: tacticalRouteTarget };
    requestedRoute.current = request;
    const markFailed = () => {
      if (requestedRoute.current !== request) return;
      requestedRoute.current = null;
      setFailedRoute(request.target);
    };
    try {
      const result = navigateToGameSession(tacticalSessionId, router, {
        spectator: tacticalSpectator,
      });
      void Promise.resolve(result).then((navigated) => {
        if (navigated === false) markFailed();
      }, markFailed);
    } catch {
      markFailed();
    }
  }, [
    failedRoute,
    game?.status,
    hasRecordedCompletion,
    isGameSessionRoute,
    isLoading,
    router,
    tacticalRouteTarget,
    tacticalSessionId,
    tacticalSpectator,
  ]);

  if (!game) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-text-theme-muted">No game in progress</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <Card className="mx-4 max-w-md border-red-700/50">
          <div className="p-6 text-center">
            <SvgIcon
              size="hero"
              className="mx-auto mb-4 h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </SvgIcon>
            <h3 className="mb-2 text-lg font-medium text-red-300">
              Battle Error
            </h3>
            <p className="text-text-theme-muted text-sm">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (
    failedRoute !== null &&
    failedRoute === tacticalRouteTarget &&
    game.status === GameStatus.Active &&
    !isLoading &&
    !isGameSessionRoute
  ) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <Card className="mx-4 max-w-md p-8 text-center">
          <p role="alert" className="text-text-theme-primary mb-4">
            Could not open the tactical battle. Retry to continue your session.
          </p>
          <Button onClick={() => setFailedRoute(null)}>
            Retry Opening Battle
          </Button>
        </Card>
      </div>
    );
  }

  if (hasLiveTacticalSession && game.status === GameStatus.Active) {
    if (isGameSessionRoute) {
      return <GameSessionPage />;
    }

    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-text-theme-muted">Opening tactical battle...</p>
        </Card>
      </div>
    );
  }

  if (
    game.status === GameStatus.Active &&
    !isLoading &&
    !persistedTacticalSession
  ) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <Card className="mx-4 max-w-lg border-amber-600/50 p-8 text-center">
          <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
            Battle Session Unavailable
          </h2>
          <p className="text-text-theme-muted text-sm">
            This Quick Game is marked active, but no recoverable tactical
            session is linked. No battle result has been recorded.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="primary" onClick={() => void startBattle()}>
              Auto-Resolve Instead
            </Button>
            <Button variant="secondary" onClick={() => playAgain(false)}>
              Start New Setup
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (
    game.status === GameStatus.Active &&
    !isLoading &&
    persistedTacticalSession
  ) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-text-theme-muted">Recovering tactical battle...</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-surface-deep flex min-h-screen items-center justify-center">
        <div className="mx-4 max-w-lg text-center">
          <div className="mb-8">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400/30" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <div className="absolute inset-4 rounded-full bg-cyan-400/10" />
            </div>
          </div>

          <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
            Resolving Battle...
          </h2>
          <p className="text-text-theme-muted mb-8 text-sm">
            The GameEngine is auto-resolving combat between forces
          </p>

          <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-text-theme-primary font-medium">
                    {game.scenario?.template.name}
                  </h3>
                  <p className="text-text-theme-muted mt-1 text-xs">
                    {game.scenario?.mapPreset.name} -{' '}
                    {game.scenario?.mapPreset.biome}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-theme-muted text-sm">Forces</p>
                  <p className="text-text-theme-primary">
                    <span className="text-cyan-400">
                      {game.playerForce.units.length}
                    </span>
                    {' vs '}
                    <span className="text-red-400">
                      {game.opponentForce?.units.length ?? 0}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <div className="border-border-theme border-b p-3">
                <h3 className="text-sm font-medium text-cyan-400">
                  Your Force
                </h3>
              </div>
              <div className="space-y-2 p-3">
                {game.playerForce.units.map((unit) => (
                  <UnitCard key={unit.instanceId} unit={unit} isPlayer />
                ))}
              </div>
            </Card>

            <Card>
              <div className="border-border-theme border-b p-3">
                <h3 className="text-sm font-medium text-red-400">
                  Enemy Force
                </h3>
              </div>
              <div className="space-y-2 p-3">
                {game.opponentForce?.units.map((unit) => (
                  <UnitCard
                    key={unit.instanceId}
                    unit={unit}
                    isPlayer={false}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-deep flex min-h-screen items-center justify-center">
      <Card className="p-8 text-center">
        <p className="text-text-theme-muted">
          Battle complete. Loading results...
        </p>
      </Card>
    </div>
  );
}
