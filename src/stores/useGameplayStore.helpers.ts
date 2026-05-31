import type { InteractiveSession } from '@/engine/GameEngine';

import { getPrefersReducedMotion } from '@/hooks/useReducedMotion';
import {
  GamePhase,
  GameSide,
  Facing,
  LockState,
  MovementType,
  type IGameSession,
  type IGameplayUIState,
  type MovementEnhancementActivationKind,
} from '@/types/gameplay';
import {
  getTwistedFacing,
  type TorsoTwistDirection,
} from '@/utils/gameplay/firingArc';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import {
  lockMovement,
  activateMovementEnhancement,
  declareMovement,
  torsoTwist,
  requestSpot,
  goProne,
  attemptStandUp,
  advancePhase,
  appendEvent,
  canAdvancePhase,
  rollInitiative,
  endGame,
  replayToSequence,
} from '@/utils/gameplay/gameSession';
import {
  rotateFacingClockwise,
  rotateFacingCounterClockwise,
} from '@/utils/gameplay/unitPosition';
import { logger } from '@/utils/logger';

import { useAnimationQueue } from './useAnimationQueue';

export enum InteractivePhase {
  None = 'none',
  SelectUnit = 'select_unit',
  SelectMovement = 'select_movement',
  SelectTarget = 'select_target',
  SelectWeapons = 'select_weapons',
  AITurn = 'ai_turn',
  GameOver = 'game_over',
}

/**
 * Minimal state shape used by gameplay helper functions.
 * Covers only the properties accessed by the helpers.
 */
interface GameplayHelperState {
  session: IGameSession | null;
  ui: IGameplayUIState;
  interactivePhase: InteractivePhase;
  validMovementHexes: readonly { q: number; r: number }[];
  validTargetIds: readonly string[];
  hitChance: number | null;
}

/**
 * Zustand set function type for gameplay helpers.
 * Supports both partial updates and updater functions.
 */
type SetFn = {
  (partial: Partial<GameplayHelperState>): void;
  (fn: (state: GameplayHelperState) => Partial<GameplayHelperState>): void;
};

/**
 * Zustand get function type for gameplay helpers.
 */
type GetFn = () => GameplayHelperState;
type ActionPayload = Readonly<Record<string, unknown>> | undefined;

let pendingPhaseAdvance = false;

