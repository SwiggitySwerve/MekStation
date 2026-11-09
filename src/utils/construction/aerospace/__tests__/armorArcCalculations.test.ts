/**
 * Aerospace per-arc armor allocation invariants.
 *
 * Existing fighter factors stay stable. Small-craft locations have no
 * independent maximum; their SI-based total is owned by armor.ts.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  arcMaxMap,
  ASF_CF_ARCS,
  getArcsForSubType,
  mapAerospaceLocationToArc,
  maxArcArmorPoints,
  maxArcArmorPointsForLocation,
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

  it('has no independent limit on small-craft sides', () => {
    expect(maxArcArmorPoints(AerospaceArc.LEFT_SIDE, 200, subType)).toBeNull();
    expect(maxArcArmorPoints(AerospaceArc.RIGHT_SIDE, 200, subType)).toBeNull();
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

  it('requires more than tonnage to determine a small-craft total', () => {
    // 200 t SC: 56 + 40 + 40 + 24 = 160
    expect(maxTotalArmorPoints(200, AerospaceSubType.SMALL_CRAFT)).toBeNull();
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

  it('exposes no independent small-craft arc limits', () => {
    const map = arcMaxMap(200, AerospaceSubType.SMALL_CRAFT);
    for (const arc of SMALL_CRAFT_ARCS) expect(map[arc]).toBeNull();
  });
});

// =============================================================================
// Enum bridge — AerospaceLocation (UI) → AerospaceArc (construction)
// =============================================================================

describe('mapAerospaceLocationToArc', () => {
  it('maps every AerospaceLocation member to the corresponding AerospaceArc', () => {
    expect(mapAerospaceLocationToArc(AerospaceLocation.NOSE)).toBe(
      AerospaceArc.NOSE,
    );
    expect(mapAerospaceLocationToArc(AerospaceLocation.LEFT_WING)).toBe(
      AerospaceArc.LEFT_WING,
    );
    expect(mapAerospaceLocationToArc(AerospaceLocation.RIGHT_WING)).toBe(
      AerospaceArc.RIGHT_WING,
    );
    expect(mapAerospaceLocationToArc(AerospaceLocation.AFT)).toBe(
      AerospaceArc.AFT,
    );
    expect(mapAerospaceLocationToArc(AerospaceLocation.FUSELAGE)).toBe(
      AerospaceArc.FUSELAGE,
    );
  });
});

describe('maxArcArmorPointsForLocation — caps drop from 10× misleading display', () => {
  // Audit findings (docs/audits/2026-05-13-customizer-armor-megameklab-parity.md):
  // The diagram previously displayed `tonnage * 8 * arcShare` caps — 10× the
  // construction-spec values. Post-PR2 the diagram uses these utility values.
  it('50t ASF nose max = 14 (was 140 in old diagram)', () => {
    expect(
      maxArcArmorPointsForLocation(
        AerospaceLocation.NOSE,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(14);
  });

  it('50t ASF wing maxes = 10 each (was 100 in old diagram)', () => {
    expect(
      maxArcArmorPointsForLocation(
        AerospaceLocation.LEFT_WING,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(10);
    expect(
      maxArcArmorPointsForLocation(
        AerospaceLocation.RIGHT_WING,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(10);
  });

  it('50t ASF aft max = 6 (was 60 in old diagram)', () => {
    expect(
      maxArcArmorPointsForLocation(
        AerospaceLocation.AFT,
        50,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(6);
  });

  it('100t ASF totals match maxTotalArmorPoints (28+20+20+12=80)', () => {
    const nose = maxArcArmorPointsForLocation(
      AerospaceLocation.NOSE,
      100,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    const lw = maxArcArmorPointsForLocation(
      AerospaceLocation.LEFT_WING,
      100,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    const rw = maxArcArmorPointsForLocation(
      AerospaceLocation.RIGHT_WING,
      100,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    const aft = maxArcArmorPointsForLocation(
      AerospaceLocation.AFT,
      100,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    const maxima = [nose, lw, rw, aft];
    expect(maxima).not.toContain(null);
    expect(maxima.reduce<number>((sum, max) => sum + (max ?? 0), 0)).toBe(
      maxTotalArmorPoints(100, AerospaceSubType.AEROSPACE_FIGHTER),
    );
  });

  it('maps stored Wing keys to Side arcs without imposing a location cap', () => {
    expect(
      mapAerospaceLocationToArc(
        AerospaceLocation.LEFT_WING,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toBe(AerospaceArc.LEFT_SIDE);
    expect(
      mapAerospaceLocationToArc(
        AerospaceLocation.RIGHT_WING,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toBe(AerospaceArc.RIGHT_SIDE);
    for (const location of [
      AerospaceLocation.NOSE,
      AerospaceLocation.LEFT_WING,
      AerospaceLocation.RIGHT_WING,
      AerospaceLocation.AFT,
    ]) {
      expect(
        maxArcArmorPointsForLocation(
          location,
          200,
          AerospaceSubType.SMALL_CRAFT,
        ),
      ).toBeNull();
    }
  });
});
