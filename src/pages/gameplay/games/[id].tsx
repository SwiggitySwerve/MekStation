/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 * Includes replay functionality for completed games.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';

import { GameplayLayout, SpectatorView } from '@/components/gameplay';
import {
  CompletedGame,
  GameError,
  GameLoading,
} from '@/components/gameplay/pages/GameSessionPage.states';
import { useGameplayStore, InteractivePhase } from '@/stores/useGameplayStore';
import { GameSide, GameStatus, MovementType } from '@/types/gameplay';
import { logger } from '@/utils/logger';

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

  useEffect(() => {
    if (id === 'demo') {
      createDemoSession();
    } else if (typeof id === 'string') {
      void loadSession(id);
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
      void loadSession(id);
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
