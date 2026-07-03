import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import {
  Facing,
  GamePhase,
  GameSide,
  IGameSession,
  IGameplayUIState,
  MovementType,
  type IAttackIntentState,
  type MovementEnhancementActivationKind,
} from '@/types/gameplay';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import {
  advancePhase,
  appendEvent,
  attemptStandUp,
  activateMovementEnhancement,
  canAdvancePhase,
  declareMovement,
  endGame,
  goProne,
  lockMovement,
  requestSpot,
  replayToSequence,
  rollInitiative,
  torsoTwist,
} from '@/utils/gameplay/gameSession';
import { isSupportedPhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';
import { logger } from '@/utils/logger';

// Benign module cycle (same shape as useGameplayStore.helpers): the
// attackIntent module never touches this file during module evaluation.
import { focusTargetReducer } from './useGameplayStore.attackIntent';
import { usePhysicalAttackPlanStore } from './useGameplayStore.physicalAttackPlan';

export interface IGameplayActionPayload {
  readonly direction?: 'left' | 'right';
  readonly secondaryFacing?: Facing;
  readonly unitId?: string;
  readonly targetUnitId?: string;
  readonly attackType?: PhysicalAttackType;
  readonly limb?: PhysicalAttackLimb;
}

interface GameplayActionContext {
  readonly actionId: string;
  readonly session: IGameSession;
  readonly ui: IGameplayUIState;
  readonly set: SetGameplayActionState;
  readonly interactiveSession?: InteractiveSession | null;
  readonly payload?: IGameplayActionPayload;
  readonly phase: GamePhase;
  readonly selectedUnitId: string | null;
  readonly selectedUnit:
    | IGameSession['currentState']['units'][string]
    | undefined;
}

interface GameplayActionState {
  session: IGameSession | null;
  ui: IGameplayUIState;
  attackIntent: IAttackIntentState;
}

type SetGameplayActionState = {
  (partial: Partial<GameplayActionState>): void;
  (fn: (state: GameplayActionState) => Partial<GameplayActionState>): void;
};

type GameplayActionHandler = (context: GameplayActionContext) => void;

const GAMEPLAY_ACTION_HANDLERS: Readonly<
  Record<string, GameplayActionHandler>
> = {
  eject: handleEjectAction,
  stand: handleStandAction,
  'go-prone': handleGoProneAction,
  'activate-masc': handleActivateMovementEnhancementAction,
  'activate-supercharger': handleActivateMovementEnhancementAction,
  'facing-right': handleFacingAction,
  'facing-left': handleFacingAction,
  'torso-twist': handleTorsoTwistAction,
  'request-spot': handleRequestSpotAction,
  continue: handleContinueAction,
  lock: handleLockAction,
  undo: handleUndoAction,
  skip: handleSkipAction,
  clear: handleClearAction,
  'next-turn': handleNextTurnAction,
  concede: handleConcedeAction,
  'physical-attack': handlePhysicalAttackAction,
  'vibro-claw-attack': handleVibroClawAttackAction,
  'composer-focus-target': handleComposerFocusTargetAction,
};

/**
 * Single Attack Authority routing (attack-phase-intent-composer, D9):
 * the dock/menu declare command commits this action while the composer
 * is active — the result is a composer WORKING-TARGET focus, never a
 * declaration (spec scenario `Context menu routes into the composer`).
 */
function handleComposerFocusTargetAction(context: GameplayActionContext): void {
  const targetUnitId = context.payload?.targetUnitId;
  if (!targetUnitId) return;
  context.set((state) => ({
    attackIntent: focusTargetReducer(state.attackIntent, targetUnitId),
  }));
}

export function handleActionLogic(
  actionId: string,
  session: IGameSession | null,
  ui: IGameplayUIState,
  set: SetGameplayActionState,
  interactiveSession?: InteractiveSession | null,
  payload?: IGameplayActionPayload,
): void {
  if (!session) return;

  const selectedUnitId = payload?.unitId ?? ui.selectedUnitId;
  const handler = GAMEPLAY_ACTION_HANDLERS[actionId];
  if (!handler) {
    logger.warn('Unknown action:', actionId);
    return;
  }

  handler({
    actionId,
    session,
    ui,
    set,
    interactiveSession,
    payload,
    phase: session.currentState.phase,
    selectedUnitId,
    selectedUnit: selectedUnitId
      ? session.currentState.units[selectedUnitId]
      : undefined,
  });
}

function handleEjectAction(context: GameplayActionContext): void {
  const { session, selectedUnitId, interactiveSession } = context;
  if (!selectedUnitId) return;

  if (interactiveSession) {
    interactiveSession.ejectUnit(selectedUnitId);
    clearSelectedUnit(context, interactiveSession.getSession());
    return;
  }

  clearSelectedUnit(
    context,
    appendEvent(
      session,
      createUnitEjectedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        session.currentState.phase,
        selectedUnitId,
        'player_declared',
      ),
    ),
  );
}

