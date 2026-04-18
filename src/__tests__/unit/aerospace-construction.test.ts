/**
 * Aerospace Construction Tests
 *
 * Covers all VAL-AERO-* validation rules plus happy-path scenarios for each
 * construction calculator. Named scenarios map to canonical BattleTech units:
 *
 *   Shilone SL-17   — 65t ASF, Fusion, thrust 5
 *   Stuka STU-K5    — 100t ASF, Fusion, thrust 4
 *   Sparrowhawk SPR-H5 — 30t Conventional Fighter, ICE, thrust 7
 *   Seeker (shuttle) — 100t Small Craft, Fusion, crew 3
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

import {
  AerospaceArc,
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
// ============================================================================
// Calculator imports
// ============================================================================
import {
  maxArcArmorPoints,
  maxTotalArmorPoints,
  getArcsForSubType,
  ASF_CF_ARCS,
  SMALL_CRAFT_ARCS,
} from '@/utils/construction/aerospace/armorArcCalculations';
import {
  makeSmallCraftCrew,
  quartersWeight,
  minSmallCraftCrew,
} from '@/utils/construction/aerospace/crewCalculations';
import { aerospaceEngineWeight } from '@/utils/construction/aerospace/engineWeightAerospace';
import {
  calculateFuelPoints,
  FUEL_POINTS_PER_TON,
  FUEL_MINIMUM_TONS,
  minFuelTons,
} from '@/utils/construction/aerospace/fuelCalculations';
import {
  defaultSI,
  maxSI,
  siWeightCost,
} from '@/utils/construction/aerospace/siCalculations';
import {
  calculateSafeThrust,
  calculateMaxThrust,
  getMaxSafeThrust,
  isEngineLegalForSubType,
} from '@/utils/construction/aerospace/thrustCalculations';
// ============================================================================
// Validation imports
// ============================================================================
import {
  validateAerospaceUnit,
  validateTonnage,
  validateThrust,
  validateSI,
  validateFuel,
  validateArcArmor,
  validateCrew,
} from '@/utils/construction/aerospace/validationRules';

// ============================================================================
// Helpers
// ============================================================================

/** Build a valid Shilone ASF input (65t, Fusion, thrust 5) */
function shiloneInput() {
  return {
    tonnage: 65,
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    engineType: AerospaceEngineType.FUSION,
    safeThrust: 5,
    structuralIntegrity: 7, // ceil(65/10) = 7
    fuelTons: 5,
    arcArmor: {
      [AerospaceArc.NOSE]: 10,
      [AerospaceArc.LEFT_WING]: 8,
      [AerospaceArc.RIGHT_WING]: 8,
      [AerospaceArc.AFT]: 4,
    },
    quartersTons: 0,
    crewCount: 0,
  };
}

/** Build a valid Stuka ASF input (100t, Fusion, thrust 4) */
function stukaInput() {
  return {
    tonnage: 100,
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    engineType: AerospaceEngineType.FUSION,
    safeThrust: 4,
    structuralIntegrity: 10, // ceil(100/10) = 10
    fuelTons: 5,
    arcArmor: {
      [AerospaceArc.NOSE]: 16,
      [AerospaceArc.LEFT_WING]: 10,
      [AerospaceArc.RIGHT_WING]: 10,
      [AerospaceArc.AFT]: 8,
    },
    quartersTons: 0,
    crewCount: 0,
  };
}

/** Build a valid Sparrowhawk CF input (30t, ICE, thrust 7) */
function sparrowhawkInput() {
  return {
    tonnage: 30,
    subType: AerospaceSubType.CONVENTIONAL_FIGHTER,
    engineType: AerospaceEngineType.ICE,
    safeThrust: 7,
    structuralIntegrity: 3, // ceil(30/10) = 3
    fuelTons: 2,
    arcArmor: {
      [AerospaceArc.NOSE]: 5,
      [AerospaceArc.LEFT_WING]: 3,
      [AerospaceArc.RIGHT_WING]: 3,
      [AerospaceArc.AFT]: 2,
    },
    quartersTons: 0,
    crewCount: 0,
  };
}

