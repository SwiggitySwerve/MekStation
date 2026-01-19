/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GameplayLayout } from '@/components/gameplay';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameSide } from '@/types/gameplay';

// =============================================================================
// Loading Component
// =============================================================================

function GameLoading(): React.ReactElement {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Loading game session...</p>
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
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
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
        <h2 className="text-xl font-bold text-white mb-2">Failed to Load Game</h2>
        <p className="text-gray-400 mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
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

  // Determine if it's player's turn
  const isPlayerTurn = session.currentState.firstMover === GameSide.Player;

  return (
    <>
      <Head>
        <title>Game Session - MekStation</title>
      </Head>
      <div className="h-screen overflow-hidden">
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
