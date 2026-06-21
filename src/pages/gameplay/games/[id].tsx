/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 * @spec openspec/changes/add-movement-phase-ui/specs/tactical-map-interface/spec.md
 */

import type React from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';

import { CombatPlanningPanel } from '@/components/gameplay/CombatPlanningPanel';
import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import { useGameSessionLifecycle } from '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle';
import { useGameMovementPlanning } from '@/components/gameplay/pages/gameSession/GameSessionPage.movement';
import {
  GameError,
  GameLoading,
} from '@/components/gameplay/pages/GameSessionPage.states';
import { SpectatorView } from '@/components/gameplay/SpectatorView';
import {
  completedInteractiveElement,
  completedSessionElement,
  shouldShowPlanningPanel,
  useGameSessionCallbacks,
  usePhysicalAttackIntentState,
  useSelectedPlanningWeapons,
} from '@/pages-modules/gameplay/games/gameSessionPage.helpers';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { GamePhase, GameSide, GameStatus } from '@/types/gameplay';

export default function GameSessionPage(): React.ReactElement {
  const router = useRouter();
  const { id, campaignId, missionId } = router.query;
  const campaignIdStr = typeof campaignId === 'string' ? campaignId : undefined;
  const missionIdStr = typeof missionId === 'string' ? missionId : undefined;
  const matchIdStr = typeof id === 'string' && id !== 'demo' ? id : null;

  const session = useGameplaySelector((state) => state.session);
  const isLoading = useGameplaySelector((state) => state.isLoading);
  const error = useGameplaySelector((state) => state.error);
  const loadSession = useGameplaySelector((state) => state.loadSession);
  const createDemoSession = useGameplaySelector(
    (state) => state.createDemoSession,
  );
  const ui = useGameplaySelector((state) => state.ui);
  const selectUnit = useGameplaySelector((state) => state.selectUnit);
  const handleAction = useGameplaySelector((state) => state.handleAction);
  const unitWeapons = useGameplaySelector((state) => state.unitWeapons);
  const maxArmor = useGameplaySelector((state) => state.maxArmor);
  const maxStructure = useGameplaySelector((state) => state.maxStructure);
  const pilotNames = useGameplaySelector((state) => state.pilotNames);
  const heatSinks = useGameplaySelector((state) => state.heatSinks);
  const unitSpas = useGameplaySelector((state) => state.unitSpas);
  const clearError = useGameplaySelector((state) => state.clearError);
  const interactiveSession = useGameplaySelector(
    (state) => state.interactiveSession,
  );
  const interactivePhase = useGameplaySelector(
    (state) => state.interactivePhase,
  );
  const spectatorMode = useGameplaySelector((state) => state.spectatorMode);
  const validTargetIds = useGameplaySelector((state) => state.validTargetIds);
  const hitChance = useGameplaySelector((state) => state.hitChance);
  const handleInteractiveHexClick = useGameplaySelector(
    (state) => state.handleInteractiveHexClick,
  );
  const handleInteractiveTokenClick = useGameplaySelector(
    (state) => state.handleInteractiveTokenClick,
  );
  const advanceInteractivePhase = useGameplaySelector(
    (state) => state.advanceInteractivePhase,
  );
  const fireWeapons = useGameplaySelector((state) => state.fireWeapons);
  const runAITurn = useGameplaySelector((state) => state.runAITurn);
  const skipPhase = useGameplaySelector((state) => state.skipPhase);
  const checkGameOver = useGameplaySelector((state) => state.checkGameOver);
  const standActiveUnit = useGameplaySelector((state) => state.standActiveUnit);
  const enterHullDownActiveUnit = useGameplaySelector(
    (state) => state.enterHullDownActiveUnit,
  );
  const goProneActiveUnit = useGameplaySelector(
    (state) => state.goProneActiveUnit,
  );
  const applyRuntimeMovementState = useGameplaySelector(
    (state) => state.applyRuntimeMovementState,
  );
  const setPlannedMovement = useGameplaySelector(
    (state) => state.setPlannedMovement,
  );

  const isCompletedForRedirect =
    session?.currentState.status === GameStatus.Completed;
  const isCampaignBound = Boolean(session?.config.contractId);
  useGameSessionLifecycle({
    router,
    routeId: id,
    matchId: matchIdStr,
    session,
    interactiveSession,
    isSpectatorMode: Boolean(spectatorMode?.enabled),
    isCompletedForRedirect,
    isCampaignBound,
    loadSession,
    createDemoSession,
  });

  const isInteractive = Boolean(interactiveSession);
  const phase = session?.currentState.phase;
  const movement = useGameMovementPlanning({
    session,
    interactiveSession,
    selectedUnitId: ui.selectedUnitId,
    phase,
    handleInteractiveHexClick,
  });
  const selectedPlanningWeapons = useSelectedPlanningWeapons(
    ui.selectedUnitId,
    unitWeapons,
  );
  const [physicalAttackIntent, setPhysicalAttackIntent] =
    usePhysicalAttackIntentState(phase, ui.selectedUnitId);
  const { handleInteractiveAction, handleRetry, handleTokenClick } =
    useGameSessionCallbacks({
      routeId: id,
      isInteractive,
      handleAction,
      phase,
      session,
      selectedUnitId: ui.selectedUnitId,
      selectUnit,
      handleInteractiveTokenClick,
      setPlannedMovement,
      skipPhase,
      standActiveUnit,
      enterHullDownActiveUnit,
      goProneActiveUnit,
      applyRuntimeMovementState,
      runAITurn,
      fireWeapons,
      advanceInteractivePhase,
      checkGameOver,
      clearError,
      loadSession,
    });

  if (isLoading) return <GameLoading />;
  if (error) return <GameError message={error} onRetry={handleRetry} />;
  if (!session) return <GameLoading />;

  const completedSession = completedSessionElement(
    session,
    campaignIdStr,
    missionIdStr,
  );
  if (completedSession) return completedSession;

  const completedInteractive = completedInteractiveElement(
    session,
    interactivePhase,
    interactiveSession,
    spectatorMode,
    campaignIdStr,
    missionIdStr,
  );
  if (completedInteractive) return completedInteractive;

  if (spectatorMode?.enabled && interactiveSession) {
    return <SpectatorView />;
  }

  const showPlanningPanel = shouldShowPlanningPanel({
    isInteractive,
    isPlayerControlled: movement.isPlayerControlled,
    phase,
  });

  return (
    <>
      <Head>
        <title>Game Session - MekStation</title>
      </Head>
      <div
        className="flex h-screen flex-col overflow-hidden"
        data-testid="game-session"
      >
        <div className="flex-1 overflow-hidden">
          <GameplayLayout
            session={session}
            selectedUnitId={ui.selectedUnitId}
            onUnitSelect={handleTokenClick}
            onAction={handleInteractiveAction}
            onHexClick={movement.handleHexClick}
            onHexHover={movement.setHoveredHex}
            canUndo={false}
            isPlayerTurn={session.currentState.firstMover === GameSide.Player}
            unitWeapons={unitWeapons}
            maxArmor={maxArmor}
            maxStructure={maxStructure}
            pilotNames={pilotNames}
            heatSinks={heatSinks}
            unitSpas={unitSpas}
            interactivePhase={isInteractive ? interactivePhase : undefined}
            hitChance={hitChance}
            validTargetIds={validTargetIds}
            movementRange={movement.movementRangeHexes}
            hoveredHex={movement.hoveredHex}
            hoverMovementInfo={movement.hoveredMovementRangeHex}
            highlightPath={movement.hoveredPath}
            hoverMpCost={movement.hoverMpCost}
            hoverUnreachable={movement.hoverUnreachable}
            mpLegend={movement.mpLegend}
            onMovementModeSelect={movement.handleMovementModeSelect}
            interactiveSession={interactiveSession ?? undefined}
            physicalAttackIntent={physicalAttackIntent}
            playerSide={GameSide.Player}
          />
        </div>
        {showPlanningPanel && ui.selectedUnitId && (
          <CombatPlanningPanel
            walkMP={movement.effectiveMovementMps?.walkMP ?? 0}
            runMP={movement.effectiveMovementMps?.runMP ?? 0}
            jumpMP={movement.effectiveMovementMps?.jumpMP ?? 0}
            movementHeatProfile={movement.capability?.movementHeatProfile}
            weapons={selectedPlanningWeapons}
            onPhysicalAttackIntentChange={setPhysicalAttackIntent}
          />
        )}
      </div>
    </>
  );
}
