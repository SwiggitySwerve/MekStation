/**
 * Game Session Page
 * Main gameplay interface for an active game session.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 * @spec openspec/changes/add-movement-phase-ui/specs/tactical-map-interface/spec.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PhysicalAttackIntent } from '@/components/gameplay';
import type { IGameplayActionPayload } from '@/stores/useGameplayStore.helpers';
import type { TacticalActionPayload } from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

import {
  CombatPlanningPanel,
  GameplayLayout,
  SpectatorView,
} from '@/components/gameplay';
import { useGameSessionLifecycle } from '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle';
import { useGameMovementPlanning } from '@/components/gameplay/pages/gameSession/GameSessionPage.movement';
import { buildMovementModeSeedPlanFromCommandPayload } from '@/components/gameplay/pages/gameSession/GameSessionPage.movementPlanning';
import { planningWeaponsForSelectedUnit } from '@/components/gameplay/pages/gameSession/GameSessionPage.weaponPlanning';
import {
  CompletedGame,
  GameError,
  GameLoading,
} from '@/components/gameplay/pages/GameSessionPage.states';
import {
  InteractivePhase,
  useGameplaySelector,
} from '@/stores/useGameplayStore';
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
  const isCampaignBound = !!session?.config.contractId;
  useGameSessionLifecycle({
    router,
    routeId: id,
    matchId: matchIdStr,
    session,
    isCompletedForRedirect,
    isCampaignBound,
    loadSession,
    createDemoSession,
  });

  const isInteractive = !!interactiveSession;
  const phase = session?.currentState.phase;
  const movement = useGameMovementPlanning({
    session,
    interactiveSession,
    selectedUnitId: ui.selectedUnitId,
    phase,
    handleInteractiveHexClick,
  });
  const selectedPlanningWeapons = useMemo(
    () =>
      planningWeaponsForSelectedUnit({
        selectedUnitId: ui.selectedUnitId,
        unitWeapons,
      }),
    [ui.selectedUnitId, unitWeapons],
  );
  const [physicalAttackIntent, setPhysicalAttackIntent] =
    useState<PhysicalAttackIntent | null>(null);

  useEffect(() => {
    if (phase !== GamePhase.PhysicalAttack || !ui.selectedUnitId) {
      setPhysicalAttackIntent(null);
    }
  }, [phase, ui.selectedUnitId]);

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
    (actionId: string, payload?: TacticalActionPayload) => {
      // Audit 2026-06-09 G (W5.1a): the structured TacticalActionPayload
      // must survive EVERY dispatch path — the non-interactive and
      // default branches used to drop it, so payload-carrying commands
      // (e.g. torso-twist with a direction) silently lost their data.
      // TacticalActionPayload is the wide Record contract; the store
      // reads only its known optional fields, so the narrowing cast is
      // the documented hand-off between the two payload vocabularies.
      const storePayload = payload as IGameplayActionPayload | undefined;
      if (!isInteractive) {
        handleAction(actionId, storePayload);
        return;
      }

      switch (actionId) {
        case 'lock': {
          const selectedUnitState = ui.selectedUnitId
            ? (session?.currentState.units[ui.selectedUnitId] ?? null)
            : null;
          const movementModePlan = buildMovementModeSeedPlanFromCommandPayload({
            phase,
            payload,
            selectedUnitState,
          });
          if (movementModePlan) {
            setPlannedMovement(movementModePlan);
            return;
          }
          skipPhase();
          break;
        }
        case 'skip':
          skipPhase();
          break;
        case 'stand':
          standActiveUnit();
          break;
        case 'stand-careful':
          standActiveUnit('careful');
          break;
        case 'hull-down':
          enterHullDownActiveUnit();
          break;
        case 'go-prone':
          goProneActiveUnit();
          break;
        case 'runtime-movement-state':
          if (payload) {
            applyRuntimeMovementState(
              payload as Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
            );
          }
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
          handleAction(actionId, storePayload);
          break;
        default:
          // Non-special-cased commands forward BOTH the action id AND
          // the structured payload to the store (W5.1a).
          handleAction(actionId, storePayload);
      }

      checkGameOver();
    },
    [
      isInteractive,
      handleAction,
      phase,
      session,
      ui.selectedUnitId,
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
    ],
  );

  if (isLoading) return <GameLoading />;
  if (error) return <GameError message={error} onRetry={handleRetry} />;
  if (!session) return <GameLoading />;

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

    return (
      <CompletedGame
        gameId={session.id}
        winner={winner}
        reason={result?.reason ?? 'unknown'}
        campaignId={campaignIdStr}
        missionId={missionIdStr}
        unitStates={interactiveSession.getState().units}
      />
    );
  }

  if (spectatorMode?.enabled && interactiveSession) {
    return <SpectatorView />;
  }

  const showPlanningPanel =
    isInteractive &&
    movement.isPlayerControlled &&
    (phase === GamePhase.Movement ||
      phase === GamePhase.WeaponAttack ||
      phase === GamePhase.PhysicalAttack);

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