export function handleActionLogic(
  actionId: string,
  payload: ActionPayload,
  session: IGameSession | null,
  ui: IGameplayUIState,
  set: SetFn,
  interactiveSession?: InteractiveSession | null,
): void {
  if (!session) return;

  const { phase } = session.currentState;

  switch (actionId) {
    case 'lock': {
      const unitId = ui.selectedUnitId;
      if (!unitId) return;

      if (phase === GamePhase.Movement) {
        const updatedSession = lockMovement(session, unitId);
        set({ session: updatedSession });
      }
      break;
    }
    case 'undo': {
      if (session.events.length <= 1) return;
      const previousSequence = session.events.length - 2;
      const replayedState = replayToSequence(session, previousSequence);
      const updatedSession: IGameSession = {
        ...session,
        events: session.events.slice(0, -1),
        currentState: replayedState,
        updatedAt: new Date().toISOString(),
      };
      set({ session: updatedSession });
      break;
    }
    case 'skip': {
      if (canAdvancePhase(session)) {
        const updatedSession = advancePhase(session);
        set({ session: updatedSession });
      }
      break;
    }
    case 'continue': {
      if (phase !== GamePhase.Heat || !canAdvancePhase(session)) return;

      if (interactiveSession) {
        interactiveSession.advancePhase();
        set({ session: interactiveSession.getSession() });
        break;
      }

      const updatedSession = advancePhase(session);
      set({ session: updatedSession });
      break;
    }
    case 'stand': {
      const unitId = ui.selectedUnitId;
      if (!unitId || phase !== GamePhase.Movement) return;

      if (interactiveSession) {
        interactiveSession.attemptStandUp(unitId);
        set({
          session: interactiveSession.getSession(),
          ui: clearCombatSelection(ui),
        });
        break;
      }

      set({
        session: attemptStandUp(session, unitId),
        ui: clearCombatSelection(ui),
      });
      break;
    }
    case 'go-prone': {
      const unitId = ui.selectedUnitId;
      if (!unitId || phase !== GamePhase.Movement) return;

      const unit = session.currentState.units[unitId];
      if (
        !unit ||
        unit.destroyed ||
        unit.hasRetreated ||
        unit.hasEjected ||
        unit.prone
      ) {
        return;
      }

      if (interactiveSession) {
        interactiveSession.goProne(unitId);
        set({
          session: interactiveSession.getSession(),
          ui: clearCombatSelection(ui),
        });
        break;
      }

      set({
        session: goProne(session, unitId),
        ui: clearCombatSelection(ui),
      });
      break;
    }
    case 'activate-masc':
    case 'activate-supercharger': {
      const unitId = ui.selectedUnitId;
      if (!unitId || phase !== GamePhase.Movement) return;

      const enhancement: MovementEnhancementActivationKind =
        actionId === 'activate-masc' ? 'MASC' : 'Supercharger';
      const unit = session.currentState.units[unitId];
      if (
        !unit ||
        unit.destroyed ||
        unit.hasRetreated ||
        unit.hasEjected ||
        unit.lockState === LockState.Locked
      ) {
        return;
      }

      if (interactiveSession) {
        interactiveSession.activateMovementEnhancement(unitId, enhancement);
        set({ session: interactiveSession.getSession() });
        break;
      }

      set({
        session: activateMovementEnhancement(session, unitId, enhancement),
      });
      break;
    }
    case 'facing-left':
    case 'facing-right': {
      const unitId = ui.selectedUnitId;
      if (!unitId || phase !== GamePhase.Movement) return;

      const unit = session.currentState.units[unitId];
      if (!unit || unit.destroyed || unit.hasRetreated || unit.hasEjected) {
        return;
      }

      const facing =
        actionId === 'facing-left'
          ? rotateFacingCounterClockwise(unit.facing)
          : rotateFacingClockwise(unit.facing);

      if (interactiveSession) {
        interactiveSession.applyMovement(
          unitId,
          unit.position,
          facing,
          MovementType.Walk,
          [unit.position],
        );
        set({ session: interactiveSession.getSession() });
        break;
      }

      let updatedSession = declareMovement(
        session,
        unitId,
        unit.position,
        unit.position,
        facing,
        MovementType.Walk,
        1,
        1,
        [unit.position],
      );
      updatedSession = lockMovement(updatedSession, unitId);
      set({ session: updatedSession });
      break;
    }
    case 'torso-twist': {
      const unitId = ui.selectedUnitId;
      if (!unitId || phase !== GamePhase.WeaponAttack) return;

      const unit = session.currentState.units[unitId];
      if (
        !unit ||
        unit.destroyed ||
        unit.hasRetreated ||
        unit.hasEjected ||
        !unit.pilotConscious
      ) {
        return;
      }

      const secondaryFacing = resolveTorsoTwistSecondaryFacing(
        unit.facing,
        payload,
      );

      if (interactiveSession) {
        interactiveSession.torsoTwist(unitId, secondaryFacing);
        set({ session: interactiveSession.getSession() });
        break;
      }

      set({ session: torsoTwist(session, unitId, secondaryFacing) });
      break;
    }
    case 'request-spot': {
      if (phase !== GamePhase.WeaponAttack) return;

      const unitId = stringPayloadValue(payload, 'unitId') ?? ui.selectedUnitId;
      const targetId =
        stringPayloadValue(payload, 'targetUnitId') ??
        stringPayloadValue(payload, 'targetId') ??
        ui.targetUnitId;
      if (!unitId || !targetId) return;

      const unit = session.currentState.units[unitId];
      const target = session.currentState.units[targetId];
      if (
        !unit ||
        !target ||
        unit.destroyed ||
        unit.hasRetreated ||
        unit.hasEjected ||
        unit.shutdown ||
        !unit.pilotConscious ||
        unit.sprintedThisTurn ||
        unit.isEvading ||
        unit.isSpotting ||
        target.destroyed ||
        target.hasRetreated ||
        target.hasEjected ||
        unit.side === target.side
      ) {
        return;
      }

      if (interactiveSession) {
        interactiveSession.requestSpot(unitId, targetId);
        set({
          session: interactiveSession.getSession(),
          ui: clearCombatSelection(ui),
        });
        break;
      }

      set({
        session: requestSpot(session, unitId, targetId),
        ui: clearCombatSelection(ui),
      });
      break;
    }
    case 'clear':
      set((state) => {
        return {
          ui: { ...state.ui, queuedWeaponIds: [] },
        };
      });
    case 'next-turn': {
      if (phase === GamePhase.End || phase === GamePhase.Initiative) {
        let updatedSession = session;
        if (phase === GamePhase.End) {
          updatedSession = advancePhase(updatedSession);
        }
        updatedSession = rollInitiative(updatedSession);
        updatedSession = advancePhase(updatedSession);
        set({ session: updatedSession });
      }
      break;
    }
    case 'concede': {
      const updatedSession = endGame(session, GameSide.Opponent, 'concede');
      set({ session: updatedSession });
      break;
    }
    case 'eject': {
      const unitId = ui.selectedUnitId;
      if (!unitId) return;

      const unit = session.currentState.units[unitId];
      if (!unit || unit.destroyed || unit.hasRetreated || unit.hasEjected) {
        return;
      }

      if (interactiveSession) {
        interactiveSession.ejectUnit(unitId);
        set({
          session: interactiveSession.getSession(),
          ui: clearCombatSelection(ui),
        });
        break;
      }

      const ejectionEvent = createUnitEjectedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        unitId,
        'player_declared',
      );
      set({
        session: appendEvent(session, ejectionEvent),
        ui: clearCombatSelection(ui),
      });
      break;
    }
    default:
      logger.warn('Unknown action:', actionId);
  }
}

