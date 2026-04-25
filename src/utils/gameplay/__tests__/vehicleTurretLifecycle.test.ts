/**
 * Tests for the vehicle turret-pivot lifecycle helpers.
 *
 * Locks in the SET / CLEAR semantics for `turretPivotedThisTurn` on
 * `IVehicleCombatState`. The flag drives the +1 chin-turret pivot to-hit
 * penalty (see `calculateChinTurretPivotModifier`), and the spec
 * requires it to be cleared at the start of each turn.
 *
 * @spec openspec/specs/firing-arc-calculation/spec.md
 *   Requirement: Vehicle Chin Turret Pivot Penalty
 */

import { describe, expect, it } from '@jest/globals';

import type { IVehicleCombatState } from '@/types/gameplay';

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  clearAllTurretPivotedFlags,
  clearTurretPivotedFlag,
  markTurretPivoted,
} from '../vehicleTurretLifecycle';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeVehicleState(
  overrides: Partial<IVehicleCombatState> = {},
): IVehicleCombatState {
  return {
    unitId: 'tank-1',
    motionType: GroundMotionType.TRACKED,
    armor: {},
    structure: {},
    destroyedLocations: [],
    motive: {
      originalCruiseMP: 4,
      penaltyMP: 0,
      immobilized: false,
      sinking: false,
      turretLocked: false,
      engineHits: 0,
      driverHits: 0,
      commanderHits: 0,
      crewStunnedPhases: 0,
    },
    turretLock: { primaryLocked: false, secondaryLocked: false },
    destroyed: false,
    ...overrides,
  };
}

describe('markTurretPivoted', () => {
  it('sets turretPivotedThisTurn = true on a state without the flag', () => {
    const state = makeVehicleState();
    expect(state.turretPivotedThisTurn).toBeUndefined();

    const result = markTurretPivoted(state);

    expect(result.turretPivotedThisTurn).toBe(true);
    // New object identity (immutable update).
    expect(result).not.toBe(state);
  });

  it('sets the flag when previously explicitly false', () => {
    const state = makeVehicleState({ turretPivotedThisTurn: false });

    const result = markTurretPivoted(state);

    expect(result.turretPivotedThisTurn).toBe(true);
    expect(result).not.toBe(state);
  });

  it('is idempotent — returns the same reference when already pivoted', () => {
    const state = makeVehicleState({ turretPivotedThisTurn: true });

    const result = markTurretPivoted(state);

    expect(result).toBe(state); // Same reference, no-op.
    expect(result.turretPivotedThisTurn).toBe(true);
  });
});

describe('clearTurretPivotedFlag', () => {
  it('clears the flag when set', () => {
    const state = makeVehicleState({ turretPivotedThisTurn: true });

    const result = clearTurretPivotedFlag(state);

    expect(result.turretPivotedThisTurn).toBe(false);
    expect(result).not.toBe(state);
  });

  it('is idempotent — returns same reference when flag is absent', () => {
    const state = makeVehicleState();

    const result = clearTurretPivotedFlag(state);

    expect(result).toBe(state);
    // Flag remains undefined; clearing absence yields absence.
    expect(result.turretPivotedThisTurn).toBeUndefined();
  });

  it('is idempotent — returns same reference when flag is explicitly false', () => {
    const state = makeVehicleState({ turretPivotedThisTurn: false });

    const result = clearTurretPivotedFlag(state);

    expect(result).toBe(state);
  });
});

describe('clearAllTurretPivotedFlags', () => {
  it('clears the flag across a mixed batch of vehicle states', () => {
    const states: Record<string, IVehicleCombatState> = {
      'tank-pivoted': makeVehicleState({
        unitId: 'tank-pivoted',
        turretPivotedThisTurn: true,
      }),
      'tank-static': makeVehicleState({ unitId: 'tank-static' }),
      'tank-also-pivoted': makeVehicleState({
        unitId: 'tank-also-pivoted',
        turretPivotedThisTurn: true,
      }),
    };

    const result = clearAllTurretPivotedFlags(states);

    expect(result['tank-pivoted'].turretPivotedThisTurn).toBe(false);
    expect(result['tank-also-pivoted'].turretPivotedThisTurn).toBe(false);
    // Untouched state preserves identity.
    expect(result['tank-static']).toBe(states['tank-static']);
    // Mutated states get new references.
    expect(result['tank-pivoted']).not.toBe(states['tank-pivoted']);
  });

  it('returns the same map reference when no state needed updating', () => {
    // None of these states have the flag set, so nothing changes — the
    // helper short-circuits and preserves selector / memo identity.
    const states: Record<string, IVehicleCombatState> = {
      'tank-1': makeVehicleState({ unitId: 'tank-1' }),
      'tank-2': makeVehicleState({
        unitId: 'tank-2',
        turretPivotedThisTurn: false,
      }),
    };

    const result = clearAllTurretPivotedFlags(states);

    expect(result).toBe(states);
  });

  it('handles an empty input map without erroring', () => {
    const states: Record<string, IVehicleCombatState> = {};

    const result = clearAllTurretPivotedFlags(states);

    expect(result).toBe(states);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('SET → CLEAR end-to-end lifecycle', () => {
  it('marks then clears returns to a flag-clean state', () => {
    // Models the canonical turn lifecycle: turret rotates mid-turn (SET),
    // turn ends and TurnStarted handler runs (CLEAR), next turn begins
    // with the flag back to false.
    const initial = makeVehicleState();

    const afterPivot = markTurretPivoted(initial);
    expect(afterPivot.turretPivotedThisTurn).toBe(true);

    const afterTurnStart = clearTurretPivotedFlag(afterPivot);
    expect(afterTurnStart.turretPivotedThisTurn).toBe(false);
  });
});
