import type React from 'react';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PhysicalAttackIntent } from '@/components/gameplay/PhysicalAttackPanel';
import type { IGameplayActionPayload } from '@/stores/useGameplayStore.helpers';
import type { IGameSession, TacticalActionPayload } from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { buildMovementModeSeedPlanFromCommandPayload } from '@/components/gameplay/pages/gameSession/GameSessionPage.movementPlanning';
import { planningWeaponsForSelectedUnit } from '@/components/gameplay/pages/gameSession/GameSessionPage.weaponPlanning';
import { CompletedGame } from '@/components/gameplay/pages/GameSessionPage.states';
import { InteractivePhase } from '@/stores/useGameplayStore';
import { GamePhase, GameSide, GameStatus } from '@/types/gameplay';

type MovementSeedPlan = NonNullable<
  ReturnType<typeof buildMovementModeSeedPlanFromCommandPayload>
>;
type UnitWeaponsById = Parameters<
  typeof planningWeaponsForSelectedUnit
>[0]['unitWeapons'];

interface InteractiveActionDispatchContext {
  readonly actionId: string;
  readonly payload?: TacticalActionPayload;
  readonly storePayload?: IGameplayActionPayload;
  readonly phase?: GamePhase;
  readonly session: IGameSession | null;
  readonly selectedUnitId: string | null | undefined;
  readonly setPlannedMovement: (plan: MovementSeedPlan) => void;
  readonly skipPhase: () => void;
  readonly standActiveUnit: (mode?: 'careful') => void;
  readonly enterHullDownActiveUnit: () => void;
  readonly goProneActiveUnit: () => void;
  readonly applyRuntimeMovementState: (
    payload: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  ) => void;
  readonly runAITurn: () => void;
  readonly fireWeapons: () => void;
  readonly advanceInteractivePhase: () => void;
  readonly handleAction: (
    actionId: string,
    payload?: IGameplayActionPayload,
  ) => void;
}

const SIMPLE_INTERACTIVE_ACTIONS: Record<
  string,
  (context: InteractiveActionDispatchContext) => void
> = {
  skip: ({ skipPhase }) => skipPhase(),
  stand: ({ standActiveUnit }) => standActiveUnit(),
  'stand-careful': ({ standActiveUnit }) => standActiveUnit('careful'),
  'hull-down': ({ enterHullDownActiveUnit }) => enterHullDownActiveUnit(),
  'go-prone': ({ goProneActiveUnit }) => goProneActiveUnit(),
  'next-turn': ({ runAITurn }) => runAITurn(),
  fire: ({ fireWeapons }) => fireWeapons(),
  advance: ({ advanceInteractivePhase }) => advanceInteractivePhase(),
  concede: ({ actionId, storePayload, handleAction }) =>
    handleAction(actionId, storePayload),
};

interface InteractiveCompletionSession {
  getResult(): { winner?: string; reason?: string } | null;
  getState(): { units: IGameSession['currentState']['units'] };
}

interface GameSessionCallbacksOptions {
  readonly routeId: string | string[] | undefined;
  readonly isInteractive: boolean;
  readonly handleAction: (
    actionId: string,
    payload?: IGameplayActionPayload,
  ) => void;
  readonly phase: GamePhase | undefined;
  readonly session: IGameSession | null;
  readonly selectedUnitId: string | null | undefined;
  readonly selectUnit: (unitId: string | null) => void;
  readonly handleInteractiveTokenClick: (unitId: string) => void;
  readonly setPlannedMovement: (plan: MovementSeedPlan) => void;
  readonly skipPhase: () => void;
  readonly standActiveUnit: (mode?: 'careful') => void;
  readonly enterHullDownActiveUnit: () => void;
  readonly goProneActiveUnit: () => void;
  readonly applyRuntimeMovementState: (
    payload: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  ) => void;
  readonly runAITurn: () => void;
  readonly fireWeapons: () => void;
  readonly advanceInteractivePhase: () => void;
  readonly checkGameOver: () => void;
  readonly clearError: () => void;
  readonly loadSession: (id: string) => Promise<void> | void;
}

export function useSelectedPlanningWeapons(
  selectedUnitId: string | null | undefined,
  unitWeapons: UnitWeaponsById,
): ReturnType<typeof planningWeaponsForSelectedUnit> {
  return useMemo(
    () =>
      planningWeaponsForSelectedUnit({
        selectedUnitId: selectedUnitId ?? null,
        unitWeapons,
      }),
    [selectedUnitId, unitWeapons],
  );
}

export function usePhysicalAttackIntentState(
  phase: GamePhase | undefined,
  selectedUnitId: string | null | undefined,
): readonly [
  PhysicalAttackIntent | null,
  React.Dispatch<React.SetStateAction<PhysicalAttackIntent | null>>,
] {
  const [physicalAttackIntent, setPhysicalAttackIntent] =
    useState<PhysicalAttackIntent | null>(null);

  useEffect(() => {
    if (phase !== GamePhase.PhysicalAttack || !selectedUnitId) {
      setPhysicalAttackIntent(null);
    }
  }, [phase, selectedUnitId]);

  return [physicalAttackIntent, setPhysicalAttackIntent] as const;
}

