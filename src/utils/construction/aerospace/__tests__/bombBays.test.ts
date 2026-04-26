/**
 * Aerospace small-craft bomb bay invariants.
 *
 * Per bay tonnage = capacityBombs + 1 t structure.
 * Aggregate cap = floor(unitTonnage / 2).
 * Bays are legal only on small craft.
 */

import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import {
  BAY_STRUCTURE_TONS,
  bayTons,
  BOMB_BAY_TONNAGE_FRACTION,
  maxBombBayTons,
  totalBombBayTons,
  totalBombCapacity,
  validateBombBays,
  type IBombBay,
} from '../bombBays';

describe('bomb bay constants', () => {
  it('charges 1 ton structure per bay', () => {
    expect(BAY_STRUCTURE_TONS).toBe(1);
  });
  it('caps aggregate bay tonnage at half of unit tonnage', () => {
    expect(BOMB_BAY_TONNAGE_FRACTION).toBe(0.5);
  });
});

describe('bayTons (single bay)', () => {
  it('returns capacityBombs + 1 t structure', () => {
    expect(bayTons({ id: 'a', capacityBombs: 5 })).toBe(6);
    expect(bayTons({ id: 'b', capacityBombs: 0 })).toBe(1);
  });

  it('clamps negative capacity to zero (bay still costs 1 t)', () => {
    expect(bayTons({ id: 'c', capacityBombs: -3 })).toBe(1);
  });
});

describe('totalBombBayTons / totalBombCapacity', () => {
  const bays: IBombBay[] = [
    { id: 'a', capacityBombs: 5 },
    { id: 'b', capacityBombs: 3 },
  ];

  it('sums per-bay tonnage', () => {
    // 6 + 4 = 10 t
    expect(totalBombBayTons(bays)).toBe(10);
  });

  it('sums per-bay bomb capacity (excluding structure overhead)', () => {
    expect(totalBombCapacity(bays)).toBe(8);
  });
});

describe('maxBombBayTons (aggregate cap)', () => {
  it('returns floor(tonnage / 2) for small craft', () => {
    expect(maxBombBayTons(200, AerospaceSubType.SMALL_CRAFT)).toBe(100);
    expect(maxBombBayTons(101, AerospaceSubType.SMALL_CRAFT)).toBe(50);
  });

  it('returns 0 for non-small-craft sub-types', () => {
    expect(maxBombBayTons(200, AerospaceSubType.AEROSPACE_FIGHTER)).toBe(0);
    expect(maxBombBayTons(50, AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(0);
  });
});

describe('validateBombBays (VAL-AERO-BOMB-BAY)', () => {
  it('allows zero bays on any sub-type', () => {
    expect(
      validateBombBays([], 50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toEqual([]);
    expect(validateBombBays([], 200, AerospaceSubType.SMALL_CRAFT)).toEqual([]);
  });

  it('rejects bays on ASF / CF (only SC may declare bays)', () => {
    const errs = validateBombBays(
      [{ id: 'a', capacityBombs: 5 }],
      50,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].ruleId).toBe('VAL-AERO-BOMB-BAY');
  });

  it('flags negative or non-integer capacities', () => {
    const errs = validateBombBays(
      [{ id: 'a', capacityBombs: -1 }],
      200,
      AerospaceSubType.SMALL_CRAFT,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toMatch(/non-negative integer/);
  });

  it('flags aggregate tonnage that exceeds floor(tonnage/2)', () => {
    const errs = validateBombBays(
      [{ id: 'a', capacityBombs: 60 }], // 60 + 1 = 61 t
      100, // cap = 50 t
      AerospaceSubType.SMALL_CRAFT,
    );
    expect(errs.some((e) => /exceeds cap/.test(e.message))).toBe(true);
  });

  it('returns empty array when bays fit within the cap', () => {
    const errs = validateBombBays(
      [{ id: 'a', capacityBombs: 5 }], // 6 t
      200, // cap = 100 t
      AerospaceSubType.SMALL_CRAFT,
    );
    expect(errs).toEqual([]);
  });
});
