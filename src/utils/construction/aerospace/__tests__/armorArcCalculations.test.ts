/**
 * Aerospace per-arc armor allocation invariants.
 *
 * Each arc has a tonnage-multiplier:
 *   ASF/CF: Nose 0.28, LWing/RWing 0.20, Aft 0.12, Sides 0
 *   SmallCraft: Nose 0.28, LSide/RSide 0.20, Aft 0.12, Wings 0
 * maxArcArmorPoints = floor(tonnage × factor).
 */

import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  arcMaxMap,
  ASF_CF_ARCS,
  getArcsForSubType,
  maxArcArmorPoints,
  maxTotalArmorPoints,
  SMALL_CRAFT_ARCS,
} from '../armorArcCalculations';

describe('getArcsForSubType', () => {
  it('returns wing arcs for ASF and CF', () => {
    expect(getArcsForSubType(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(
      ASF_CF_ARCS,
    );
    expect(getArcsForSubType(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(
      ASF_CF_ARCS,
    );
  });

  it('returns side arcs for small craft (no wings)', () => {
    expect(getArcsForSubType(AerospaceSubType.SMALL_CRAFT)).toBe(
      SMALL_CRAFT_ARCS,
    );
  });

  it('exposes the canonical 4-arc set for ASF/CF (Nose, LWing, RWing, Aft)', () => {
    expect(ASF_CF_ARCS).toEqual([
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_WING,
      AerospaceArc.RIGHT_WING,
      AerospaceArc.AFT,
    ]);
  });
});

describe('maxArcArmorPoints — ASF/CF', () => {
  const subType = AerospaceSubType.AEROSPACE_FIGHTER;

  it('Nose = floor(tonnage × 0.28)', () => {
    expect(maxArcArmorPoints(AerospaceArc.NOSE, 50, subType)).toBe(14); // 14.0
    expect(maxArcArmorPoints(AerospaceArc.NOSE, 100, subType)).toBe(28);
  });

  it('Wings = floor(tonnage × 0.20)', () => {
    expect(maxArcArmorPoints(AerospaceArc.LEFT_WING, 50, subType)).toBe(10);
    expect(maxArcArmorPoints(AerospaceArc.RIGHT_WING, 75, subType)).toBe(15);
  });

  it('Aft = floor(tonnage × 0.12)', () => {
    expect(maxArcArmorPoints(AerospaceArc.AFT, 50, subType)).toBe(6); // 6.0
    expect(maxArcArmorPoints(AerospaceArc.AFT, 100, subType)).toBe(12);
  });

  it('returns 0 for sides on ASF (sides are small-craft only)', () => {
    expect(maxArcArmorPoints(AerospaceArc.LEFT_SIDE, 50, subType)).toBe(0);
    expect(maxArcArmorPoints(AerospaceArc.RIGHT_SIDE, 50, subType)).toBe(0);
  });
});

describe('maxArcArmorPoints — small craft', () => {
  const subType = AerospaceSubType.SMALL_CRAFT;

  it('uses sides instead of wings (0.20 factor)', () => {
    expect(maxArcArmorPoints(AerospaceArc.LEFT_SIDE, 200, subType)).toBe(40);
    expect(maxArcArmorPoints(AerospaceArc.RIGHT_SIDE, 200, subType)).toBe(40);
  });

  it('returns 0 for wings on small craft', () => {
    expect(maxArcArmorPoints(AerospaceArc.LEFT_WING, 200, subType)).toBe(0);
    expect(maxArcArmorPoints(AerospaceArc.RIGHT_WING, 200, subType)).toBe(0);
  });
});

describe('maxTotalArmorPoints', () => {
  it('sums all arcs for ASF (Nose + LWing + RWing + Aft)', () => {
    // 100 t ASF: 28 + 20 + 20 + 12 = 80
    expect(maxTotalArmorPoints(100, AerospaceSubType.AEROSPACE_FIGHTER)).toBe(
      80,
    );
  });

  it('sums all arcs for small craft (Nose + LSide + RSide + Aft)', () => {
    // 200 t SC: 56 + 40 + 40 + 24 = 160
    expect(maxTotalArmorPoints(200, AerospaceSubType.SMALL_CRAFT)).toBe(160);
  });
});

describe('arcMaxMap', () => {
  it('returns a per-arc map matching maxArcArmorPoints', () => {
    const map = arcMaxMap(50, AerospaceSubType.AEROSPACE_FIGHTER);
    expect(map[AerospaceArc.NOSE]).toBe(14);
    expect(map[AerospaceArc.LEFT_WING]).toBe(10);
    expect(map[AerospaceArc.RIGHT_WING]).toBe(10);
    expect(map[AerospaceArc.AFT]).toBe(6);
  });
});
