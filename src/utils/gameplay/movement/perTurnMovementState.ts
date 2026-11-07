import type { IUnitGameState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import { clearPendingAltitudeControlMovementCost } from './altitudeControlAccounting';
import { clearPendingConversionMovementCost } from './conversionAccounting';

const MAX_STANDARD_BOOSTER_FAILURE_LEVEL = 6;

function normalizeBoosterTurnsUsed(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(
    0,
    Math.min(MAX_STANDARD_BOOSTER_FAILURE_LEVEL, Math.trunc(value)),
  );
}

function advanceBoosterTurnCounter(options: {
  readonly active: boolean | undefined;
  readonly turnsUsed: number | undefined;
  readonly failureLevelIncreasedLastTurn: boolean | undefined;
}): {
  readonly turnsUsed: number;
  readonly failureLevelIncreasedLastTurn: boolean;
} {
  const turnsUsed = normalizeBoosterTurnsUsed(options.turnsUsed);

  if (options.active === true) {
    return {
      turnsUsed: Math.min(turnsUsed + 1, MAX_STANDARD_BOOSTER_FAILURE_LEVEL),
      failureLevelIncreasedLastTurn: true,
    };
  }

  const idleDecay = options.failureLevelIncreasedLastTurn === true ? 2 : 1;
  return {
    turnsUsed: Math.max(0, turnsUsed - idleDecay),
    failureLevelIncreasedLastTurn: false,
  };
}

function shouldTrackMASC(unit: IUnitGameState): boolean {
  return (
    unit.hasMASC === true ||
    unit.activeMASC === true ||
    unit.mascTurnsUsed !== undefined ||
    unit.mascFailureLevelIncreasedLastTurn !== undefined
  );
}

function shouldTrackSupercharger(unit: IUnitGameState): boolean {
  return (
    unit.hasSupercharger === true ||
    unit.activeSupercharger === true ||
    unit.superchargerTurnsUsed !== undefined ||
    unit.superchargerFailureLevelIncreasedLastTurn !== undefined
  );
}

/**
 * MegaMek 48fcb2f64 Entity.incrementMASCAndSuperchargerLevels (16388–16414),
 * called by Mek.newRound (1240), advances use before clearing activation.
 * Movement entry also resets movement, but must not advance counters twice.
 */
export function resetPerTurnMovementState(
  unit: IUnitGameState,
  options: { readonly advanceBoosterCounters?: boolean } = {},
): IUnitGameState {
  let updatedUnit: IUnitGameState = clearPendingAltitudeControlMovementCost(
    clearPendingConversionMovementCost({
      ...unit,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      movedBackwardThisTurn: false,
      usedMechanicalJumpBoosterThisTurn: false,
      isEvading: false,
      evasionBonus: undefined,
      // Preserve absence for dormant units in existing replay digests.
      sprintedThisTurn: unit.sprintedThisTurn === undefined ? undefined : false,
    }),
  );
  if (options.advanceBoosterCounters === false) return updatedUnit;

  const mascCounter = advanceBoosterTurnCounter({
    active: unit.activeMASC,
    turnsUsed: unit.mascTurnsUsed,
    failureLevelIncreasedLastTurn: unit.mascFailureLevelIncreasedLastTurn,
  });
  const superchargerCounter = advanceBoosterTurnCounter({
    active: unit.activeSupercharger,
    turnsUsed: unit.superchargerTurnsUsed,
    failureLevelIncreasedLastTurn:
      unit.superchargerFailureLevelIncreasedLastTurn,
  });

  if (shouldTrackMASC(unit)) {
    updatedUnit = {
      ...updatedUnit,
      activeMASC: false,
      mascTurnsUsed: mascCounter.turnsUsed,
      mascFailureLevelIncreasedLastTurn:
        mascCounter.failureLevelIncreasedLastTurn,
    };
  }
  if (shouldTrackSupercharger(unit)) {
    updatedUnit = {
      ...updatedUnit,
      activeSupercharger: false,
      superchargerTurnsUsed: superchargerCounter.turnsUsed,
      superchargerFailureLevelIncreasedLastTurn:
        superchargerCounter.failureLevelIncreasedLastTurn,
    };
  }

  return updatedUnit;
}
