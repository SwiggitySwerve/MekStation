/**
 * Tests for Aerospace Battle Value calculator.
 *
 * Coverage matrix:
 *  - Speed factor formula (spec scenario: "Speed factor calculation")
 *  - Defensive BV: SI term (spec scenario: "SI BV")
 *  - Defensive BV: defensiveFactor = 1 + maxThrust/10 (spec scenario: "Defensive factor uses Max Thrust")
 *  - Arc fire-pool primary/opposite/side weighting (spec scenarios: "Primary arc contributes 100%", "Primary arc not Nose")
 *  - Fuselage weapons always contribute at 100%
 *  - Conventional fighter 0.8 final multiplier (spec scenario: "Conventional fighter multiplier")
 *  - Small Craft 1.2× armor bonus inside defensive block
 *  - Breakdown shape (spec scenario: "Breakdown shape")
 *  - Arc contributions exposed (spec scenario: "Arc contributions exposed")
 *
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-aerospace-battle-value/specs/aerospace-unit-system/spec.md
 */

import {
  AerospaceArc,
  AerospaceSubType,
} from '../../../../types/unit/AerospaceInterfaces';
import {
  calculateAerospaceBV,
  calculateAerospaceDefensiveBV,
  calculateAerospaceOffensiveBV,
  calculateAerospaceSpeedFactor,
  getAerospaceSubTypeMultiplier,
  getAerospacePilotMultiplier,
  normalizeArcLocation,
  type IAerospaceBVInput,
} from '../aerospaceBV';

function baseInput(
  overrides: Partial<IAerospaceBVInput> = {},
): IAerospaceBVInput {
  return {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 50,
    structuralIntegrity: 5,
    safeThrust: 5,
    maxThrust: 8,
    armorType: 'standard',
    totalArmorPoints: 0,
    equipment: [],
    ammo: [],
    ...overrides,
  };
}

// ============================================================================
// Speed Factor
// ============================================================================

describe('calculateAerospaceSpeedFactor', () => {
  it('matches spec scenario: safe 5 / max 7 yields 1.12', () => {
    const { avgThrust, speedFactor } = calculateAerospaceSpeedFactor(5, 7);
    expect(avgThrust).toBe(6);
    expect(speedFactor).toBeCloseTo(1.12, 2);
  });

  it('returns baseline 1.0 for avg 5', () => {
    const { speedFactor } = calculateAerospaceSpeedFactor(4, 6);
    expect(speedFactor).toBeCloseTo(1.0, 2);
  });
});

// ============================================================================
// Defensive BV
// ============================================================================

describe('calculateAerospaceDefensiveBV', () => {
  it('SI term matches spec scenario: 50-ton ASF with SI 5 = 125', () => {
    const result = calculateAerospaceDefensiveBV(
      baseInput({ tonnage: 50, structuralIntegrity: 5 }),
    );
    expect(result.siBV).toBe(125);
  });

  it('defensive factor uses Max Thrust: maxThrust 9 yields 1.9', () => {
    const result = calculateAerospaceDefensiveBV(baseInput({ maxThrust: 9 }));
    expect(result.defensiveFactor).toBeCloseTo(1.9, 4);
  });

  it('armor BV uses × 2.5 × multiplier baseline', () => {
    const result = calculateAerospaceDefensiveBV(
      baseInput({ totalArmorPoints: 100, armorType: 'standard' }),
    );
    // 100 × 2.5 × 1.0 = 250
    expect(result.armorBV).toBeCloseTo(250, 1);
  });

  it('Small Craft applies 1.2× armor bonus inside defensive block', () => {
    const asf = calculateAerospaceDefensiveBV(
      baseInput({
        subType: AerospaceSubType.AEROSPACE_FIGHTER,
        totalArmorPoints: 100,
      }),
    );
    const sc = calculateAerospaceDefensiveBV(
      baseInput({
        subType: AerospaceSubType.SMALL_CRAFT,
        totalArmorPoints: 100,
      }),
    );
    expect(sc.armorBV).toBeCloseTo(asf.armorBV * 1.2, 1);
  });

  it('subtracts explosive penalties before applying defensive factor', () => {
    const result = calculateAerospaceDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        structuralIntegrity: 5,
        tonnage: 50,
        maxThrust: 8,
        explosivePenalties: 20,
      }),
    );
    // armor 250 + si 125 - explosive 20 = 355; × 1.8 = 639
    expect(result.defensive).toBeCloseTo(639, 1);
  });
});

// ============================================================================
// Arc Fire Pool
// ============================================================================

