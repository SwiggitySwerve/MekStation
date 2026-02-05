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

import { GameplayLayout } from '@/components/gameplay';
import { Button } from '@/components/ui';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide, GameStatus } from '@/types/gameplay';

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
}

function CompletedGame({
  gameId,
  winner,
  reason,
}: CompletedGameProps): React.ReactElement {
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

        <div className="flex items-center justify-center gap-4">
          <Link href={`/gameplay/games/${gameId}/replay`}>
            <Button
              variant="primary"
              size="lg"
              data-testid="replay-game-btn"
              leftIcon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
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

        <div className="mt-8 border-t border-gray-700 pt-8">
          <Link
            href={`/audit/timeline?gameId=${gameId}`}
            className="flex items-center justify-center gap-2 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
  const { id } = router.query;

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
  } = useGameplayStore();

  // Load session on mount
  useEffect(() => {
    if (id === 'demo') {
      createDemoSession();
    } else if (typeof id === 'string') {
      loadSession(id);
    }
  }, [id, loadSession, createDemoSession]);

  // Handle hex click
  const handleHexClick = useCallback((hex: { q: number; r: number }) => {
    console.log('Hex clicked:', hex);
    // TODO: Handle movement/targeting based on current phase
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    clearError();
    if (typeof id === 'string') {
      loadSession(id);
    }
  }, [id, loadSession, clearError]);

  // Loading state
  if (isLoading) {
    return <GameLoading />;
  }

  // Error state
  if (error) {
    return <GameError message={error} onRetry={handleRetry} />;
  }

  // No session
  if (!session) {
    return <GameLoading />;
  }

  // Completed game - show results and replay option
  if (
    session.currentState.status === GameStatus.Completed &&
    session.currentState.result
  ) {
    return (
      <>
        <CompletedGame
          gameId={session.id}
          winner={session.currentState.result.winner}
          reason={session.currentState.result.reason}
        />
      </>
    );
  }

  // Determine if it's player's turn
  const isPlayerTurn = session.currentState.firstMover === GameSide.Player;

  return (
    <>
      <Head>
        <title>Game Session - MekStation</title>
      </Head>
      <div className="h-screen overflow-hidden" data-testid="game-session">
        <GameplayLayout
          session={session}
          selectedUnitId={ui.selectedUnitId}
          onUnitSelect={selectUnit}
          onAction={handleAction}
          onHexClick={handleHexClick}
          canUndo={false}
          isPlayerTurn={isPlayerTurn}
          unitWeapons={unitWeapons}
          maxArmor={maxArmor}
          maxStructure={maxStructure}
          pilotNames={pilotNames}
          heatSinks={heatSinks}
        />
      </div>
    </>
  );
}
