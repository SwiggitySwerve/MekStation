import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { getPrefersReducedMotion } from '@/hooks/useReducedMotion';
import {
  Facing,
  GameEventType,
  GamePhase,
  IGameSession,
  IHexCoordinate,
  IMovementDeclaredPayload,
  MovementAnimationMode,
  MovementType,
  type StandUpMode,
} from '@/types/gameplay';

import type {
  GetFn,
  IPlannedMovement,
  SetFn,
} from './useGameplayStore.combatFlowTypes';

import { useAnimationQueue } from './useAnimationQueue';
import { InteractivePhase } from './useGameplayStore.helpers';
import { allowIntentInPhase } from './useGameplayStore.phaseGuard';

export function setPlannedMovementLogic(
  plan: IPlannedMovement,
  set: SetFn,
): void {
  set({ plannedMovement: plan });
}

export function clearPlannedMovementLogic(set: SetFn): void {
  set({ plannedMovement: null });
}

/**
 * Apply the planned move to the interactive session (emits
 * `MovementDeclared` + `MovementLocked` events) and clear the plan.
 * No-op when session / plan / selected unit are missing.
 */
export function commitPlannedMovementLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, plannedMovement, session, ui } = get();
  if (!interactiveSession || !plannedMovement || !ui.selectedUnitId) return;
  if (plannedMovement.unitId && plannedMovement.unitId !== ui.selectedUnitId) {
    set({ plannedMovement: null });
    return;
  }
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }
  const unitId = ui.selectedUnitId;
  const beforeSession = interactiveSession.getSession();
  const beforeEventCount = beforeSession.events.length;
  const initialFacing =
    beforeSession.currentState.units[unitId]?.facing ?? plannedMovement.facing;

  interactiveSession.applyMovement(
    unitId,
    plannedMovement.destination,
    plannedMovement.facing,
    plannedMovement.movementType,
    plannedMovement.path,
  );
  const nextSession = interactiveSession.getSession();
  if (!hasNewMovementDeclaredEvent(nextSession, unitId, beforeEventCount)) {
    set({ session: nextSession });
    return;
  }

  enqueueCommittedMovementAnimation({
    session: nextSession,
    unitId,
    initialFacing,
    fallbackPath: plannedMovement.path,
    fallbackMode: plannedMovement.movementType,
  });

  set({
    session: nextSession,
    interactivePhase: InteractivePhase.SelectUnit,
    plannedMovement: null,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

function hasNewMovementDeclaredEvent(
  session: IGameSession,
  unitId: string,
  startIndex: number,
): boolean {
  return session.events.slice(startIndex).some((event) => {
    if (event.type !== GameEventType.MovementDeclared) return false;
    const payload = event.payload as IMovementDeclaredPayload;
    return payload.unitId === unitId;
  });
}

/**
 * Commit a standalone stand-up/posture-exit action for the selected prone or
 * hull-down unit through the same movement validator used by normal map
 * movement. This declares a zero-hex Walk move at the unit's current position
 * so MP, invalid events, locking, and state replay stay on the movement event
 * path.
 */
export function standActiveUnitLogic(
  get: GetFn,
  set: SetFn,
  standUpMode: StandUpMode = 'normal',
): void {
  const { interactiveSession, session, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  const unitId = ui.selectedUnitId;
  const beforeSession = interactiveSession.getSession();
  const unitState = beforeSession.currentState.units[unitId];
  if (!unitState?.prone && !unitState?.hullDown) return;

  const beforeEventCount = beforeSession.events.length;
  interactiveSession.applyMovement(
    unitId,
    unitState.position,
    unitState.facing,
    MovementType.Walk,
    [unitState.position],
    standUpMode,
  );

  const nextSession = interactiveSession.getSession();
  const declared = nextSession.events
    .slice(beforeEventCount)
    .some((event) => event.type === GameEventType.MovementDeclared);

  if (!declared) {
    set({ session: nextSession, plannedMovement: null });
    return;
  }

  set({
    session: nextSession,
    interactivePhase: InteractivePhase.SelectUnit,
    plannedMovement: null,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

/**
 * Commit MegaMek's standing HULL_DOWN posture transition as a same-hex
 * walking movement declaration. The engine owns MP/heat legality and rejects
 * non-Mek-style or damaged-gyro branches before state changes.
 */
export function enterHullDownActiveUnitLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, session, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  const unitId = ui.selectedUnitId;
  const beforeSession = interactiveSession.getSession();
  const unitState = beforeSession.currentState.units[unitId];
  if (!unitState || unitState.prone === true || unitState.hullDown === true) {
    return;
  }

  const beforeEventCount = beforeSession.events.length;
  interactiveSession.applyMovement(
    unitId,
    unitState.position,
    unitState.facing,
    MovementType.Walk,
    [unitState.position],
    undefined,
    { hullDownEntryAttempt: true },
  );

  const nextSession = interactiveSession.getSession();
  const declared = nextSession.events
    .slice(beforeEventCount)
    .some((event) => event.type === GameEventType.MovementDeclared);

  if (!declared) {
    set({ session: nextSession, plannedMovement: null });
    return;
  }

  set({
    session: nextSession,
    interactivePhase: InteractivePhase.SelectUnit,
    plannedMovement: null,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

/**
 * Commit MegaMek's 0 MP GO_PRONE posture transition from hull-down to prone.
 * This uses `MovementDeclared` so replay, lock-state, and map state all share
 * the same authoritative path as ordinary movement actions.
 */
export function goProneActiveUnitLogic(get: GetFn, set: SetFn): void {
  const { interactiveSession, session, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  const unitId = ui.selectedUnitId;
  const beforeSession = interactiveSession.getSession();
  const unitState = beforeSession.currentState.units[unitId];
  if (unitState?.hullDown !== true || unitState.prone === true) return;

  const beforeEventCount = beforeSession.events.length;
  interactiveSession.applyMovement(
    unitId,
    unitState.position,
    unitState.facing,
    MovementType.Stationary,
    [unitState.position],
    undefined,
    { goProneAttempt: true },
  );

  const nextSession = interactiveSession.getSession();
  const declared = nextSession.events
    .slice(beforeEventCount)
    .some((event) => event.type === GameEventType.MovementDeclared);

  if (!declared) {
    set({ session: nextSession, plannedMovement: null });
    return;
  }

  set({
    session: nextSession,
    interactivePhase: InteractivePhase.SelectUnit,
    plannedMovement: null,
    validMovementHexes: [],
    ui: { ...get().ui, selectedUnitId: null },
  });
}

/**
 * Commit a runtime movement-state change for the selected unit without
 * locking movement. Conversion and infantry mount/dismount controls use this
 * to force the same replayable state event consumed by movement projection and
 * commit validation, then keep the unit selected so the map immediately
 * recomputes the overlay in the new mode.
 */
export function applyRuntimeMovementStateForSelectedUnitLogic(
  get: GetFn,
  set: SetFn,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): void {
  const { interactiveSession, session, ui } = get();
  if (!interactiveSession || !ui.selectedUnitId) return;
  const currentPhase =
    session?.currentState.phase ?? interactiveSession.getState().phase;
  if (
    !allowIntentInPhase({
      currentPhase,
      requiredPhase: GamePhase.Movement,
      intent: 'movement',
    })
  ) {
    return;
  }

  const unitId = ui.selectedUnitId;
  const beforeSession = interactiveSession.getSession();
  if (!beforeSession.currentState.units[unitId]) return;

  interactiveSession.applyRuntimeMovementState(unitId, patch);
  const nextSession = interactiveSession.getSession();
  const validMoves = interactiveSession.getAvailableActions(unitId).validMoves;

  set({
    session: nextSession,
    interactivePhase: InteractivePhase.SelectMovement,
    plannedMovement: null,
    validMovementHexes: validMoves,
    ui: { ...get().ui, selectedUnitId: unitId },
  });
}

function enqueueCommittedMovementAnimation(args: {
  readonly session: IGameSession;
  readonly unitId: string;
  readonly initialFacing: Facing;
  readonly fallbackPath: readonly IHexCoordinate[];
  readonly fallbackMode: MovementType;
}): void {
  if (getPrefersReducedMotion()) return;

  const movementEvent = findLatestMovementDeclaredEvent(
    args.session,
    args.unitId,
  );
  if (!movementEvent) return;

  const payload = movementEvent.payload as IMovementDeclaredPayload;
  const path = payload.path ?? args.fallbackPath;
  const mode = payload.mode ?? movementAnimationModeForType(args.fallbackMode);
  if (!mode || path.length <= 1) return;

  useAnimationQueue.getState().enqueue({
    id: `movement-${movementEvent.id}`,
    mapId: args.session.id,
    unitId: args.unitId,
    kind: 'movement',
    path,
    occupiedHexes: path,
    mode,
    initialFacing: args.initialFacing,
    finalFacing: payload.facing,
    eventSequence: movementEvent.sequence,
  });
}

function findLatestMovementDeclaredEvent(
  session: IGameSession,
  unitId: string,
) {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index];
    if (event.type !== GameEventType.MovementDeclared) continue;
    const payload = event.payload as IMovementDeclaredPayload;
    if (payload.unitId === unitId) return event;
  }
  return null;
}

function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  switch (movementType) {
    case MovementType.Walk:
    case MovementType.Run:
    case MovementType.Jump:
      return movementType;
    default:
      return null;
  }
}
