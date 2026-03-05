import type { InteractiveSession } from '@/engine/GameEngine';

import {
  IGameSession,
  IGameplayUIState,
  GamePhase,
  GameSide,
} from '@/types/gameplay';
import {
  lockMovement,
  advancePhase,
  canAdvancePhase,
  rollInitiative,
  endGame,
  replayToSequence,
} from '@/utils/gameplay/gameSession';
import { logger } from '@/utils/logger';

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

export function handleActionLogic(
  actionId: string,
  session: IGameSession | null,
  ui: IGameplayUIState,
  set: SetFn,
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
  if (!unit || unit.destroyed) return;

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
            .filter(([, u]) => u.side === GameSide.Opponent && !u.destroyed)
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