export function runAITurnLogic(
  interactiveSession: InteractiveSession | null,
  set: SetFn,
): void {
  if (!interactiveSession) return;

  set({ interactivePhase: InteractivePhase.AITurn });

  const state = interactiveSession.getState();

  if (state.phase === GamePhase.Movement) {
    interactiveSession.runAITurn(GameSide.Opponent);
    interactiveSession.advancePhase();
  }

  if (interactiveSession.getState().phase === GamePhase.WeaponAttack) {
    interactiveSession.runAITurn(GameSide.Opponent);
    interactiveSession.advancePhase();
  }

  if (interactiveSession.getState().phase === GamePhase.Heat) {
    interactiveSession.advancePhase();
  }

  if (interactiveSession.getState().phase === GamePhase.End) {
    interactiveSession.advancePhase();
  }

  const gameOver = interactiveSession.isGameOver();

  set({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
  });
}

export function advanceInteractivePhaseLogic(
  interactiveSession: InteractiveSession | null,
  get: GetFn,
  set: SetFn,
): void {
  const state = get();
  if (!interactiveSession || !state.session) return;

  if (shouldWaitForAnimations()) {
    waitForAnimationQueueDrain(() =>
      advanceInteractivePhaseLogic(interactiveSession, get, set),
    );
    return;
  }

  const { phase } = interactiveSession.getState();

  if (phase === GamePhase.Initiative) {
    interactiveSession.advancePhase();
  } else if (phase === GamePhase.Movement) {
    interactiveSession.advancePhase();
  } else if (phase === GamePhase.WeaponAttack) {
    interactiveSession.advancePhase();
  } else if (phase === GamePhase.Heat) {
    interactiveSession.advancePhase();
  } else if (phase === GamePhase.End) {
    interactiveSession.advancePhase();
  }

  const gameOver = interactiveSession.isGameOver();

  set({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    validMovementHexes: [],
    validTargetIds: [],
    hitChance: null,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  });
}

