/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 * Includes replay functionality for completed games.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';

import type { IUnitGameState } from '@/types/gameplay/GameSessionInterfaces';

import { GameplayLayout, SpectatorView } from '@/components/gameplay';
import { Button } from '@/components/ui';
import {
  useCampaignRosterStore,
  type IUnitDamageState,
} from '@/stores/campaign/useCampaignRosterStore';
import { useGameplayStore, InteractivePhase } from '@/stores/useGameplayStore';
import { GameSide, GameStatus, MovementType } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Loading Component
// =============================================================================

function GameLoading(): React.ReactElement {
  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="game-loading"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-gray-400">Loading game session...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Completed Game Component
// =============================================================================

interface CompletedGameProps {
  gameId: string;
  winner: GameSide | 'draw';
  reason: string;
  campaignId?: string;
  missionId?: string;
  unitStates?: Record<string, IUnitGameState>;
}

function CompletedGame({
  gameId,
  winner,
  reason,
  campaignId,
  missionId,
  unitStates,
}: CompletedGameProps): React.ReactElement {
  const router = useRouter();
  const rosterStore = useCampaignRosterStore;

  const winnerText =
    winner === 'draw'
      ? 'Draw'
      : winner === GameSide.Player
        ? 'Victory'
        : 'Defeat';

  const winnerColor =
    winner === 'draw'
      ? 'text-amber-400'
      : winner === GameSide.Player
        ? 'text-emerald-400'
        : 'text-red-400';

  const handleReturnToCampaign = useCallback(() => {
    if (!campaignId || !missionId) return;

    const resultValue =
      winner === GameSide.Player
        ? 'victory'
        : winner === GameSide.Opponent
          ? 'defeat'
          : 'draw';

    const damageStates: IUnitDamageState[] = [];
    if (unitStates) {
      const rosterUnits = rosterStore.getState().units;
      for (const unit of rosterUnits) {
        const gameUnit = Object.values(unitStates).find(
          (u) => u.side === GameSide.Player && u.id === unit.unitId,
        );

        if (gameUnit) {
          const armorDamage: Record<string, number> = {};
          for (const [loc, maxVal] of Object.entries(gameUnit.armor)) {
            const currentVal = gameUnit.armor[loc] ?? 0;
            const diff = (maxVal ?? 0) - currentVal;
            if (diff > 0) armorDamage[loc] = diff;
          }

          const structureDamage: Record<string, number> = {};
          for (const [loc, val] of Object.entries(gameUnit.structure)) {
            const maxStructure = gameUnit.structure[loc] ?? 0;
            const diff = maxStructure - (val ?? 0);
            if (diff > 0) structureDamage[loc] = diff;
          }

          damageStates.push({
            unitId: unit.unitId,
            armorDamage,
            structureDamage,
            destroyedComponents: [...gameUnit.destroyedLocations],
            destroyed: gameUnit.destroyed,
          });
        }
      }
    }

    rosterStore
      .getState()
      .completeMission(
        missionId,
        resultValue as 'victory' | 'defeat' | 'draw',
        damageStates,
        gameId,
      );

    router.push(`/gameplay/campaigns/${campaignId}`);
  }, [campaignId, missionId, winner, unitStates, rosterStore, gameId, router]);

  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="game-completed"
    >
      <div className="max-w-lg text-center">
        <div className={`mb-4 text-6xl font-bold ${winnerColor}`}>
          {winnerText}
        </div>
        <p className="mb-8 text-lg text-gray-400 capitalize">
          {reason.replace('_', ' ')}
        </p>

        <div className="flex flex-col items-center gap-4">
          {campaignId && missionId && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleReturnToCampaign}
              data-testid="return-to-campaign-btn"
            >
              Return to Campaign
            </Button>
          )}

          <div className="flex items-center justify-center gap-4">
            <Link href={`/gameplay/games/${gameId}/replay`}>
              <Button
                variant={campaignId ? 'secondary' : 'primary'}
                size="lg"
                data-testid="replay-game-btn"
              >
                Replay Game
              </Button>
            </Link>
            <Link href="/gameplay/games">
              <Button
                variant="secondary"
                size="lg"
                data-testid="back-to-games-btn"
              >
                Back to Games
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-700 pt-8">
          <Link
            href={`/audit/timeline?gameId=${gameId}`}
            className="flex items-center justify-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            View Full Event Timeline
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Error Component
// =============================================================================

interface GameErrorProps {
  message: string;
  onRetry: () => void;
}