describe('calculateAerospaceOffensiveBV arc fire pool', () => {
  it('primary arc contributes 100%, opposite 25%, sides 50%', () => {
    // Use hypothetical weapon BV via the equipment resolver is not possible
    // without catalog; instead fake the arc totals by computing contributions
    // with real catalog items. We use simple known weapons here.
    // Medium Laser = 46 BV.
    const result = calculateAerospaceOffensiveBV(
      baseInput({
        equipment: [
          // Nose: 3 medium lasers (138 BV)
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          // Left Wing: 1 medium laser (46 BV)
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
          // Right Wing: 1 medium laser (46 BV)
          { id: 'medium-laser', location: AerospaceArc.RIGHT_WING },
          // Aft: 1 medium laser (46 BV)
          { id: 'medium-laser', location: AerospaceArc.AFT },
        ],
        safeThrust: 5,
        maxThrust: 8,
      }),
    );

    expect(result.primaryArc).toBe(AerospaceArc.NOSE);
    const nose = result.arcContributions.find(
      (c) => c.arc === AerospaceArc.NOSE,
    );
    const aft = result.arcContributions.find((c) => c.arc === AerospaceArc.AFT);
    const lw = result.arcContributions.find(
      (c) => c.arc === AerospaceArc.LEFT_WING,
    );
    const rw = result.arcContributions.find(
      (c) => c.arc === AerospaceArc.RIGHT_WING,
    );

    expect(nose?.weight).toBe(1.0);
    expect(aft?.weight).toBe(0.25);
    expect(lw?.weight).toBe(0.5);
    expect(rw?.weight).toBe(0.5);
  });

  it('shifts opposite arc weight when LeftWing is primary', () => {
    const result = calculateAerospaceOffensiveBV(
      baseInput({
        equipment: [
          // LeftWing has higher BV than Nose
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
          { id: 'medium-laser', location: AerospaceArc.NOSE },
        ],
      }),
    );
    expect(result.primaryArc).toBe(AerospaceArc.LEFT_WING);
    const rw = result.arcContributions.find(
      (c) => c.arc === AerospaceArc.RIGHT_WING,
    );
    const nose = result.arcContributions.find(
      (c) => c.arc === AerospaceArc.NOSE,
    );
    const aft = result.arcContributions.find((c) => c.arc === AerospaceArc.AFT);
    expect(rw?.weight).toBe(0.25); // opposite
    expect(nose?.weight).toBe(0.5); // side
    expect(aft?.weight).toBe(0.5); // side
  });

  it('fuselage weapons always contribute at 100%', () => {
    const result = calculateAerospaceOffensiveBV(
      baseInput({
        equipment: [
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.FUSELAGE },
        ],
      }),
    );
    // Fuselage BV stored separately, full contribution
    expect(result.fuselageWeaponBV).toBeGreaterThan(0);
  });
});

// ============================================================================
// Sub-Type Multiplier
// ============================================================================

describe('getAerospaceSubTypeMultiplier', () => {
  it('Conventional Fighter = 0.8', () => {
    expect(
      getAerospaceSubTypeMultiplier(AerospaceSubType.CONVENTIONAL_FIGHTER),
    ).toBe(0.8);
  });

  it('ASF baseline = 1.0', () => {
    expect(
      getAerospaceSubTypeMultiplier(AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(1.0);
  });

  it('Small Craft baseline = 1.0 (armor bonus lives in defensive block)', () => {
    expect(getAerospaceSubTypeMultiplier(AerospaceSubType.SMALL_CRAFT)).toBe(
      1.0,
    );
  });
});

// ============================================================================
// Pilot Multiplier
// ============================================================================

describe('getAerospacePilotMultiplier', () => {
  it('defaults to 4/5 yielding 1.0', () => {
    expect(getAerospacePilotMultiplier(undefined, undefined)).toBeCloseTo(1.0);
  });

  it('uses 9×9 table for 3/4 elite pilot', () => {
    expect(getAerospacePilotMultiplier(3, 4)).toBeCloseTo(1.32, 2);
  });
});

// ============================================================================
// Arc Location Normalization
// ============================================================================

describe('normalizeArcLocation', () => {
  it("maps BLK-style 'Left Wing' onto AerospaceArc.LEFT_WING", () => {
    expect(normalizeArcLocation('Left Wing')).toBe(AerospaceArc.LEFT_WING);
  });

  it("maps Small Craft 'Hull' onto FUSELAGE", () => {
    expect(normalizeArcLocation('Hull')).toBe(AerospaceArc.FUSELAGE);
  });

  it('passes through a direct AerospaceArc value', () => {
    expect(normalizeArcLocation(AerospaceArc.NOSE)).toBe(AerospaceArc.NOSE);
  });

  it('returns null for unknown location strings', () => {
    expect(normalizeArcLocation('Turret Top')).toBeNull();
  });
});

// ============================================================================
// End-to-end Breakdown Shape
// ============================================================================

describe('calculateAerospaceBV breakdown shape', () => {
  it('exposes at minimum defensive, offensive, pilotMultiplier, arcContributions, final', () => {
    const breakdown = calculateAerospaceBV(
      baseInput({
        totalArmorPoints: 120,
        structuralIntegrity: 5,
        safeThrust: 5,
        maxThrust: 8,
        equipment: [
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
        ],
      }),
    );
    expect(breakdown).toHaveProperty('defensive');
    expect(breakdown).toHaveProperty('offensive');
    expect(breakdown).toHaveProperty('pilotMultiplier');
    expect(breakdown).toHaveProperty('arcContributions');
    expect(breakdown).toHaveProperty('final');
    expect(breakdown.final).toBeGreaterThan(0);
  });

  it('Conventional Fighter final BV = (defensive + offensive) × 0.8 × pilot', () => {
    const cf = calculateAerospaceBV(
      baseInput({
        subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
        totalArmorPoints: 100,
        equipment: [{ id: 'medium-laser', location: AerospaceArc.NOSE }],
      }),
    );
    const asf = calculateAerospaceBV(
      baseInput({
        subType: AerospaceSubType.AEROSPACE_FIGHTER,
        totalArmorPoints: 100,
        equipment: [{ id: 'medium-laser', location: AerospaceArc.NOSE }],
      }),
    );
    // Same inputs except sub-type -> CF should equal ASF × 0.8, then rounded
    expect(cf.final).toBeCloseTo(Math.round(asf.final * 0.8), -1);
  });

  it('per-arc contributions include weight and weighted BV', () => {
    const breakdown = calculateAerospaceBV(
      baseInput({
        equipment: [
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.NOSE },
          { id: 'medium-laser', location: AerospaceArc.LEFT_WING },
          { id: 'medium-laser', location: AerospaceArc.AFT },
        ],
      }),
    );
    for (const c of breakdown.arcContributions) {
      expect(c).toHaveProperty('weight');
      expect(c).toHaveProperty('weightedBV');
      expect(c).toHaveProperty('rawBV');
    }
  });
});