function handleStandAction(context: GameplayActionContext): void {
  const { session, selectedUnitId, interactiveSession } = context;
  if (!selectedUnitId) return;

  if (interactiveSession) {
    interactiveSession.attemptStandUp(selectedUnitId);
    clearSelectedUnit(context, interactiveSession.getSession());
    return;
  }

  clearSelectedUnit(context, attemptStandUp(session, selectedUnitId));
}

function handleGoProneAction(context: GameplayActionContext): void {
  const { session, selectedUnitId, interactiveSession } = context;
  if (!selectedUnitId) return;

  if (interactiveSession) {
    interactiveSession.goProne(selectedUnitId);
    clearSelectedUnit(context, interactiveSession.getSession());
    return;
  }

  clearSelectedUnit(context, goProne(session, selectedUnitId));
}

function handleActivateMovementEnhancementAction(
  context: GameplayActionContext,
): void {
  const { session, selectedUnitId, interactiveSession } = context;
  if (!selectedUnitId) return;

  const enhancement: MovementEnhancementActivationKind =
    context.actionId === 'activate-masc' ? 'MASC' : 'Supercharger';
  if (interactiveSession) {
    interactiveSession.activateMovementEnhancement(selectedUnitId, enhancement);
    setSessionFromInteractive(context);
    return;
  }

  context.set({
    session: activateMovementEnhancement(session, selectedUnitId, enhancement),
  });
}

function handleFacingAction(context: GameplayActionContext): void {
  const { session, selectedUnitId, selectedUnit, interactiveSession } = context;
  if (!selectedUnitId || !selectedUnit) return;

  const facing = rotateFacing(
    selectedUnit.facing,
    context.actionId === 'facing-right' ? 1 : -1,
  );
  if (interactiveSession) {
    interactiveSession.applyMovement(
      selectedUnitId,
      selectedUnit.position,
      facing,
      MovementType.Walk,
      [selectedUnit.position],
    );
    setSessionFromInteractive(context);
    return;
  }

  const moved = declareMovement(
    session,
    selectedUnitId,
    selectedUnit.position,
    selectedUnit.position,
    facing,
    MovementType.Walk,
    1,
    1,
    [selectedUnit.position],
  );
  context.set({ session: lockMovement(moved, selectedUnitId) });
}

function handleTorsoTwistAction(context: GameplayActionContext): void {
  const { session, selectedUnitId, selectedUnit, interactiveSession, payload } =
    context;
  if (!selectedUnitId || !selectedUnit) return;

  const secondaryFacing =
    payload?.secondaryFacing ??
    rotateFacing(selectedUnit.facing, payload?.direction === 'right' ? -1 : 1);
  if (interactiveSession) {
    interactiveSession.torsoTwist(selectedUnitId, secondaryFacing);
    setSessionFromInteractive(context);
    return;
  }

  context.set({
    session: torsoTwist(session, selectedUnitId, secondaryFacing),
  });
}

function handleRequestSpotAction(context: GameplayActionContext): void {
  const { session, ui, phase, selectedUnitId, payload, interactiveSession } =
    context;
  if (phase !== GamePhase.WeaponAttack) return;

  const unitId = selectedUnitId;
  const targetId = payload?.targetUnitId ?? ui.targetUnitId;
  if (!unitId || !targetId || !canRequestSpot(session, unitId, targetId)) {
    return;
  }

  if (interactiveSession) {
    interactiveSession.requestSpot(unitId, targetId);
    clearSelectedUnit(context, interactiveSession.getSession());
    return;
  }

  clearSelectedUnit(context, requestSpot(session, unitId, targetId));
}

