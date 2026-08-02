/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 * @spec openspec/changes/add-movement-phase-ui/specs/tactical-map-interface/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { GameplayLayout } from '@/components/gameplay/GameplayLayout';
import { useGameSessionLifecycle } from '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle';
import { useGameMovementPlanning } from '@/components/gameplay/pages/gameSession/GameSessionPage.movement';
import { GameSessionPlanningPanel } from '@/components/gameplay/pages/gameSession/GameSessionPage.planningPanel';
import { gameSessionRouteContext } from '@/components/gameplay/pages/gameSession/GameSessionPage.route';
import {
  shouldBlockForSpectatorRecovery,
  useRecoverSpectatorMode,
} from '@/components/gameplay/pages/gameSession/GameSessionPage.spectator';
import {
  GameError,
  GameLoading,
} from '@/components/gameplay/pages/GameSessionPage.states';
import { SpectatorView } from '@/components/gameplay/SpectatorView';
import { usePhaseQueueProjection } from '@/hooks/gameplay';
import {
  completedInteractiveElement,
  completedSessionElement,
  shouldShowPlanningPanel,
  useGameSessionCallbacks,
  usePhysicalAttackIntentState,
  useSelectedPlanningWeapons,
} from '@/pages-modules/gameplay/games/gameSessionPage.helpers';
import {
  resolveGameSessionShellMode,
  useGmTacticalInterventionSurface,
} from '@/pages-modules/gameplay/games/gmTacticalInterventionSurface';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { GamePhase, GameSide, GameStatus } from '@/types/gameplay';

function useGameplayBindings() {
  return {
    session: useGameplaySelector((state) => state.session),
    isLoading: useGameplaySelector((state) => state.isLoading),
    error: useGameplaySelector((state) => state.error),
    loadSession: useGameplaySelector((state) => state.loadSession),
    setSession: useGameplaySelector((state) => state.setSession),
    createDemoSession: useGameplaySelector((state) => state.createDemoSession),
    ui: useGameplaySelector((state) => state.ui),
    selectUnit: useGameplaySelector((state) => state.selectUnit),
    handleAction: useGameplaySelector((state) => state.handleAction),
    unitWeapons: useGameplaySelector((state) => state.unitWeapons),
    maxArmor: useGameplaySelector((state) => state.maxArmor),
    maxStructure: useGameplaySelector((state) => state.maxStructure),
    pilotNames: useGameplaySelector((state) => state.pilotNames),
    heatSinks: useGameplaySelector((state) => state.heatSinks),
    unitSpas: useGameplaySelector((state) => state.unitSpas),
    clearError: useGameplaySelector((state) => state.clearError),
    interactiveSession: useGameplaySelector(
      (state) => state.interactiveSession,
    ),
    interactivePhase: useGameplaySelector((state) => state.interactivePhase),
    spectatorMode: useGameplaySelector((state) => state.spectatorMode),
    validTargetIds: useGameplaySelector((state) => state.validTargetIds),
    hitChance: useGameplaySelector((state) => state.hitChance),
    handleInteractiveHexClick: useGameplaySelector(
      (state) => state.handleInteractiveHexClick,
    ),
    handleInteractiveTokenClick: useGameplaySelector(
      (state) => state.handleInteractiveTokenClick,
    ),
    advanceInteractivePhase: useGameplaySelector(
      (state) => state.advanceInteractivePhase,
    ),
    fireWeapons: useGameplaySelector((state) => state.fireWeapons),
    runAITurn: useGameplaySelector((state) => state.runAITurn),
    skipPhase: useGameplaySelector((state) => state.skipPhase),
    checkGameOver: useGameplaySelector((state) => state.checkGameOver),
    standActiveUnit: useGameplaySelector((state) => state.standActiveUnit),
    enterHullDownActiveUnit: useGameplaySelector(
      (state) => state.enterHullDownActiveUnit,
    ),
    goProneActiveUnit: useGameplaySelector((state) => state.goProneActiveUnit),
    applyRuntimeMovementState: useGameplaySelector(
      (state) => state.applyRuntimeMovementState,
    ),
    setPlannedMovement: useGameplaySelector(
      (state) => state.setPlannedMovement,
    ),
    setSpectatorMode: useGameplaySelector((state) => state.setSpectatorMode),
  };
}

type GameplayBindings = ReturnType<typeof useGameplayBindings>;

interface IGameSessionBlockingSurfaceProps {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly handleRetry: () => void;
  readonly session: GameplayBindings['session'];
  readonly interactivePhase: GameplayBindings['interactivePhase'];
  readonly interactiveSession: GameplayBindings['interactiveSession'];
  readonly spectatorMode: GameplayBindings['spectatorMode'];
  readonly isSpectatorRoute: boolean;
  readonly campaignId?: string;
  readonly missionId?: string;
}

function renderGameSessionBlockingSurface({
  campaignId,
  error,
  handleRetry,
  interactivePhase,
  interactiveSession,
  isSpectatorRoute,
  isLoading,
  missionId,
  session,
  spectatorMode,
}: IGameSessionBlockingSurfaceProps): React.ReactElement | null {
  if (isLoading) return <GameLoading />;
  if (error) return <GameError message={error} onRetry={handleRetry} />;
  if (!session) return <GameLoading />;
  if (
    shouldBlockForSpectatorRecovery(
      isSpectatorRoute,
      interactiveSession,
      Boolean(spectatorMode?.enabled),
    )
  ) {
    return <GameLoading />;
  }

  const completedSession = completedSessionElement(
    session,
    campaignId,
    missionId,
  );
  if (completedSession) return completedSession;

  const completedInteractive = completedInteractiveElement(
    session,
    interactivePhase,
    interactiveSession,
    spectatorMode,
    campaignId,
    missionId,
  );
  if (completedInteractive) return completedInteractive;

  return spectatorMode?.enabled && interactiveSession ? (
    <SpectatorView />
  ) : null;
}

