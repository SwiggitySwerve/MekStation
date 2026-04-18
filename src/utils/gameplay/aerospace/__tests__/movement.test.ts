/**
 * Aerospace movement tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md
 */

import { AerospaceEventType } from '../events';
import {
  DEFAULT_OFFMAP_RETURN_DELAY,
  effectiveSafeThrust,
  headingDelta,
  hexDistance,
  hexLine,
  maxHexesPerTurn,
  resolveAerospaceMovement,
  resolveAerospaceReEntry,
} from '../movement';
import { createAerospaceCombatState } from '../state';

function mkState(
  overrides: Partial<{ safeThrust: number; fuel: number }> = {},
) {
  return createAerospaceCombatState({
    maxSI: 6,
    armorByArc: { nose: 10, leftWing: 10, rightWing: 10, aft: 10 },
    heatSinks: 10,
    fuelPoints: overrides.fuel ?? 20,
    safeThrust: overrides.safeThrust ?? 6,
    maxThrust: 9,
  });
}

describe('hexDistance / hexLine', () => {
  it('distance is 0 for the same hex', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });
  it('distance along one axis', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 5, r: 0 })).toBe(5);
  });
  it('hexLine produces dist+1 hexes including endpoints', () => {
    const line = hexLine({ q: 0, r: 0 }, { q: 3, r: 0 });
    expect(line.length).toBe(4);
    expect(line[0]).toEqual({ q: 0, r: 0 });
    expect(line[3]).toEqual({ q: 3, r: 0 });
  });
});

describe('headingDelta', () => {
  it('0 → 60 = +60', () => {
    expect(headingDelta(0, 60)).toBe(60);
  });
  it('60 → 0 = -60', () => {
    expect(headingDelta(60, 0)).toBe(-60);
  });
  it('wraps across 360 boundary', () => {
    expect(headingDelta(350, 10)).toBe(20);
    expect(headingDelta(10, 350)).toBe(-20);
  });
});

describe('effectiveSafeThrust / maxHexesPerTurn', () => {
  it('unreduced state returns baseSafeThrust and 2× for max', () => {
    const s = mkState({ safeThrust: 6 });
    expect(effectiveSafeThrust(s)).toBe(6);
    expect(maxHexesPerTurn(s)).toBe(12);
  });
  it('thrust penalty reduces effective', () => {
    const s = { ...mkState({ safeThrust: 6 }), thrustPenalty: 2 };
    expect(effectiveSafeThrust(s)).toBe(4);
    expect(maxHexesPerTurn(s)).toBe(8);
  });
  it('penalty cannot drive below 0', () => {
    const s = { ...mkState({ safeThrust: 2 }), thrustPenalty: 9 };
    expect(effectiveSafeThrust(s)).toBe(0);
    expect(maxHexesPerTurn(s)).toBe(0);
  });
});

describe('resolveAerospaceMovement', () => {
  it('rejects when destroyed', () => {
    const state = { ...mkState(), destroyed: true };
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
  });

  it('rejects when off-map', () => {
    const state = { ...mkState(), offMap: true, offMapReturnTurn: 3 };
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/off-map/i);
  });

  it('rejects moves over the distance cap', () => {
    const state = mkState({ safeThrust: 3 }); // cap = 6
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 10, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/exceeds max/);
  });

  it('rejects heading changes over 60°', () => {
    const state = mkState();
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 2, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 90,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/60/);
  });

  it('legal move burns fuel = ceil(dist/2) and returns path', () => {
    const state = mkState({ fuel: 20 });
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 5, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(true);
    expect(r.thrustUsed).toBe(3); // ceil(5/2)
    expect(r.state.fuelRemaining).toBe(17);
    expect(r.path.length).toBe(6);
  });

  it('exits board when `to` distance >= boardRadius', () => {
    const state = mkState();
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 18, r: 0 },
      to: { q: 20, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 3,
      board: { boardRadius: 20 },
    });
    expect(r.exitedBoard).toBe(true);
    expect(r.state.offMap).toBe(true);
    expect(r.state.offMapReturnTurn).toBe(3 + DEFAULT_OFFMAP_RETURN_DELAY);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.AEROSPACE_EXITED),
    ).toBeDefined();
  });

  it('fuel depletion fires FUEL_DEPLETED event', () => {
    const state = mkState({ fuel: 2 });
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 0, r: 0 },
      to: { q: 4, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.state.fuelRemaining).toBe(0);
    expect(r.state.fuelDepleted).toBe(true);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.FUEL_DEPLETED),
    ).toBeDefined();
  });

  it('fuel-depleted off-board exit emits UNIT_DESTROYED', () => {
    const state = mkState({ fuel: 1 });
    const r = resolveAerospaceMovement({
      unitId: 'asf-1',
      state,
      from: { q: 18, r: 0 },
      to: { q: 20, r: 0 },
      currentHeadingDeg: 0,
      newHeadingDeg: 0,
      currentTurn: 1,
      board: { boardRadius: 20 },
    });
    expect(r.state.fuelDepleted).toBe(true);
    expect(r.state.offMap).toBe(true);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.UNIT_DESTROYED),
    ).toBeDefined();
  });
});

describe('resolveAerospaceReEntry', () => {
  it('rejects when unit is still on-map', () => {
    const state = mkState();
    const r = resolveAerospaceReEntry({
      unitId: 'asf-1',
      state,
      currentTurn: 5,
      entryCoord: { q: 20, r: 0 },
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
  });

  it('rejects fuel-depleted units', () => {
    const state = {
      ...mkState(),
      offMap: true,
      offMapReturnTurn: 3,
      fuelDepleted: true,
    };
    const r = resolveAerospaceReEntry({
      unitId: 'asf-1',
      state,
      currentTurn: 5,
      entryCoord: { q: 20, r: 0 },
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/fuel depleted/i);
  });

  it('rejects when current turn < return turn', () => {
    const state = { ...mkState(), offMap: true, offMapReturnTurn: 7 };
    const r = resolveAerospaceReEntry({
      unitId: 'asf-1',
      state,
      currentTurn: 5,
      entryCoord: { q: 20, r: 0 },
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/turn 7/);
  });

  it('rejects non-edge entry hex', () => {
    const state = { ...mkState(), offMap: true, offMapReturnTurn: 3 };
    const r = resolveAerospaceReEntry({
      unitId: 'asf-1',
      state,
      currentTurn: 5,
      entryCoord: { q: 5, r: 0 },
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(false);
    expect(r.reason).toMatch(/edge/);
  });

  it('re-entry succeeds with edge hex and elapsed turn', () => {
    const state = { ...mkState(), offMap: true, offMapReturnTurn: 3 };
    const r = resolveAerospaceReEntry({
      unitId: 'asf-1',
      state,
      currentTurn: 5,
      entryCoord: { q: 20, r: 0 },
      board: { boardRadius: 20 },
    });
    expect(r.legal).toBe(true);
    expect(r.state.offMap).toBe(false);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.AEROSPACE_ENTERED),
    ).toBeDefined();
  });
});