function handlePhysicalAttackAction(context: GameplayActionContext): void {
  const { phase, payload, selectedUnitId, ui } = context;
  if (phase !== GamePhase.PhysicalAttack || !selectedUnitId) return;
  if (!isSupportedPhysicalAttackType(payload?.attackType)) return;

  const targetUnitId = payload?.targetUnitId ?? ui.targetUnitId;
  if (!targetUnitId) return;

  usePhysicalAttackPlanStore
    .getState()
    .stagePhysicalAttackCommand(
      targetUnitId,
      payload.attackType,
      payload.limb ?? null,
    );
  context.set((state) => ({
    ui: { ...state.ui, targetUnitId },
  }));
}

/**
 * Per `wire-vibroclaw-attack-dispatch`: route the dock's Vibro-Claw command
 * into the interactive session's declaration path. Legality (squad
 * attacker, claws, adjacency, supported target) lives in the engine
 * dispatch — this handler only supplies the ids and adopts the resulting
 * session. Rejections log the typed reason; no state changes on reject.
 */
function handleVibroClawAttackAction(context: GameplayActionContext): void {
  const { phase, payload, selectedUnitId, ui, interactiveSession } = context;
  if (phase !== GamePhase.PhysicalAttack || !selectedUnitId) return;
  if (!interactiveSession) return;

  const targetUnitId = payload?.targetUnitId ?? ui.targetUnitId;
  if (!targetUnitId) return;

  const result = interactiveSession.declareVibroClawAttack(
    selectedUnitId,
    targetUnitId,
  );
  if (!result.ok) {
    logger.warn('Vibro-claw attack rejected:', result.reason);
    return;
  }
  setSessionFromInteractive(context);
}

function handleContinueAction(context: GameplayActionContext): void {
  const { session, phase, interactiveSession } = context;
  if (phase !== GamePhase.Heat || !canAdvancePhase(session)) return;

  if (interactiveSession) {
    interactiveSession.advancePhase();
    setSessionFromInteractive(context);
    return;
  }

  context.set({ session: advancePhase(session) });
}

function handleLockAction(context: GameplayActionContext): void {
  const { session, ui, phase } = context;
  const unitId = ui.selectedUnitId;
  if (!unitId || phase !== GamePhase.Movement) return;

  context.set({ session: lockMovement(session, unitId) });
}

function handleUndoAction(context: GameplayActionContext): void {
  const { session } = context;
  if (session.events.length <= 1) return;

  const previousSequence = session.events.length - 2;
  context.set({
    session: {
      ...session,
      events: session.events.slice(0, -1),
      currentState: replayToSequence(session, previousSequence),
      updatedAt: new Date().toISOString(),
    },
  });
}

function handleSkipAction(context: GameplayActionContext): void {
  const { session } = context;
  if (canAdvancePhase(session)) {
    context.set({ session: advancePhase(session) });
  }
}

function handleClearAction(context: GameplayActionContext): void {
  context.set((state) => ({
    ui: { ...state.ui, queuedWeaponIds: [] },
  }));
}

function handleNextTurnAction(context: GameplayActionContext): void {
  const { session, phase } = context;
  if (phase !== GamePhase.End && phase !== GamePhase.Initiative) return;

  const advancedSession =
    phase === GamePhase.End ? advancePhase(session) : session;
  const updatedSession = advancePhase(rollInitiative(advancedSession));
  context.set({ session: updatedSession });
}

function handleConcedeAction(context: GameplayActionContext): void {
  context.set({
    session: endGame(context.session, GameSide.Opponent, 'concede'),
  });
}

function clearSelectedUnit(
  context: GameplayActionContext,
  updatedSession: IGameSession,
): void {
  context.set((state) => ({
    session: updatedSession,
    ui: {
      ...state.ui,
      selectedUnitId: null,
      targetUnitId: null,
      queuedWeaponIds: [],
    },
  }));
}

function setSessionFromInteractive(context: GameplayActionContext): void {
  if (!context.interactiveSession) return;
  context.set({ session: context.interactiveSession.getSession() });
}

function rotateFacing(facing: Facing, delta: 1 | -1): Facing {
  const next = (facing + delta + 6) % 6;
  return next as Facing;
}

function canRequestSpot(
  session: IGameSession,
  unitId: string,
  targetId: string,
): boolean {
  const unit = session.currentState.units[unitId];
  const target = session.currentState.units[targetId];
  if (!unit || !target) return false;

  return (
    !unit.destroyed &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    !unit.shutdown &&
    unit.pilotConscious &&
    !unit.sprintedThisTurn &&
    !unit.isEvading &&
    !unit.isSpotting &&
    !target.destroyed &&
    !target.hasRetreated &&
    !target.hasEjected &&
    unit.side !== target.side
  );
}
