import type { IMovementRangeHex, IUnitGameState } from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

export interface IPendingAltitudeControlMovementCost {
  readonly stepCount: number;
  readonly mpCost: number;
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function pendingAltitudeControlMovementCost(
  unit: Pick<
    IUnitGameState,
    'pendingAltitudeControlStepCount' | 'pendingAltitudeControlMpCost'
  >,
): IPendingAltitudeControlMovementCost {
  return {
    stepCount: normalizeNonNegativeInteger(
      unit.pendingAltitudeControlStepCount,
    ),
    mpCost: normalizeNonNegativeInteger(unit.pendingAltitudeControlMpCost),
  };
}

export function hasPendingAltitudeControlMovementCost(
  pending: IPendingAltitudeControlMovementCost,
): boolean {
  return pending.stepCount > 0 || pending.mpCost > 0;
}

export function accumulatedAltitudeControlMovementPatch(
  unit: Pick<
    IUnitGameState,
    'pendingAltitudeControlStepCount' | 'pendingAltitudeControlMpCost'
  >,
  payload: IRuntimeMovementStateChangedPayload,
): Partial<IUnitGameState> {
  if (payload.source !== 'altitude_control_action') return {};
  if (
    payload.altitudeControlStepCount === undefined &&
    payload.altitudeControlMpCost === undefined
  ) {
    return {};
  }

  const current = pendingAltitudeControlMovementCost(unit);
  return {
    pendingAltitudeControlStepCount:
      current.stepCount +
      normalizeNonNegativeInteger(payload.altitudeControlStepCount),
    pendingAltitudeControlMpCost:
      current.mpCost +
      normalizeNonNegativeInteger(payload.altitudeControlMpCost),
  };
}

export function clearPendingAltitudeControlMovementCost<
  T extends Record<string, unknown>,
>(unit: T): T {
  const {
    pendingAltitudeControlStepCount: _stepCount,
    pendingAltitudeControlMpCost: _mpCost,
    ...rest
  } = unit;
  return rest as T;
}

export function withPendingAltitudeControlProjection(
  movementHex: IMovementRangeHex,
  pending: IPendingAltitudeControlMovementCost,
): IMovementRangeHex {
  if (!hasPendingAltitudeControlMovementCost(pending)) return movementHex;
  return {
    ...movementHex,
    altitudeControlStepCount: pending.stepCount,
    altitudeControlMpCost: pending.mpCost,
  };
}

export function formatPendingAltitudeControlCost(
  pending: IPendingAltitudeControlMovementCost,
): string {
  if (!hasPendingAltitudeControlMovementCost(pending)) return '';
  const stepLabel =
    pending.stepCount === 1
      ? '1 altitude-control step'
      : `${pending.stepCount} altitude-control steps`;
  return `${stepLabel}, ${pending.mpCost} MP`;
}
