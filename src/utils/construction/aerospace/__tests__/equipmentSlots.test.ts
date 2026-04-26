/**
 * Aerospace per-arc slot-limit invariants.
 *
 * Slot limits per arc:
 *   Nose:        6
 *   LWing/RWing: 6
 *   LSide/RSide: 6
 *   Aft:         4
 *   Fuselage:    unlimited (null)
 */

import { AerospaceArc } from '@/types/unit/AerospaceInterfaces';

import {
  arcSlotAvailable,
  arcSlotLimit,
  countItemsPerArc,
  overLimitArcs,
} from '../equipmentSlots';

describe('arcSlotLimit', () => {
  it('returns 6 for Nose, Wings, and Sides', () => {
    expect(arcSlotLimit(AerospaceArc.NOSE)).toBe(6);
    expect(arcSlotLimit(AerospaceArc.LEFT_WING)).toBe(6);
    expect(arcSlotLimit(AerospaceArc.RIGHT_WING)).toBe(6);
    expect(arcSlotLimit(AerospaceArc.LEFT_SIDE)).toBe(6);
    expect(arcSlotLimit(AerospaceArc.RIGHT_SIDE)).toBe(6);
  });

  it('returns 4 for Aft (canonical aerospace rule)', () => {
    expect(arcSlotLimit(AerospaceArc.AFT)).toBe(4);
  });

  it('returns null for Fuselage (unlimited)', () => {
    expect(arcSlotLimit(AerospaceArc.FUSELAGE)).toBeNull();
  });
});

describe('arcSlotAvailable', () => {
  it('allows mounting up to but not past the cap', () => {
    expect(arcSlotAvailable(AerospaceArc.AFT, 0)).toBe(true);
    expect(arcSlotAvailable(AerospaceArc.AFT, 3)).toBe(true);
    expect(arcSlotAvailable(AerospaceArc.AFT, 4)).toBe(false);
    expect(arcSlotAvailable(AerospaceArc.AFT, 100)).toBe(false);
  });

  it('always returns true for fuselage (no slot cap)', () => {
    expect(arcSlotAvailable(AerospaceArc.FUSELAGE, 0)).toBe(true);
    expect(arcSlotAvailable(AerospaceArc.FUSELAGE, 999)).toBe(true);
  });
});

describe('countItemsPerArc', () => {
  it('aggregates equipment counts by location', () => {
    const counts = countItemsPerArc([
      { location: AerospaceArc.NOSE },
      { location: AerospaceArc.NOSE },
      { location: AerospaceArc.NOSE },
      { location: AerospaceArc.AFT },
    ]);
    expect(counts.get(AerospaceArc.NOSE)).toBe(3);
    expect(counts.get(AerospaceArc.AFT)).toBe(1);
  });

  it('returns an empty map for no equipment', () => {
    expect(countItemsPerArc([]).size).toBe(0);
  });
});

describe('overLimitArcs', () => {
  it('flags the Aft arc when 5+ items are mounted (cap is 4)', () => {
    const equipment = Array.from({ length: 5 }, () => ({
      location: AerospaceArc.AFT,
    }));
    expect(overLimitArcs(equipment)).toEqual([AerospaceArc.AFT]);
  });

  it('returns no violations when caps are respected', () => {
    const equipment = [
      ...Array.from({ length: 4 }, () => ({ location: AerospaceArc.AFT })),
      ...Array.from({ length: 6 }, () => ({ location: AerospaceArc.NOSE })),
    ];
    expect(overLimitArcs(equipment)).toEqual([]);
  });

  it('does not flag fuselage even with massive item counts', () => {
    const equipment = Array.from({ length: 100 }, () => ({
      location: AerospaceArc.FUSELAGE,
    }));
    expect(overLimitArcs(equipment)).toEqual([]);
  });
});