export function useGameSessionCallbacks({
  routeId,
  isInteractive,
  handleAction,
  phase,
  session,
  selectedUnitId,
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
}: GameSessionCallbacksOptions): {
  readonly handleInteractiveAction: (
    actionId: string,
    payload?: TacticalActionPayload,
  ) => void;
  readonly handleRetry: () => void;
  readonly handleTokenClick: (unitId: string | null) => void;
} {
  const handleRetry = useCallback(() => {
    clearError();
    if (typeof routeId === 'string') {
      void loadSession(routeId);
    }
  }, [routeId, loadSession, clearError]);

  const handleTokenClick = useCallback(
    (unitId: string | null) => {
      selectGameplayToken(
        unitId,
        isInteractive,
        selectedUnitId,
        selectUnit,
        handleInteractiveTokenClick,
      );
    },
    [isInteractive, handleInteractiveTokenClick, selectUnit, selectedUnitId],
  );

  const handleInteractiveAction = useCallback(
    (actionId: string, payload?: TacticalActionPayload) => {
      const storePayload = payload as IGameplayActionPayload | undefined;
      if (!isInteractive) {
        handleAction(actionId, storePayload);
        return;
      }

      const handled = dispatchInteractiveAction({
        actionId,
        payload,
        storePayload,
        phase,
        session,
        selectedUnitId,
        setPlannedMovement,
        skipPhase,
        standActiveUnit,
        enterHullDownActiveUnit,
        goProneActiveUnit,
        applyRuntimeMovementState,
        runAITurn,
        fireWeapons,
        advanceInteractivePhase,
        handleAction,
      });

      if (!handled) {
        handleAction(actionId, storePayload);
      }

      checkGameOver();
    },
    [
      isInteractive,
      handleAction,
      phase,
      session,
      selectedUnitId,
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

  return { handleInteractiveAction, handleRetry, handleTokenClick };
}

export function completedSessionElement(
  session: IGameSession | null,
  campaignId?: string,
  missionId?: string,
): React.ReactElement | null {
  if (
    session?.currentState.status !== GameStatus.Completed ||
    !session.currentState.result
  ) {
    return null;
  }

  return (
    <CompletedGame
      gameId={session.id}
      winner={session.currentState.result.winner}
      reason={session.currentState.result.reason}
      campaignId={campaignId}
      missionId={missionId}
      unitStates={session.currentState.units}
    />
  );
}

export function completedInteractiveElement(
  session: IGameSession,
  interactivePhase: InteractivePhase | null,
  interactiveSession: InteractiveCompletionSession | null,
  spectatorMode: unknown,
  campaignId?: string,
  missionId?: string,
): React.ReactElement | null {
  if (
    interactivePhase !== InteractivePhase.GameOver ||
    !interactiveSession ||
    spectatorMode
  ) {
    return null;
  }

  const result = interactiveSession.getResult();
  return (
    <CompletedGame
      gameId={session.id}
      winner={interactiveWinner(result?.winner ?? 'draw')}
      reason={result?.reason ?? 'unknown'}
      campaignId={campaignId}
      missionId={missionId}
      unitStates={interactiveSession.getState().units}
    />
  );
}

export function shouldShowPlanningPanel({
  isInteractive,
  isPlayerControlled,
  phase,
}: {
  readonly isInteractive: boolean;
  readonly isPlayerControlled: boolean;
  readonly phase: GamePhase | undefined;
}): boolean {
  return (
    isInteractive &&
    isPlayerControlled &&
    (phase === GamePhase.Movement ||
      phase === GamePhase.WeaponAttack ||
      phase === GamePhase.PhysicalAttack)
  );
}

function dispatchLockAction(context: InteractiveActionDispatchContext): void {
  const selectedUnitState = context.selectedUnitId
    ? (context.session?.currentState.units[context.selectedUnitId] ?? null)
    : null;
  const movementModePlan = buildMovementModeSeedPlanFromCommandPayload({
    phase: context.phase,
    payload: context.payload,
    selectedUnitState,
  });

  if (movementModePlan) {
    context.setPlannedMovement(movementModePlan);
    return;
  }

  context.skipPhase();
}

function dispatchRuntimeMovementState(
  context: InteractiveActionDispatchContext,
): void {
  if (!context.payload) return;
  context.applyRuntimeMovementState(
    context.payload as Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  );
}

function dispatchInteractiveAction(
  context: InteractiveActionDispatchContext,
): boolean {
  if (context.actionId === 'lock') {
    dispatchLockAction(context);
    return true;
  }

  if (context.actionId === 'runtime-movement-state') {
    dispatchRuntimeMovementState(context);
    return true;
  }

  const actionHandler = SIMPLE_INTERACTIVE_ACTIONS[context.actionId];
  if (!actionHandler) return false;
  actionHandler(context);
  return true;
}

function selectGameplayToken(
  unitId: string | null,
  isInteractive: boolean,
  selectedUnitId: string | null | undefined,
  selectUnit: (unitId: string | null) => void,
  handleInteractiveTokenClick: (unitId: string) => void,
): void {
  if (!unitId) {
    selectUnit(null);
    return;
  }

  if (isInteractive) {
    handleInteractiveTokenClick(unitId);
    return;
  }

  selectUnit(unitId === selectedUnitId ? null : unitId);
}

function interactiveWinner(rawWinner: string): GameSide | 'draw' {
  if (rawWinner === 'player') return GameSide.Player;
  if (rawWinner === 'opponent') return GameSide.Opponent;
  return 'draw';
}
