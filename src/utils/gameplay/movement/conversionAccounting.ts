import type { IMovementRangeHex, IUnitGameState } from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

export interface IPendingConversionMovementCost {
  readonly stepCount: number;
  readonly mpCost: number;
}

function normalizeNonNegativeInteger(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function pendingConversionMovementCost(
  unit: Pick<
    IUnitGameState,
    'pendingConversionStepCount' | 'pendingConversionMpCost'
  >,
): IPendingConversionMovementCost {
  return {
    stepCount: normalizeNonNegativeInteger(unit.pendingConversionStepCount),
    mpCost: normalizeNonNegativeInteger(unit.pendingConversionMpCost),
  };
}

export function hasPendingConversionMovementCost(
  pending: IPendingConversionMovementCost,
): boolean {
  return pending.stepCount > 0 || pending.mpCost > 0;
}

export function accumulatedConversionMovementPatch(
  unit: Pick<
    IUnitGameState,
    'pendingConversionStepCount' | 'pendingConversionMpCost'
  >,
  payload: IRuntimeMovementStateChangedPayload,
): Partial<IUnitGameState> {
  if (payload.source !== 'conversion_action') return {};
  if (
    payload.conversionStepCount === undefined &&
    payload.conversionMpCost === undefined
  ) {
    return {};
  }

  const current = pendingConversionMovementCost(unit);
  return {
    pendingConversionStepCount:
      current.stepCount +
      normalizeNonNegativeInteger(payload.conversionStepCount),
    pendingConversionMpCost:
      current.mpCost + normalizeNonNegativeInteger(payload.conversionMpCost),
  };
}

export function clearPendingConversionMovementCost<
  T extends Record<string, unknown>,
>(unit: T): T {
  const {
    pendingConversionStepCount: _stepCount,
    pendingConversionMpCost: _mpCost,
    ...rest
  } = unit;
  return rest as T;
}

export function withPendingConversionProjection(
  movementHex: IMovementRangeHex,
  pending: IPendingConversionMovementCost,
): IMovementRangeHex {
  if (!hasPendingConversionMovementCost(pending)) return movementHex;
  return {
    ...movementHex,
    conversionStepCount: pending.stepCount,
    conversionMpCost: pending.mpCost,
  };
}

export function formatPendingConversionCost(
  pending: IPendingConversionMovementCost,
): string {
  if (!hasPendingConversionMovementCost(pending)) return '';
  const stepLabel =
    pending.stepCount === 1
      ? '1 conversion step'
      : `${pending.stepCount} conversion steps`;
  return `${stepLabel}, ${pending.mpCost} MP`;
}
