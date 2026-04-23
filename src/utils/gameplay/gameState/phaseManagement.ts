import {
  GamePhase,
  IGameEvent,
  IGameState,
  IInitiativeRolledPayload,
  IPhaseChangedPayload,
  LockState,
  MovementType,
} from '@/types/gameplay';

export function applyPhaseChanged(
  state: IGameState,
  event: IGameEvent,
  payload: IPhaseChangedPayload,
): IGameState {
  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    units[unitId] = {
      ...units[unitId],
      lockState: LockState.Pending,
      pendingAction: undefined,
      damageThisPhase: 0,
    };
  }

  if (payload.toPhase === GamePhase.Movement) {
    for (const unitId of Object.keys(units)) {
      units[unitId] = {
        ...units[unitId],
        movementThisTurn: MovementType.Stationary,
        hexesMovedThisTurn: 0,
      };
    }
  }

  return {
    ...state,
    phase: payload.toPhase,
    activationIndex: 0,
    units,
    turnEvents: [...state.turnEvents, event],
  };
}

export function applyTurnStarted(
  state: IGameState,
  event: IGameEvent,
): IGameState {
  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    // Per `wire-piloting-skill-rolls` task 1.3: clear any PSRs that
    // survived the prior turn's End phase (a defensive reset — the
    // End phase's `resolvePendingPSRs` should have drained them, but
    // if a caller advanced past End without resolving, a stale queue
    // would carry into a fresh turn). TW p.52: PSRs do not persist
    // across turn boundaries.
    units[unitId] = {
      ...units[unitId],
      weaponsFiredThisTurn: [],
      pendingPSRs: [],
    };
  }

  return {
    ...state,
    turn: event.turn,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units,
    turnEvents: [event],
  };
}

export function applyInitiativeRolled(
  state: IGameState,
  payload: IInitiativeRolledPayload,
): IGameState {
  return {
    ...state,
    initiativeWinner: payload.winner,
    firstMover: payload.movesFirst,
  };
}
