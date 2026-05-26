import {
  IAttackDeclaredPayload,
  IAttacksRevealedPayload,
  IFacingChangedPayload,
  IGameEvent,
  IGameState,
  IMovementEnhancementActivatedPayload,
  IMovementDeclaredPayload,
  IUnitGameState,
  LockState,
} from '@/types/gameplay';
import {
  movementStepsUseBackwardMovement,
  movementStepsUseMechanicalJumpBooster,
} from '@/utils/gameplay/movement/stepPredicates';

export function applyMovementDeclared(
  state: IGameState,
  payload: IMovementDeclaredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  const wentProne =
    payload.steps?.some((step) => step.kind === 'goProne') ?? false;

  const updatedUnit: IUnitGameState = {
    ...unit,
    position: payload.to,
    facing: payload.facing,
    secondaryFacing: payload.facing,
    torsoTwist: undefined,
    movementThisTurn: payload.movementType,
    hexesMovedThisTurn: payload.hexesMoved ?? payload.mpUsed,
    movedBackwardThisTurn: movementStepsUseBackwardMovement(payload.steps),
    usedMechanicalJumpBoosterThisTurn: movementStepsUseMechanicalJumpBooster(
      payload.steps,
    ),
    heat: unit.heat + payload.heatGenerated,
    prone: wentProne ? true : unit.prone,
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

export function applyFacingChanged(
  state: IGameState,
  payload: IFacingChangedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const facing = payload.facing ?? unit.facing;
  const secondaryFacing =
    payload.secondaryFacing ??
    (payload.facing !== undefined ? facing : unit.secondaryFacing);

  const updatedUnit: IUnitGameState = {
    ...unit,
    facing,
    ...(secondaryFacing !== undefined ? { secondaryFacing } : {}),
    ...(payload.torsoTwist !== undefined
      ? { torsoTwist: payload.torsoTwist }
      : { torsoTwist: undefined }),
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

export function applyMovementEnhancementActivated(
  state: IGameState,
  payload: IMovementEnhancementActivatedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const updatedUnit: IUnitGameState =
    payload.enhancement === 'MASC'
      ? { ...unit, activeMASC: true }
      : { ...unit, activeSupercharger: true };

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: updatedUnit,
    },
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

export function applyAttacksRevealed(
  state: IGameState,
  payload: IAttacksRevealedPayload,
): IGameState {
  const units = { ...state.units };
  for (const unitId of payload.unitIds) {
    const unit = units[unitId];
    if (!unit || unit.lockState !== LockState.Locked) {
      continue;
    }

    units[unitId] = {
      ...unit,
      lockState: LockState.Revealed,
    };
  }

  return {
    ...state,
    units,
  };
}
