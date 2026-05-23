import type { InteractiveSession } from '@/engine/GameEngine';

import { getPrefersReducedMotion } from '@/hooks/useReducedMotion';
import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import {
  IGameSession,
  IGameplayUIState,
  IUnitToken,
  IWeaponStatus,
  GamePhase,
  GameSide,
} from '@/types/gameplay';
import { deriveValidWeaponTargetIds } from '@/utils/gameplay/combatTargetIds';
import {
  lockMovement,
  advancePhase,
  canAdvancePhase,
  rollInitiative,
  endGame,
  replayToSequence,
} from '@/utils/gameplay/gameSession';
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
  unitWeapons: Record<string, readonly IWeaponStatus[]>;
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

let pendingPhaseAdvance = false;

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

function buildCombatProjectionTokens(
  state: ReturnType<InteractiveSession['getState']>,
  session: IGameSession | null,
  selectedUnitId: string,
): readonly IUnitToken[] {
  const unitInfoById = new Map(
    (session?.units ?? []).map((unit) => [
      unit.id,
      { name: unit.name, side: unit.side },
    ]),
  );

  return Object.entries(state.units).map(([unitId, unitState]) => {
    const unitInfo = unitInfoById.get(unitId) ?? {
      name: unitId,
      side: unitState.side,
    };
    return unitStateToToken(unitId, unitState, unitInfo, {
      isSelected: unitId === selectedUnitId,
      isValidTarget: false,
      isActiveTarget: false,
    });
  });
}

function deriveSelectableWeaponTargetIds(
  interactiveSession: InteractiveSession,
  storeState: GameplayHelperState,
  selectedUnitIdOverride?: string,
): readonly string[] {
  const selectedUnitId = selectedUnitIdOverride ?? storeState.ui.selectedUnitId;
  if (!selectedUnitId) return [];

  const currentState = interactiveSession.getState();
  return deriveValidWeaponTargetIds({
    currentState,
    selectedUnitId,
    tokens: buildCombatProjectionTokens(
      currentState,
      storeState.session,
      selectedUnitId,
    ),
    mapRadius:
      storeState.session?.config.mapRadius ??
      interactiveSession.getGrid().config.radius,
    grid: interactiveSession.getGrid(),
    unitWeapons: storeState.unitWeapons,
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
      const targetIds = deriveSelectableWeaponTargetIds(
        interactiveSession,
        get(),
        unitId,
      );
      set((s) => {
        return {
          ui: { ...s.ui, selectedUnitId: unitId },
          interactivePhase: InteractivePhase.SelectTarget,
          validTargetIds: targetIds,
        };
      });
    } else if (
      unit.side === GameSide.Opponent &&
      interactivePhase === InteractivePhase.SelectTarget
    ) {
      const targetIds =
        get().validTargetIds.length > 0
          ? get().validTargetIds
          : deriveSelectableWeaponTargetIds(interactiveSession, get());
      if (!targetIds.includes(unitId)) return;
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
