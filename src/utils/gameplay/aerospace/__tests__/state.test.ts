/**
 * Aerospace combat-state helper tests.
 *
 * Covers `clampSI` per the aerospace-unit-system spec requirement that
 * `currentSI` is capped at `maxSI` after a repair / bonus event.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/aerospace-unit-system/spec.md
 */

import { clampSI, createAerospaceCombatState } from '../state';

/**
 * Build a minimal but realistic aerospace combat state. Mirrors the fixture
 * shape used in `damage.test.ts` so the two suites stay in lock-step.
 */
function makeState() {
  return createAerospaceCombatState({
    maxSI: 6,
    armorByArc: {
      nose: 20,
      leftWing: 15,
      rightWing: 15,
      aft: 10,
    },
    heatSinks: 10,
    fuelPoints: 20,
    safeThrust: 6,
    maxThrust: 9,
  });
}

describe('clampSI', () => {
  it('caps currentSI at maxSI when exceeded', () => {
    const base = makeState();
    const inflated = { ...base, currentSI: 99 };
    const clamped = clampSI(inflated);
    expect(clamped.currentSI).toBe(base.maxSI);
  });

  it('is a no-op when currentSI is already at maxSI', () => {
    const state = makeState();
    // currentSI === maxSI by construction; clampSI must return the same ref.
    expect(clampSI(state)).toBe(state);
  });

  it('is a no-op when currentSI is below maxSI', () => {
    const damaged = { ...makeState(), currentSI: 3 };
    expect(clampSI(damaged)).toBe(damaged);
  });

  it('does not mutate the input when clamping', () => {
    const inflated = { ...makeState(), currentSI: 999 };
    const before = inflated.currentSI;
    clampSI(inflated);
    // Source state must be untouched — clampSI returns a new object.
    expect(inflated.currentSI).toBe(before);
  });

  it('returns a new object reference when clamping is needed', () => {
    const inflated = { ...makeState(), currentSI: 7 };
    const clamped = clampSI(inflated);
    expect(clamped).not.toBe(inflated);
    expect(clamped.currentSI).toBe(inflated.maxSI);
  });
});