function GameError({ message, onRetry }: GameErrorProps): React.ReactElement {
  return (
    <div
      className="flex h-screen items-center justify-center bg-gray-900"
      data-testid="game-error"
    >
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Failed to Load Game
        </h2>
        <p className="mb-4 text-gray-400">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={onRetry}
            data-testid="game-retry-btn"
          >
            Try Again
          </Button>
          <Link href="/gameplay/games">
            <Button variant="secondary" data-testid="back-to-games-btn">
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function GameSessionPage(): React.ReactElement {
  const router = useRouter();
  const { id, campaignId, missionId } = router.query;
  const campaignIdStr = typeof campaignId === 'string' ? campaignId : undefined;
  const missionIdStr = typeof missionId === 'string' ? missionId : undefined;

  const {
    session,
    isLoading,
    error,
    loadSession,
    createDemoSession,
    ui,
    selectUnit,
    handleAction,
    unitWeapons,
    maxArmor,
    maxStructure,
    pilotNames,
    heatSinks,
    clearError,
    interactiveSession,
    interactivePhase,
    spectatorMode,
    validMovementHexes,
    validTargetIds,
    hitChance,
    handleInteractiveHexClick,
    handleInteractiveTokenClick,
    advanceInteractivePhase,
    fireWeapons,
    runAITurn,
    skipPhase,
    checkGameOver,
  } = useGameplayStore();

  // Load session on mount
  useEffect(() => {
    if (id === 'demo') {
      createDemoSession();
    } else if (typeof id === 'string') {
      loadSession(id);
    }
  }, [id, loadSession, createDemoSession]);

  const isInteractive = !!interactiveSession;

  const handleHexClick = useCallback(
    (hex: { q: number; r: number }) => {
      if (interactiveSession) {
        handleInteractiveHexClick(hex);
      } else {
        logger.debug('Hex clicked:', hex);
      }
    },
    [interactiveSession, handleInteractiveHexClick],
  );

  const handleRetry = useCallback(() => {
    clearError();
    if (typeof id === 'string') {
      loadSession(id);
    }
  }, [id, loadSession, clearError]);

  const handleTokenClick = useCallback(
    (unitId: string | null) => {
      if (!unitId) {
        selectUnit(null);
        return;
      }
      if (isInteractive) {
        handleInteractiveTokenClick(unitId);
      } else {
        selectUnit(unitId === ui.selectedUnitId ? null : unitId);
      }
    },
    [isInteractive, handleInteractiveTokenClick, selectUnit, ui.selectedUnitId],
  );

  const handleInteractiveAction = useCallback(
    (actionId: string) => {
      if (!isInteractive) {
        handleAction(actionId);
        return;
      }

      switch (actionId) {
        case 'lock':
        case 'skip':
          skipPhase();
          break;
        case 'next-turn':
          runAITurn();
          break;
        case 'fire':
          fireWeapons();
          break;
        case 'advance':
          advanceInteractivePhase();
          break;
        case 'concede':
          handleAction(actionId);
          break;
        default:
          handleAction(actionId);
      }

      checkGameOver();
    },
    [
      isInteractive,
      handleAction,
      skipPhase,
      runAITurn,
      fireWeapons,
      advanceInteractivePhase,
      checkGameOver,
    ],
  );

  if (isLoading) {
    return <GameLoading />;
  }

  if (error) {
    return <GameError message={error} onRetry={handleRetry} />;
  }

  if (!session) {
    return <GameLoading />;
  }

  if (
    session.currentState.status === GameStatus.Completed &&
    session.currentState.result
  ) {
    return (
      <CompletedGame
        gameId={session.id}
        winner={session.currentState.result.winner}
        reason={session.currentState.result.reason}
        campaignId={campaignIdStr}
        missionId={missionIdStr}
        unitStates={session.currentState.units}
      />
    );
  }

  if (
    interactivePhase === InteractivePhase.GameOver &&
    interactiveSession &&
    !spectatorMode
  ) {
    const result = interactiveSession.getResult();
    const rawWinner = result?.winner ?? 'draw';
    const winner: GameSide | 'draw' =
      rawWinner === 'player'
        ? GameSide.Player
        : rawWinner === 'opponent'
          ? GameSide.Opponent
          : 'draw';
    const reason = result?.reason ?? 'unknown';
    return (
      <CompletedGame
        gameId={session.id}
        winner={winner}
        reason={reason}
        campaignId={campaignIdStr}
        missionId={missionIdStr}
        unitStates={interactiveSession.getState().units}
      />
    );
  }

  if (spectatorMode?.enabled && interactiveSession) {
    return <SpectatorView />;
  }

  const isPlayerTurn = session.currentState.firstMover === GameSide.Player;

  const movementRangeHexes = validMovementHexes.map((hex) => ({
    hex,
    mpCost: 1,
    reachable: true,
    movementType: MovementType.Walk,
  }));

  return (
    <>
      <Head>
        <title>Game Session - MekStation</title>
      </Head>
      <div className="h-screen overflow-hidden" data-testid="game-session">
        <GameplayLayout
          session={session}
          selectedUnitId={ui.selectedUnitId}
          onUnitSelect={handleTokenClick}
          onAction={handleInteractiveAction}
          onHexClick={handleHexClick}
          canUndo={false}
          isPlayerTurn={isPlayerTurn}
          unitWeapons={unitWeapons}
          maxArmor={maxArmor}
          maxStructure={maxStructure}
          pilotNames={pilotNames}
          heatSinks={heatSinks}
          interactivePhase={isInteractive ? interactivePhase : undefined}
          hitChance={hitChance}
          validTargetIds={validTargetIds}
          movementRange={movementRangeHexes}
        />
      </div>
    </>
  );
}
