import {
  IAttackDeclaredPayload,
  IGameEvent,
  IGameState,
  IMovementDeclaredPayload,
  IUnitGameState,
  LockState,
} from '@/types/gameplay';

export function applyMovementDeclared(
  state: IGameState,
  payload: IMovementDeclaredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const updatedUnit: IUnitGameState = {
    ...unit,
    position: payload.to,
    facing: payload.facing,
    movementThisTurn: payload.movementType,
    hexesMovedThisTurn: payload.mpUsed,
    heat: unit.heat + payload.heatGenerated,
    lockState: LockState.Planning,
  };

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
  };
}

export function applyMovementLocked(
  state: IGameState,
  event: IGameEvent,
): IGameState {
  const unitId = event.actorId;
  if (!unitId) {
    return state;
  }

  const unit = state.units[unitId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        lockState: LockState.Locked,
      },
    },
    activationIndex: state.activationIndex + 1,
  };
}

export function applyAttackDeclared(
  state: IGameState,
  payload: IAttackDeclaredPayload,
): IGameState {
  const unit = state.units[payload.attackerId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.attackerId]: {
        ...unit,
        lockState: LockState.Planning,
      },
    },
  };
}

export function applyAttackLocked(
  state: IGameState,
  event: IGameEvent,
): IGameState {
  const unitId = event.actorId;
  if (!unitId) {
    return state;
  }

  const unit = state.units[unitId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        lockState: LockState.Locked,
      },
    },
    activationIndex: state.activationIndex + 1,
  };
}
