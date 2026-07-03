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
  type IAttackIntentState,
} from '@/types/gameplay';
import { deriveValidWeaponTargetIds } from '@/utils/gameplay/combatTargetIds';

import { useAnimationQueue } from './useAnimationQueue';
// Benign module cycle: `useGameplayStore.attackIntent` imports the
// InteractivePhase enum from this file; both references resolve at call
// time (never during module evaluation), so ES live bindings keep this safe.
import { focusTargetReducer } from './useGameplayStore.attackIntent';
export {
  handleActionLogic,
  type IGameplayActionPayload,
} from './useGameplayStore.actionHandlers';

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
  attackIntent: IAttackIntentState;
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

  if (interactiveSession.getState().phase === GamePhase.PhysicalAttack) {
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

  advanceKnownInteractivePhase(interactiveSession);
  resetInteractiveSelection(interactiveSession, state, set);
}

function advanceKnownInteractivePhase(
  interactiveSession: InteractiveSession,
): void {
  const advanceablePhases: ReadonlySet<GamePhase> =
    ADVANCEABLE_INTERACTIVE_PHASES;
  if (advanceablePhases.has(interactiveSession.getState().phase)) {
    interactiveSession.advancePhase();
  }
}

const ADVANCEABLE_INTERACTIVE_PHASES: ReadonlySet<GamePhase> = new Set([
  GamePhase.Initiative,
  GamePhase.Movement,
  GamePhase.WeaponAttack,
  GamePhase.Heat,
  GamePhase.End,
]);

function resetInteractiveSelection(
  interactiveSession: InteractiveSession,
  state: GameplayHelperState,
  set: SetFn,
): void {
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
  const grid =
    typeof interactiveSession.getGrid === 'function'
      ? interactiveSession.getGrid()
      : null;
  if (!grid) {
    const selectedUnit = currentState.units[selectedUnitId];
    if (!selectedUnit) return [];
    return Object.entries(currentState.units)
      .filter(([, candidate]) => {
        return (
          candidate.side !== selectedUnit.side &&
          !candidate.destroyed &&
          !candidate.hasRetreated &&
          !candidate.hasEjected
        );
      })
      .map(([unitId]) => unitId);
  }

  return deriveValidWeaponTargetIds({
    currentState,
    selectedUnitId,
    tokens: buildCombatProjectionTokens(
      currentState,
      storeState.session,
      selectedUnitId,
    ),
    mapRadius: storeState.session?.config.mapRadius ?? grid.config.radius,
    grid,
    unitWeapons: storeState.unitWeapons,
  });
}

interface InteractiveTokenClickActions {
  selectUnitForMovement: (unitId: string) => void;
  selectAttackTarget: (unitId: string) => void;
}

export function handleInteractiveTokenClickLogic(
  unitId: string,
  interactivePhase: InteractivePhase,
  interactiveSession: InteractiveSession | null,
  get: GetFn,
  set: SetFn,
  actions: InteractiveTokenClickActions,
): void {
  if (!interactiveSession) return;

  const state = interactiveSession.getState();
  const unit = state.units[unitId];
  if (!unit || unit.destroyed) return;

  if (state.phase === GamePhase.Movement && unit.side === GameSide.Player) {
    actions.selectUnitForMovement(unitId);
    return;
  }

  if (state.phase === GamePhase.WeaponAttack) {
    handleWeaponAttackTokenClick({
      unitId,
      unitSide: unit.side,
      interactivePhase,
      interactiveSession,
      get,
      set,
      selectAttackTarget: actions.selectAttackTarget,
    });
    return;
  }

  if (
    unit.side === GameSide.Player &&
    interactivePhase === InteractivePhase.SelectUnit
  ) {
    actions.selectUnitForMovement(unitId);
  }
}

interface WeaponAttackTokenClickContext {
  readonly unitId: string;
  readonly unitSide: GameSide;
  readonly interactivePhase: InteractivePhase;
  readonly interactiveSession: InteractiveSession;
  readonly get: GetFn;
  readonly set: SetFn;
  readonly selectAttackTarget: (unitId: string) => void;
}

function handleWeaponAttackTokenClick(
  context: WeaponAttackTokenClickContext,
): void {
  if (
    context.unitSide === GameSide.Player &&
    context.interactivePhase === InteractivePhase.SelectUnit
  ) {
    selectWeaponAttacker(context);
    return;
  }

  if (
    context.unitSide === GameSide.Opponent &&
    context.interactivePhase === InteractivePhase.SelectTarget
  ) {
    selectWeaponTarget(context);
  }
}

function selectWeaponAttacker(context: WeaponAttackTokenClickContext): void {
  const targetIds = deriveSelectableWeaponTargetIds(
    context.interactiveSession,
    context.get(),
    context.unitId,
  );
  context.set((state) => ({
    ui: { ...state.ui, selectedUnitId: context.unitId },
    interactivePhase: InteractivePhase.SelectTarget,
    validTargetIds: targetIds,
  }));
}

function selectWeaponTarget(context: WeaponAttackTokenClickContext): void {
  // Target-first map interaction (attack-phase-intent-composer, D6): an
  // enemy click focuses the composer's working target so weapon toggles
  // assign against it. Never declares anything itself — the legacy
  // attackPlan update below is the transitional single-target mirror.
  context.set((state) => ({
    attackIntent: focusTargetReducer(state.attackIntent, context.unitId),
  }));

  const storeState = context.get();
  const targetIds =
    storeState.validTargetIds.length > 0
      ? storeState.validTargetIds
      : deriveSelectableWeaponTargetIds(context.interactiveSession, storeState);
  if (!targetIds.includes(context.unitId)) return;

  context.selectAttackTarget(context.unitId);
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
  resetInteractiveSelection(interactiveSession, get(), set);
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
