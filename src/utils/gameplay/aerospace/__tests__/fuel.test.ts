/**
 * Aerospace fuel tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md (Fuel)
 */

import { AerospaceEventType } from '../events';
import { burnAerospaceFuel, mustLeaveBoard } from '../fuel';
import { createAerospaceCombatState } from '../state';

function mkState(fuel = 20, depleted = false, offMap = false) {
  return {
    ...createAerospaceCombatState({
      maxSI: 6,
      armorByArc: { nose: 10, leftWing: 10, rightWing: 10, aft: 10 },
      heatSinks: 10,
      fuelPoints: fuel,
      safeThrust: 6,
      maxThrust: 9,
    }),
    fuelDepleted: depleted,
    offMap,
  };
}

describe('burnAerospaceFuel', () => {
  it('subtracts thrust from fuel', () => {
    const r = burnAerospaceFuel({
      unitId: 'asf-1',
      state: mkState(20),
      thrustUsed: 5,
    });
    expect(r.state.fuelRemaining).toBe(15);
    expect(r.fuelSpent).toBe(5);
    expect(r.depletedThisTurn).toBe(false);
    expect(r.events.length).toBe(0);
  });

  it('clamps fuel to 0 on overspend', () => {
    const r = burnAerospaceFuel({
      unitId: 'asf-1',
      state: mkState(3),
      thrustUsed: 10,
    });
    expect(r.state.fuelRemaining).toBe(0);
  });

  it('emits FUEL_DEPLETED the first time fuel hits 0', () => {
    const r = burnAerospaceFuel({
      unitId: 'asf-1',
      state: mkState(3),
      thrustUsed: 3,
    });
    expect(r.state.fuelDepleted).toBe(true);
    expect(r.depletedThisTurn).toBe(true);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.FUEL_DEPLETED),
    ).toBeDefined();
  });

  it('does NOT re-emit FUEL_DEPLETED on already-depleted unit', () => {
    const r = burnAerospaceFuel({
      unitId: 'asf-1',
      state: mkState(0, true),
      thrustUsed: 5,
    });
    expect(r.events.length).toBe(0);
    expect(r.depletedThisTurn).toBe(false);
  });

  it('negative thrust treated as 0', () => {
    const r = burnAerospaceFuel({
      unitId: 'asf-1',
      state: mkState(10),
      thrustUsed: -5,
    });
    expect(r.fuelSpent).toBe(0);
    expect(r.state.fuelRemaining).toBe(10);
  });
});

describe('mustLeaveBoard', () => {
  it('true for fuel-depleted on-map unit', () => {
    expect(mustLeaveBoard(mkState(0, true, false))).toBe(true);
  });
  it('false for fuel-depleted off-map unit (already gone)', () => {
    expect(mustLeaveBoard(mkState(0, true, true))).toBe(false);
  });
  it('false for fueled unit', () => {
    expect(mustLeaveBoard(mkState(10, false, false))).toBe(false);
  });
});
