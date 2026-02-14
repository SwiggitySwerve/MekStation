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
    units[unitId] = {
      ...units[unitId],
      weaponsFiredThisTurn: [],
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
