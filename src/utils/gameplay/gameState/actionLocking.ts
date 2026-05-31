import {
  IAttackDeclaredPayload,
  IGameEvent,
  IGameState,
  IMovementDeclaredPayload,
  IMovementStep,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';

export function applyMovementDeclared(
  state: IGameState,
  payload: IMovementDeclaredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const prone =
    payload.hullDownEntryAttempt === true
      ? false
      : payload.goProneAttempt === true
        ? true
        : payload.standUpAttempt === true
          ? payload.standUpSucceeded !== true
          : unit.prone && payload.movementType !== MovementType.Stationary
            ? false
            : unit.prone;
  const hullDown =
    payload.hullDownEntryAttempt === true
      ? true
      : payload.goProneAttempt === true
        ? false
        : payload.hullDownExitAttempt === true
          ? false
          : payload.standUpAttempt === true && payload.standUpSucceeded === true
            ? false
            : unit.hullDown;
  const hullDownEnteredBackwards =
    payload.hullDownEntryAttempt === true
      ? pathContainsBackwardStep(payload.steps)
      : hullDown === true
        ? unit.hullDownEnteredBackwards
        : false;

  const updatedUnit: IUnitGameState = {
    ...unit,
    position: payload.to,
    facing: payload.facing,
    movementThisTurn: payload.movementType,
    hexesMovedThisTurn: payload.mpUsed,
    heat: unit.heat + payload.heatGenerated,
    prone,
    hullDown,
    hullDownEnteredBackwards,
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

function pathContainsBackwardStep(
  steps: readonly IMovementStep[] | undefined,
): boolean {
  return (
    steps?.some(
      (step) => step.kind === 'forward' && step.direction === 'backward',
    ) ?? false
  );
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