/** Build a valid Seeker small craft input (100t, Fusion, crew 3) */
function seekerInput() {
  return {
    tonnage: 100,
    subType: AerospaceSubType.SMALL_CRAFT,
    engineType: AerospaceEngineType.FUSION,
    safeThrust: 3,
    structuralIntegrity: 10, // ceil(100/10) = 10
    fuelTons: 20,
    arcArmor: {
      [AerospaceArc.NOSE]: 20,
      [AerospaceArc.LEFT_SIDE]: 14,
      [AerospaceArc.RIGHT_SIDE]: 14,
      [AerospaceArc.AFT]: 8,
    },
    quartersTons: 15, // 3 crew × 5t
    crewCount: 3,
  };
}

// ============================================================================
// thrustCalculations
// ============================================================================

describe('thrustCalculations', () => {
  describe('calculateSafeThrust', () => {
    it('Shilone: 65t × thrust 5 → engineRating 325 → safeThrust 5', () => {
      // engineRating = 65 × 5 = 325; floor(325/65) = 5
      expect(
        calculateSafeThrust(325, 65, AerospaceSubType.AEROSPACE_FIGHTER),
      ).toBe(5);
    });

    it('Stuka: 100t × thrust 4 → engineRating 400 → safeThrust 4', () => {
      expect(
        calculateSafeThrust(400, 100, AerospaceSubType.AEROSPACE_FIGHTER),
      ).toBe(4);
    });

    it('Sparrowhawk: 30t × thrust 7 → engineRating 210 → safeThrust 7', () => {
      expect(
        calculateSafeThrust(210, 30, AerospaceSubType.CONVENTIONAL_FIGHTER),
      ).toBe(7);
    });

    it('clamps safeThrust to sub-type cap (ASF cap=12)', () => {
      // rating would give 15 thrust but capped at 12
      expect(
        calculateSafeThrust(1500, 100, AerospaceSubType.AEROSPACE_FIGHTER),
      ).toBe(12);
    });

    it('small craft cap is 6', () => {
      expect(getMaxSafeThrust(AerospaceSubType.SMALL_CRAFT)).toBe(6);
    });
  });

  describe('calculateMaxThrust', () => {
    it('safeThrust 5 → maxThrust 7 (floor(5×1.5))', () => {
      expect(calculateMaxThrust(5)).toBe(7);
    });

    it('safeThrust 4 → maxThrust 6', () => {
      expect(calculateMaxThrust(4)).toBe(6);
    });

    it('safeThrust 7 → maxThrust 10', () => {
      expect(calculateMaxThrust(7)).toBe(10);
    });
  });

  describe('isEngineLegalForSubType', () => {
    it('Fusion is legal for ASF', () => {
      expect(
        isEngineLegalForSubType(
          AerospaceEngineType.FUSION,
          AerospaceSubType.AEROSPACE_FIGHTER,
        ),
      ).toBe(true);
    });

    it('ICE is illegal for ASF', () => {
      expect(
        isEngineLegalForSubType(
          AerospaceEngineType.ICE,
          AerospaceSubType.AEROSPACE_FIGHTER,
        ),
      ).toBe(false);
    });

    it('Fusion is illegal for CF (must use ICE or FuelCell)', () => {
      expect(
        isEngineLegalForSubType(
          AerospaceEngineType.FUSION,
          AerospaceSubType.CONVENTIONAL_FIGHTER,
        ),
      ).toBe(false);
    });

    it('ICE is legal for CF', () => {
      expect(
        isEngineLegalForSubType(
          AerospaceEngineType.ICE,
          AerospaceSubType.CONVENTIONAL_FIGHTER,
        ),
      ).toBe(true);
    });

    it('Fusion is legal for small craft', () => {
      expect(
        isEngineLegalForSubType(
          AerospaceEngineType.FUSION,
          AerospaceSubType.SMALL_CRAFT,
        ),
      ).toBe(true);
    });
  });
});