export default function GameSessionPage(): React.ReactElement {
  const router = useRouter();
  const routeContext = gameSessionRouteContext(router);
  const bindings = useGameplayBindings();
  const {
    advanceInteractivePhase,
    applyRuntimeMovementState,
    checkGameOver,
    clearError,
    createDemoSession,
    enterHullDownActiveUnit,
    error,
    fireWeapons,
    goProneActiveUnit,
    handleAction,
    handleInteractiveHexClick,
    handleInteractiveTokenClick,
    heatSinks,
    hitChance,
    interactivePhase,
    interactiveSession,
    isLoading,
    loadSession,
    maxArmor,
    maxStructure,
    pilotNames,
    runAITurn,
    selectUnit,
    session,
    setPlannedMovement,
    setSession,
    setSpectatorMode,
    skipPhase,
    spectatorMode,
    standActiveUnit,
    ui,
    unitSpas,
    unitWeapons,
    validTargetIds,
  } = bindings;

  const isCompletedForRedirect =
    session?.currentState.status === GameStatus.Completed;
  const isCampaignBound = Boolean(session?.config.contractId);
  useGameSessionLifecycle({
    router,
    routeId: routeContext.routeId,
    matchId: routeContext.matchId,
    session,
    interactiveSession,
    isSpectatorMode: Boolean(spectatorMode?.enabled),
    isCompletedForRedirect,
    isCampaignBound,
    loadSession,
    createDemoSession,
  });
  useRecoverSpectatorMode({
    isSpectatorRoute: routeContext.isSpectatorMode,
    interactiveSession,
    isSpectatorMode: Boolean(spectatorMode?.enabled),
    setSpectatorMode,
  });

  const isInteractive = Boolean(interactiveSession);
  const phase = session?.currentState.phase;
  const phaseQueueProjection = usePhaseQueueProjection();
  useEffect(() => {
    if (
      isInteractive &&
      phaseQueueProjection.activeUnitId &&
      phaseQueueProjection.activeSide === GameSide.Opponent &&
      (phase === GamePhase.Movement ||
        phase === GamePhase.WeaponAttack ||
        phase === GamePhase.PhysicalAttack)
    ) {
      runAITurn(phaseQueueProjection.activeUnitId);
    }
  }, [
    isInteractive,
    phase,
    phaseQueueProjection.activeSide,
    phaseQueueProjection.activeUnitId,
    runAITurn,
  ]);
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
      routeId: routeContext.routeId,
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
  const handleGameplayUnitSelect = (unitId: string | null): void => {
    if (phase !== GamePhase.PhysicalAttack) return handleTokenClick(unitId);
    if (
      unitId === null ||
      (unitId === phaseQueueProjection.activeUnitId &&
        phaseQueueProjection.activeSide === GameSide.Player)
    ) {
      selectUnit(unitId);
    }
  };
  const shellMode = resolveGameSessionShellMode(router.query);
  const gmIntervention = useGmTacticalInterventionSurface({
    enabled: shellMode === 'gm',
    session,
    interactiveSession,
    campaignId: routeContext.campaignId,
    setSession,
  });

  const blockingSurface = renderGameSessionBlockingSurface({
    campaignId: routeContext.campaignId,
    error,
    handleRetry,
    interactivePhase,
    interactiveSession,
    isSpectatorRoute: routeContext.isSpectatorMode,
    isLoading,
    missionId: routeContext.missionId,
    session,
    spectatorMode,
  });
  if (blockingSurface) return blockingSurface;

  if (!session) return <GameLoading />;

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
        className="flex h-full flex-col overflow-hidden"
        data-testid="game-session"
      >
        <div className="flex-1 overflow-hidden">
          <GameplayLayout
            session={session}
            selectedUnitId={ui.selectedUnitId}
            onUnitSelect={handleGameplayUnitSelect}
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
            intentComposer={{
              composerActive: movement.composerActive,
              composedLegs: movement.composedLegs,
              lastWaypointHex: movement.lastWaypointHex,
              onPopLastWaypoint: movement.handleWaypointBackspace,
              onFacingSelect: movement.handleFacingSelect,
            }}
            interactiveSession={interactiveSession ?? undefined}
            physicalAttackIntent={physicalAttackIntent}
            playerSide={GameSide.Player}
            shellMode={shellMode}
            gmIntervention={gmIntervention}
          />
        </div>
        {/*
         * The legacy planning panel is superseded by the Movement Intent
         * Composer while it is active (Single Movement Authority — the
         * composer's ledger/resolver carry the mode + MP + heat readouts the
         * panel duplicated, and its step pad would be a second movement
         * surface). Non-movement phases (weapons/physical planning) keep it.
         */}
        <GameSessionPlanningPanel
          movement={movement}
          onPhysicalAttackIntentChange={setPhysicalAttackIntent}
          selectedPlanningWeapons={selectedPlanningWeapons}
          selectedUnitId={ui.selectedUnitId}
          showPlanningPanel={showPlanningPanel}
        />
      </div>
    </>
  );
}