export function handleInteractiveTokenClickLogic(
  unitId: string,
  interactivePhase: InteractivePhase,
  interactiveSession: InteractiveSession | null,
  get: GetFn,
  set: SetFn,
  selectUnitForMovement: (unitId: string) => void,
  selectAttackTarget: (unitId: string) => void,
): void {
  if (!interactiveSession) return;

  const state = interactiveSession.getState();
  const unit = state.units[unitId];
  if (
    !unit ||
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    !unit.pilotConscious
  ) {
    return;
  }

  const { phase } = state;

  if (phase === GamePhase.Movement && unit.side === GameSide.Player) {
    selectUnitForMovement(unitId);
  } else if (phase === GamePhase.WeaponAttack) {
    if (
      unit.side === GameSide.Player &&
      interactivePhase === InteractivePhase.SelectUnit
    ) {
      set((s) => {
        return {
          ui: { ...s.ui, selectedUnitId: unitId },
          interactivePhase: InteractivePhase.SelectTarget,
          validTargetIds: Object.entries(state.units)
            .filter(
              ([, u]) =>
                u.side === GameSide.Opponent &&
                !u.destroyed &&
                !u.hasRetreated &&
                !u.hasEjected,
            )
            .map(([id]) => id),
        };
      });
    } else if (
      unit.side === GameSide.Opponent &&
      interactivePhase === InteractivePhase.SelectTarget
    ) {
      selectAttackTarget(unitId);
    }
  } else if (
    unit.side === GameSide.Player &&
    interactivePhase === InteractivePhase.SelectUnit
  ) {
    selectUnitForMovement(unitId);
  }
}

export function skipPhaseLogic(
  interactiveSession: InteractiveSession | null,
  get: GetFn,
  set: SetFn,
): void {
  if (!interactiveSession) return;

  if (shouldWaitForAnimations()) {
    waitForAnimationQueueDrain(() =>
      skipPhaseLogic(interactiveSession, get, set),
    );
    return;
  }

  interactiveSession.advancePhase();

  const gameOver = interactiveSession.isGameOver();

  const state = get();
  set({
    session: interactiveSession.getSession(),
    interactivePhase: gameOver
      ? InteractivePhase.GameOver
      : InteractivePhase.SelectUnit,
    validMovementHexes: [],
    validTargetIds: [],
    hitChance: null,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  });
}

function clearCombatSelection(ui: IGameplayUIState): IGameplayUIState {
  return {
    ...ui,
    selectedUnitId: null,
    targetUnitId: null,
    queuedWeaponIds: [],
  };
}

function resolveTorsoTwistSecondaryFacing(
  facing: Facing,
  payload: ActionPayload,
): Facing {
  if (typeof payload?.secondaryFacing === 'number') {
    return (((Math.trunc(payload.secondaryFacing) % 6) + 6) % 6) as Facing;
  }

  const direction: TorsoTwistDirection =
    payload?.direction === 'right' ? 'right' : 'left';
  return getTwistedFacing(facing, direction);
}

function stringPayloadValue(
  payload: ActionPayload,
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function shouldWaitForAnimations(): boolean {
  const isActive = useAnimationQueue.getState().isActive;
  if (!isActive || getPrefersReducedMotion()) {
    pendingPhaseAdvance = false;
    return false;
  }
  return true;
}

function waitForAnimationQueueDrain(callback: () => void): void {
  if (pendingPhaseAdvance) return;
  pendingPhaseAdvance = true;

  let unsubscribe: (() => void) | null = null;
  unsubscribe = useAnimationQueue.getState().onComplete(() => {
    if (useAnimationQueue.getState().isActive) return;

    pendingPhaseAdvance = false;
    unsubscribe?.();
    callback();
  });
}
