/**
 * Aerospace small-craft crew quarters invariants.
 *
 * Standard quarters: 5 t/crew. Steerage: 3 t/passenger or marine.
 * Minimum crew per tonnage bracket: ≤100 t = 3, ≤150 t = 4, ≤200 t = 6.
 */

import {
  makeSmallCraftCrew,
  minSmallCraftCrew,
  quartersWeight,
  STANDARD_QUARTERS_TONS_PER_CREW,
  STEERAGE_QUARTERS_TONS_PER_PERSON,
} from '../crewCalculations';

describe('quarters constants', () => {
  it('exposes the canonical 5/3 tonnage rates', () => {
    expect(STANDARD_QUARTERS_TONS_PER_CREW).toBe(5);
    expect(STEERAGE_QUARTERS_TONS_PER_PERSON).toBe(3);
  });
});

describe('minSmallCraftCrew (tonnage bracket → min crew)', () => {
  it('returns 3 for ≤100 t small craft', () => {
    expect(minSmallCraftCrew(100)).toBe(3);
    expect(minSmallCraftCrew(50)).toBe(3);
  });

  it('returns 4 for >100 t up to 150 t', () => {
    expect(minSmallCraftCrew(101)).toBe(4);
    expect(minSmallCraftCrew(150)).toBe(4);
  });

  it('returns 6 for >150 t up to 200 t', () => {
    expect(minSmallCraftCrew(151)).toBe(6);
    expect(minSmallCraftCrew(200)).toBe(6);
  });

  it('returns 6 (safe fallback) for >200 t', () => {
    expect(minSmallCraftCrew(300)).toBe(6);
  });
});

describe('quartersWeight (crew × 5 + passengers × 3 + marines × 3)', () => {
  it('charges 5 t per crew member', () => {
    const w = quartersWeight({
      crew: 4,
      passengers: 0,
      marines: 0,
      quartersTons: 0,
    });
    expect(w).toBe(20);
  });

  it('charges 3 t per passenger and marine (steerage shares the rate)', () => {
    const w = quartersWeight({
      crew: 0,
      passengers: 4,
      marines: 4,
      quartersTons: 0,
    });
    expect(w).toBe(24);
  });

  it('sums all categories', () => {
    const w = quartersWeight({
      crew: 3,
      passengers: 5,
      marines: 2,
      quartersTons: 0,
    });
    // 3×5 + 5×3 + 2×3 = 15 + 15 + 6 = 36
    expect(w).toBe(36);
  });
});

describe('makeSmallCraftCrew', () => {
  it('returns an ISmallCraftCrew with computed quartersTons', () => {
    const c = makeSmallCraftCrew(3, 4, 1);
    // 3×5 + 4×3 + 1×3 = 15 + 12 + 3 = 30
    expect(c.quartersTons).toBe(30);
    expect(c.crew).toBe(3);
    expect(c.passengers).toBe(4);
    expect(c.marines).toBe(1);
  });
});
