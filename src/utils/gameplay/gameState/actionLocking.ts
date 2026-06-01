import {
  IAttackDeclaredPayload,
  IGameEvent,
  IGameState,
  IMovementDeclaredPayload,
  IRuntimeMovementStateChangedPayload,
  IMovementStep,
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

  const updatedUnit: IUnitGameState = clearPendingAltitudeControlMovementCost(
    clearPendingConversionMovementCost({
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