// ============================================================================
// siCalculations
// ============================================================================

describe('siCalculations', () => {
  it('defaultSI: 65t → ceil(65/10) = 7', () => {
    expect(defaultSI(65)).toBe(7);
  });

  it('defaultSI: 100t → 10', () => {
    expect(defaultSI(100)).toBe(10);
  });

  it('defaultSI: 30t → 3', () => {
    expect(defaultSI(30)).toBe(3);
  });

  it('maxSI: ASF → 20', () => {
    expect(maxSI(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(20);
  });

  it('maxSI: CF → 15', () => {
    expect(maxSI(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(15);
  });

  it('maxSI: small craft → 30', () => {
    expect(maxSI(AerospaceSubType.SMALL_CRAFT)).toBe(30);
  });

  it('siWeightCost: SI at default → 0 extra tons', () => {
    // Shilone: 65t, default SI = 7, cost for SI=7 → 0
    expect(siWeightCost(7, 65)).toBe(0);
  });

  it('siWeightCost: 1 extra SI on 65t unit → (1 extra) × (65/10) × 0.5 = 3.25t', () => {
    // SI=8 on 65t: extra=1, cost = 1 × 6.5 × 0.5 = 3.25
    expect(siWeightCost(8, 65)).toBeCloseTo(3.25);
  });
});

// ============================================================================
// fuelCalculations
// ============================================================================

describe('fuelCalculations', () => {
  it('Fusion: 5t → 400 fuel points (5 × 80)', () => {
    expect(calculateFuelPoints(5, AerospaceEngineType.FUSION)).toBe(400);
  });

  it('ICE: 2t → 80 fuel points (2 × 40)', () => {
    expect(calculateFuelPoints(2, AerospaceEngineType.ICE)).toBe(80);
  });

  it('FuelCell: 3t → 180 fuel points (3 × 60)', () => {
    expect(calculateFuelPoints(3, AerospaceEngineType.FUEL_CELL)).toBe(180);
  });

  it('XL uses same rate as Fusion (80 pts/ton)', () => {
    expect(FUEL_POINTS_PER_TON[AerospaceEngineType.XL]).toBe(80);
  });

  it('minFuelTons: ASF → 5t', () => {
    expect(minFuelTons(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(5);
  });

  it('minFuelTons: CF → 2t', () => {
    expect(minFuelTons(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(2);
  });

  it('minFuelTons: small craft → 20t', () => {
    expect(minFuelTons(AerospaceSubType.SMALL_CRAFT)).toBe(20);
  });

  it('Seeker: 20t Fusion → 1600 fuel points', () => {
    expect(calculateFuelPoints(20, AerospaceEngineType.FUSION)).toBe(1600);
  });
});

// ============================================================================
// armorArcCalculations
// ============================================================================

describe('armorArcCalculations', () => {
  it('ASF/CF arcs are [Nose, LeftWing, RightWing, Aft]', () => {
    expect(getArcsForSubType(AerospaceSubType.AEROSPACE_FIGHTER)).toEqual(
      ASF_CF_ARCS,
    );
    expect(getArcsForSubType(AerospaceSubType.CONVENTIONAL_FIGHTER)).toEqual(
      ASF_CF_ARCS,
    );
  });

  it('small craft arcs are [Nose, LeftSide, RightSide, Aft]', () => {
    expect(getArcsForSubType(AerospaceSubType.SMALL_CRAFT)).toEqual(
      SMALL_CRAFT_ARCS,
    );
  });

  it('Shilone 65t ASF nose max = floor(65 × 0.28) = 18', () => {
    expect(
      maxArcArmorPoints(
        AerospaceArc.NOSE,
        65,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(18);
  });

  it('Shilone 65t ASF wing max = floor(65 × 0.20) = 13', () => {
    expect(
      maxArcArmorPoints(
        AerospaceArc.LEFT_WING,
        65,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(13);
  });

  it('Shilone 65t ASF aft max = floor(65 × 0.12) = 7', () => {
    expect(
      maxArcArmorPoints(
        AerospaceArc.AFT,
        65,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(7);
  });

  it('small craft: LEFT_WING factor is 0 (side arcs instead)', () => {
    expect(
      maxArcArmorPoints(
        AerospaceArc.LEFT_WING,
        100,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toBe(0);
  });

  it('small craft: LEFT_SIDE max = floor(100 × 0.20) = 20', () => {
    expect(
      maxArcArmorPoints(
        AerospaceArc.LEFT_SIDE,
        100,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toBe(20);
  });

  it('maxTotalArmorPoints: 100t ASF = nose+wing+wing+aft = 28+20+20+12 = 80', () => {
    expect(maxTotalArmorPoints(100, AerospaceSubType.AEROSPACE_FIGHTER)).toBe(
      80,
    );
  });
});

// ============================================================================
// engineWeightAerospace
// ============================================================================

describe('engineWeightAerospace', () => {
  it('Shilone: rating 325, Fusion → table lookup 20t', () => {
    // FUSION_ENGINE_WEIGHT[325] = 20.0
    expect(aerospaceEngineWeight(325, AerospaceEngineType.FUSION)).toBe(20);
  });

  it('Sparrowhawk: rating 210, ICE → table weight × 2.0', () => {
    // FUSION_ENGINE_WEIGHT[210] = 9.0, ICE ×2 = 18t
    expect(aerospaceEngineWeight(210, AerospaceEngineType.ICE)).toBe(18);
  });

  it('XL engine halves the weight', () => {
    // rating 200, Fusion → 8.5t; XL → 4.25 → ceil to 4.5t
    expect(aerospaceEngineWeight(200, AerospaceEngineType.XL)).toBe(4.5);
  });

  it('result is always a multiple of 0.5', () => {
    for (const rating of [50, 100, 150, 200, 250, 300, 350, 400]) {
      const weight = aerospaceEngineWeight(rating, AerospaceEngineType.FUSION);
      expect(weight % 0.5).toBe(0);
    }
  });
});

// ============================================================================
// crewCalculations
// ============================================================================

describe('crewCalculations', () => {
  it('quartersWeight: 3 crew, 0 pax, 0 marines → 15t', () => {
    expect(
      quartersWeight({ crew: 3, passengers: 0, marines: 0, quartersTons: 0 }),
    ).toBe(15);
  });

  it('quartersWeight: 2 crew + 4 pax → 2×5 + 4×3 = 22t', () => {
    expect(
      quartersWeight({ crew: 2, passengers: 4, marines: 0, quartersTons: 0 }),
    ).toBe(22);
  });

  it('makeSmallCraftCrew computes quartersTons automatically', () => {
    const crew = makeSmallCraftCrew(3, 0, 0);
    expect(crew.quartersTons).toBe(15);
  });

  it('minSmallCraftCrew: 100t → 3 crew', () => {
    expect(minSmallCraftCrew(100)).toBe(3);
  });

  it('minSmallCraftCrew: 150t → 4 crew', () => {
    expect(minSmallCraftCrew(150)).toBe(4);
  });

  it('minSmallCraftCrew: 200t → 6 crew', () => {
    expect(minSmallCraftCrew(200)).toBe(6);
  });
});

// ============================================================================
// VAL-AERO-TONNAGE
// ============================================================================

describe('VAL-AERO-TONNAGE', () => {
  it('Shilone 65t ASF — valid, no errors', () => {
    expect(
      validateTonnage(65, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toHaveLength(0);
  });

  it('Stuka 100t ASF — valid, no errors', () => {
    expect(
      validateTonnage(100, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toHaveLength(0);
  });

  it('Sparrowhawk 30t CF — valid, no errors', () => {
    expect(
      validateTonnage(30, AerospaceSubType.CONVENTIONAL_FIGHTER),
    ).toHaveLength(0);
  });

  it('Seeker 100t SmallCraft — valid, no errors', () => {
    expect(validateTonnage(100, AerospaceSubType.SMALL_CRAFT)).toHaveLength(0);
  });

  it('ASF under 5t → VAL-AERO-TONNAGE error', () => {
    const errors = validateTonnage(4, AerospaceSubType.AEROSPACE_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-TONNAGE');
  });

  it('ASF over 100t → VAL-AERO-TONNAGE error', () => {
    const errors = validateTonnage(101, AerospaceSubType.AEROSPACE_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-TONNAGE');
  });

  it('CF over 50t → VAL-AERO-TONNAGE error', () => {
    const errors = validateTonnage(55, AerospaceSubType.CONVENTIONAL_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-TONNAGE');
  });

  it('SmallCraft under 100t → VAL-AERO-TONNAGE error', () => {
    const errors = validateTonnage(90, AerospaceSubType.SMALL_CRAFT);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-TONNAGE');
  });

  it('SmallCraft over 200t → VAL-AERO-TONNAGE error', () => {
    const errors = validateTonnage(210, AerospaceSubType.SMALL_CRAFT);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-TONNAGE');
  });
});

// ============================================================================
// VAL-AERO-THRUST
// ============================================================================

describe('VAL-AERO-THRUST', () => {
  it('Shilone Fusion ASF thrust 5 — no errors', () => {
    expect(
      validateThrust(
        AerospaceEngineType.FUSION,
        5,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toHaveLength(0);
  });

  it('Sparrowhawk ICE CF thrust 7 — no errors', () => {
    expect(
      validateThrust(
        AerospaceEngineType.ICE,
        7,
        AerospaceSubType.CONVENTIONAL_FIGHTER,
      ),
    ).toHaveLength(0);
  });

  it('Fusion on CF → VAL-AERO-THRUST (illegal engine)', () => {
    const errors = validateThrust(
      AerospaceEngineType.FUSION,
      5,
      AerospaceSubType.CONVENTIONAL_FIGHTER,
    );
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-THRUST')).toBe(true);
  });

  it('ICE on ASF → VAL-AERO-THRUST (illegal engine)', () => {
    const errors = validateThrust(
      AerospaceEngineType.ICE,
      5,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-THRUST')).toBe(true);
  });

  it('safeThrust 13 on ASF → VAL-AERO-THRUST (exceeds cap of 12)', () => {
    const errors = validateThrust(
      AerospaceEngineType.FUSION,
      13,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-THRUST')).toBe(true);
  });

  it('safeThrust 7 on SmallCraft → VAL-AERO-THRUST (exceeds cap of 6)', () => {
    const errors = validateThrust(
      AerospaceEngineType.FUSION,
      7,
      AerospaceSubType.SMALL_CRAFT,
    );
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-THRUST')).toBe(true);
  });
});

// ============================================================================
// VAL-AERO-SI
// ============================================================================

describe('VAL-AERO-SI', () => {
  it('Shilone SI=7 on 65t ASF — no errors', () => {
    expect(validateSI(7, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(0);
  });

  it('SI at maximum (20) for ASF — no errors', () => {
    expect(validateSI(20, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(0);
  });

  it('SI=21 on ASF → VAL-AERO-SI error (max 20)', () => {
    const errors = validateSI(21, AerospaceSubType.AEROSPACE_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-SI');
  });

  it('SI=16 on CF → VAL-AERO-SI error (max 15)', () => {
    const errors = validateSI(16, AerospaceSubType.CONVENTIONAL_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-SI');
  });

  it('SI=30 on SmallCraft — no errors (at maximum)', () => {
    expect(validateSI(30, AerospaceSubType.SMALL_CRAFT)).toHaveLength(0);
  });

  it('SI=31 on SmallCraft → VAL-AERO-SI error (max 30)', () => {
    const errors = validateSI(31, AerospaceSubType.SMALL_CRAFT);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-SI');
  });
});

// ============================================================================
// VAL-AERO-FUEL
// ============================================================================

describe('VAL-AERO-FUEL', () => {
  it('Shilone 5t fuel ASF — no errors (exactly at minimum)', () => {
    expect(validateFuel(5, AerospaceSubType.AEROSPACE_FIGHTER)).toHaveLength(0);
  });

  it('Sparrowhawk 2t fuel CF — no errors (exactly at minimum)', () => {
    expect(validateFuel(2, AerospaceSubType.CONVENTIONAL_FIGHTER)).toHaveLength(
      0,
    );
  });

  it('Seeker 20t fuel SmallCraft — no errors (exactly at minimum)', () => {
    expect(validateFuel(20, AerospaceSubType.SMALL_CRAFT)).toHaveLength(0);
  });

  it('ASF with 4t fuel → VAL-AERO-FUEL error (min 5t)', () => {
    const errors = validateFuel(4, AerospaceSubType.AEROSPACE_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-FUEL');
  });

  it('CF with 1t fuel → VAL-AERO-FUEL error (min 2t)', () => {
    const errors = validateFuel(1, AerospaceSubType.CONVENTIONAL_FIGHTER);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-FUEL');
  });

  it('SmallCraft with 19t fuel → VAL-AERO-FUEL error (min 20t)', () => {
    const errors = validateFuel(19, AerospaceSubType.SMALL_CRAFT);
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-FUEL');
  });
});

// ============================================================================
// VAL-AERO-ARC-MAX
// ============================================================================

describe('VAL-AERO-ARC-MAX', () => {
  it('Shilone: valid arc allocations — no errors', () => {
    // maxArcArmorPoints(NOSE, 65, ASF) = 18; allocating 10 is fine
    expect(
      validateArcArmor(
        {
          [AerospaceArc.NOSE]: 10,
          [AerospaceArc.LEFT_WING]: 8,
          [AerospaceArc.RIGHT_WING]: 8,
          [AerospaceArc.AFT]: 4,
        },
        65,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toHaveLength(0);
  });

  it('Stuka: valid arc allocations — no errors', () => {
    expect(
      validateArcArmor(
        {
          [AerospaceArc.NOSE]: 16,
          [AerospaceArc.LEFT_WING]: 10,
          [AerospaceArc.RIGHT_WING]: 10,
          [AerospaceArc.AFT]: 8,
        },
        100,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toHaveLength(0);
  });

  it('Nose over max → VAL-AERO-ARC-MAX error', () => {
    // max nose for 65t ASF = floor(65×0.28) = 18; allocating 19 violates
    const errors = validateArcArmor(
      { [AerospaceArc.NOSE]: 19 },
      65,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-ARC-MAX');
  });

  it('Wing over max → VAL-AERO-ARC-MAX error', () => {
    // max wing for 65t ASF = floor(65×0.20) = 13; allocating 14 violates
    const errors = validateArcArmor(
      { [AerospaceArc.LEFT_WING]: 14 },
      65,
      AerospaceSubType.AEROSPACE_FIGHTER,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].ruleId).toBe('VAL-AERO-ARC-MAX');
  });

  it('Seeker small craft: valid side arc allocations — no errors', () => {
    expect(
      validateArcArmor(
        {
          [AerospaceArc.NOSE]: 20,
          [AerospaceArc.LEFT_SIDE]: 14,
          [AerospaceArc.RIGHT_SIDE]: 14,
          [AerospaceArc.AFT]: 8,
        },
        100,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toHaveLength(0);
  });

  it('Inapplicable arcs (factor=0) are silently ignored', () => {
    // LEFT_WING has factor 0 for small craft — allocating any amount should not error
    expect(
      validateArcArmor(
        { [AerospaceArc.LEFT_WING]: 99 },
        100,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toHaveLength(0);
  });
});

// ============================================================================
// VAL-AERO-CREW
// ============================================================================

describe('VAL-AERO-CREW', () => {
  it('ASF: crew rule is a no-op (always passes)', () => {
    expect(validateCrew(AerospaceSubType.AEROSPACE_FIGHTER, 0, 0)).toHaveLength(
      0,
    );
  });

  it('CF: crew rule is a no-op (always passes)', () => {
    expect(
      validateCrew(AerospaceSubType.CONVENTIONAL_FIGHTER, 0, 0),
    ).toHaveLength(0);
  });

  it('SmallCraft with quarters + crew — no errors', () => {
    expect(validateCrew(AerospaceSubType.SMALL_CRAFT, 15, 3)).toHaveLength(0);
  });

  it('SmallCraft with 0 quarters → VAL-AERO-CREW error', () => {
    const errors = validateCrew(AerospaceSubType.SMALL_CRAFT, 0, 3);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-CREW')).toBe(true);
  });

  it('SmallCraft with 0 crew → VAL-AERO-CREW error', () => {
    const errors = validateCrew(AerospaceSubType.SMALL_CRAFT, 15, 0);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-CREW')).toBe(true);
  });

  it('SmallCraft with 0 quarters AND 0 crew → two VAL-AERO-CREW errors', () => {
    const errors = validateCrew(AerospaceSubType.SMALL_CRAFT, 0, 0);
    expect(errors.filter((e) => e.ruleId === 'VAL-AERO-CREW')).toHaveLength(2);
  });
});

// ============================================================================
// validateAerospaceUnit (full runner)
// ============================================================================

describe('validateAerospaceUnit — full runner', () => {
  it('Shilone (ASF, 65t, Fusion, thrust 5) — clean build', () => {
    expect(validateAerospaceUnit(shiloneInput())).toHaveLength(0);
  });

  it('Stuka (ASF, 100t, Fusion, thrust 4) — clean build', () => {
    expect(validateAerospaceUnit(stukaInput())).toHaveLength(0);
  });

  it('Sparrowhawk (CF, 30t, ICE, thrust 7) — clean build', () => {
    expect(validateAerospaceUnit(sparrowhawkInput())).toHaveLength(0);
  });

  it('Seeker (SmallCraft, 100t, Fusion, crew 3) — clean build', () => {
    expect(validateAerospaceUnit(seekerInput())).toHaveLength(0);
  });

  it('Shilone with Fusion engine swapped to ICE → VAL-AERO-THRUST', () => {
    const input = { ...shiloneInput(), engineType: AerospaceEngineType.ICE };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-THRUST')).toBe(true);
  });

  it('Shilone with tonnage 101 → VAL-AERO-TONNAGE', () => {
    const input = { ...shiloneInput(), tonnage: 101 };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-TONNAGE')).toBe(true);
  });

  it('Shilone with SI=21 → VAL-AERO-SI', () => {
    const input = { ...shiloneInput(), structuralIntegrity: 21 };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-SI')).toBe(true);
  });

  it('Shilone with fuelTons=4 → VAL-AERO-FUEL', () => {
    const input = { ...shiloneInput(), fuelTons: 4 };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-FUEL')).toBe(true);
  });

  it('Shilone with nose armor over max → VAL-AERO-ARC-MAX', () => {
    const input = {
      ...shiloneInput(),
      arcArmor: {
        [AerospaceArc.NOSE]: 99, // way over max
        [AerospaceArc.LEFT_WING]: 0,
        [AerospaceArc.RIGHT_WING]: 0,
        [AerospaceArc.AFT]: 0,
      },
    };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-ARC-MAX')).toBe(true);
  });

  it('Seeker with no quarters → VAL-AERO-CREW', () => {
    const input = { ...seekerInput(), quartersTons: 0 };
    const errors = validateAerospaceUnit(input);
    expect(errors.some((e) => e.ruleId === 'VAL-AERO-CREW')).toBe(true);
  });

  it('multiple violations are all reported', () => {
    // Tonnage + fuel both wrong
    const input = {
      ...shiloneInput(),
      tonnage: 101,
      fuelTons: 4,
    };
    const errors = validateAerospaceUnit(input);
    const ruleIds = errors.map((e) => e.ruleId);
    expect(ruleIds).toContain('VAL-AERO-TONNAGE');
    expect(ruleIds).toContain('VAL-AERO-FUEL');
  });
});
