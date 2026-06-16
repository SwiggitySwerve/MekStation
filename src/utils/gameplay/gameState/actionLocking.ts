import {
  IAttackDeclaredPayload,
  IAttacksRevealedPayload,
  IFacingChangedPayload,
  IGameEvent,
  IGameState,
  IMovementEnhancementActivatedPayload,
  IMovementDeclaredPayload,
  IMovementStep,
  IRuntimeMovementStateChangedPayload,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';
import {
  accumulatedAltitudeControlMovementPatch,
  clearPendingAltitudeControlMovementCost,
} from '@/utils/gameplay/movement/altitudeControlAccounting';
import {
  accumulatedConversionMovementPatch,
  clearPendingConversionMovementCost,
} from '@/utils/gameplay/movement/conversionAccounting';
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
  const goProneMovement = payload.goProneAttempt === true || wentProne;
  const isEvadeMovement = payload.movementType === MovementType.Evade;
  const isSprintMovement = payload.movementType === MovementType.Sprint;
  const prone =
    payload.hullDownEntryAttempt === true
      ? false
      : goProneMovement
        ? true
        : payload.standUpAttempt === true
          ? payload.standUpSucceeded !== true
          : unit.prone && payload.movementType !== MovementType.Stationary
            ? false
            : unit.prone;
  const hullDown =
    payload.hullDownEntryAttempt === true
      ? true
      : goProneMovement
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

  const updatedUnit: IUnitGameState = clearPendingAltitudeControlMovementCost(
    clearPendingConversionMovementCost({
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
      isEvading: isEvadeMovement,
      evasionBonus: isEvadeMovement ? 1 : undefined,
      sprintedThisTurn: isSprintMovement,
      heat: unit.heat + payload.heatGenerated,
      prone,
      hullDown,
      hullDownEnteredBackwards,
      ...(goProneMovement ? { infernoBurning: false } : {}),
      lockState: LockState.Planning,
    }),
  );

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

export function applyRuntimeMovementStateChanged(
  state: IGameState,
  payload: IRuntimeMovementStateChangedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: applyRuntimeMovementPatch(unit, payload),
    },
  };
}

function applyRuntimeMovementPatch(
  unit: IUnitGameState,
  payload: IRuntimeMovementStateChangedPayload,
): IUnitGameState {
  let next: Record<string, unknown> = { ...unit };
  next = applyNullableField(next, payload, 'conversionMode');
  next = applyNullableField(next, payload, 'unitHeight');
  next = applyVehicleAltitudeField(next, payload);
  next = applyProtoAltitudeField(next, payload);
  next = applyLamAirMekAltitudeField(next, payload);
  next = applyNullableField(next, payload, 'infantryMounted');
  next = applyNullableField(next, payload, 'infantryMountHeight');
  next = {
    ...next,
    ...accumulatedAltitudeControlMovementPatch(
      next as unknown as IUnitGameState,
      payload,
    ),
    ...accumulatedConversionMovementPatch(
      next as unknown as IUnitGameState,
      payload,
    ),
  };
  return next as unknown as IUnitGameState;
}

function applyNullableField(
  target: Record<string, unknown>,
  payload: IRuntimeMovementStateChangedPayload,
  key:
    | 'conversionMode'
    | 'unitHeight'
    | 'infantryMounted'
    | 'infantryMountHeight',
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) return target;
  const value = payload[key];
  if (value === null) {
    const { [key]: _removed, ...rest } = target;
    return rest;
  }
  return { ...target, [key]: value };
}

function applyVehicleAltitudeField(
  target: Record<string, unknown>,
  payload: IRuntimeMovementStateChangedPayload,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'vehicleAltitude')) {
    return target;
  }
  const combatState = target.combatState;
  if (
    !combatState ||
    typeof combatState !== 'object' ||
    (combatState as { readonly kind?: unknown }).kind !== 'vehicle'
  ) {
    return target;
  }
  const vehicleState = combatState as {
    readonly kind: 'vehicle';
    readonly state: Record<string, unknown>;
  };
  return {
    ...target,
    combatState: {
      ...vehicleState,
      state: {
        ...vehicleState.state,
        altitude: normalizedVehicleAltitude(payload.vehicleAltitude),
      },
    },
  };
}

function applyProtoAltitudeField(
  target: Record<string, unknown>,
  payload: IRuntimeMovementStateChangedPayload,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'protoAltitude')) {
    return target;
  }
  const combatState = target.combatState;
  if (
    !combatState ||
    typeof combatState !== 'object' ||
    (combatState as { readonly kind?: unknown }).kind !== 'proto'
  ) {
    return target;
  }
  const protoState = combatState as {
    readonly kind: 'proto';
    readonly state: Record<string, unknown>;
  };
  return {
    ...target,
    combatState: {
      ...protoState,
      state: {
        ...protoState.state,
        altitude: normalizedVehicleAltitude(payload.protoAltitude),
      },
    },
  };
}

function applyLamAirMekAltitudeField(
  target: Record<string, unknown>,
  payload: IRuntimeMovementStateChangedPayload,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'lamAirMekAltitude')) {
    return target;
  }
  return {
    ...target,
    lamAirMekAltitude: normalizedVehicleAltitude(payload.lamAirMekAltitude),
  };
}

function normalizedVehicleAltitude(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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
