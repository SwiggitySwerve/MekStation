/**
 * Tests for Battle Value calculation utilities
 */

import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
  type IProtoArmorByLocation,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';

import {
  calculateAdjustedBV,
  calculateAerospaceBVFromUnit,
  calculateBattleValueForUnit,
  calculateProtoMechBV,
} from '../battleValueCalculations';

describe('calculateAdjustedBV', () => {
  describe('baseline pilot (4/5)', () => {
    it('should return baseBV × 1.0 for 4/5 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 4, 5);
      // MegaMek matrix[4][5] = 1.0
      expect(result).toBe(1000);
    });

    it('should handle different base values for baseline pilot', () => {
      expect(calculateAdjustedBV(500, 4, 5)).toBe(500);
      expect(calculateAdjustedBV(2000, 4, 5)).toBe(2000);
    });
  });

  describe('elite pilot (3/4)', () => {
    it('should return baseBV × 1.32 for 3/4 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 3, 4);
      // MegaMek matrix[3][4] = 1.32
      expect(result).toBe(1320);
    });

    it('should handle different base values for elite pilot', () => {
      expect(calculateAdjustedBV(500, 3, 4)).toBe(660);
      expect(calculateAdjustedBV(2000, 3, 4)).toBe(2640);
    });
  });

  describe('green pilot (5/6)', () => {
    it('should return baseBV × 0.86 for 5/6 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 5, 6);
      // MegaMek matrix[5][6] = 0.86
      expect(result).toBe(860);
    });

    it('should handle different base values for green pilot', () => {
      expect(calculateAdjustedBV(500, 5, 6)).toBe(430);
      expect(calculateAdjustedBV(2000, 5, 6)).toBe(1720);
    });
  });

  describe('edge cases', () => {
    it('should handle zero base BV', () => {
      expect(calculateAdjustedBV(0, 4, 5)).toBe(0);
      expect(calculateAdjustedBV(0, 3, 4)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // 1000 × 1.32 = 1320 (exact)
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1320);

      // 1111 × 1.32 = 1466.52 -> rounds to 1467
      expect(calculateAdjustedBV(1111, 3, 4)).toBe(1467);
    });

    it('should handle perfect pilot (0/0)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 0, 0);
      // MegaMek matrix[0][0] = 2.42
      expect(result).toBe(2420);
    });

    it('should handle terrible pilot (8/8)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 8, 8);
      // MegaMek matrix[8][8] = 0.64
      expect(result).toBe(640);
    });
  });

  describe('skill modifier ranges', () => {
    it('should apply MegaMek matrix values for elite pilots (0-5 total)', () => {
      expect(calculateAdjustedBV(1000, 0, 0)).toBe(2420); // matrix[0][0] = 2.42
      expect(calculateAdjustedBV(1000, 2, 3)).toBe(1680); // matrix[2][3] = 1.68
      expect(calculateAdjustedBV(1000, 1, 4)).toBe(1760); // matrix[1][4] = 1.76
    });

    it('should apply MegaMek matrix values for skilled pilots (6-7 total)', () => {
      expect(calculateAdjustedBV(1000, 3, 3)).toBe(1440); // matrix[3][3] = 1.44
      expect(calculateAdjustedBV(1000, 2, 5)).toBe(1400); // matrix[2][5] = 1.40
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1320); // matrix[3][4] = 1.32
    });

    it('should apply MegaMek matrix values for regular pilots (8-9 total)', () => {
      expect(calculateAdjustedBV(1000, 4, 4)).toBe(1100); // matrix[4][4] = 1.10
      expect(calculateAdjustedBV(1000, 4, 5)).toBe(1000); // matrix[4][5] = 1.00
      expect(calculateAdjustedBV(1000, 3, 6)).toBe(1160); // matrix[3][6] = 1.16
    });

    it('should apply MegaMek matrix values for green pilots (10-11 total)', () => {
      expect(calculateAdjustedBV(1000, 5, 5)).toBe(900); // matrix[5][5] = 0.90
      expect(calculateAdjustedBV(1000, 5, 6)).toBe(860); // matrix[5][6] = 0.86
      expect(calculateAdjustedBV(1000, 4, 7)).toBe(900); // matrix[4][7] = 0.90
    });

    it('should apply MegaMek matrix values for poor pilots (12+ total)', () => {
      expect(calculateAdjustedBV(1000, 6, 6)).toBe(810); // matrix[6][6] = 0.81
      expect(calculateAdjustedBV(1000, 8, 8)).toBe(640); // matrix[8][8] = 0.64
      expect(calculateAdjustedBV(1000, 5, 8)).toBe(770); // matrix[5][8] = 0.77
    });
  });
});

// =============================================================================
// calculateBattleValueForUnit — per-unit dispatch
// =============================================================================

/**
 * Build a minimal, well-typed ProtoMech for dispatcher tests.
 *
 * Only the fields the calculator actually reads are non-zero; every other
 * field uses a stable default so the fixture is safe to reuse.
 */
function zeroArmor(): IProtoArmorByLocation {
  return {
    [ProtoLocation.HEAD]: 0,
    [ProtoLocation.TORSO]: 0,
    [ProtoLocation.LEFT_ARM]: 0,
    [ProtoLocation.RIGHT_ARM]: 0,
    [ProtoLocation.LEGS]: 0,
    [ProtoLocation.MAIN_GUN]: 0,
  };
}

function buildDispatchProto(): IProtoMechUnit {
  return {
    id: 'dispatch-proto',
    name: 'Dispatch Proto',
    chassis: 'Dispatch',
    model: 'Prime',
    mulId: 'TEST-1',
    year: 3075,
    unitType: UnitType.PROTOMECH,
    techBase: TechBase.CLAN,
    tonnage: 5,
    weightClass: ProtoWeightClass.MEDIUM,
    chassisType: ProtoChassis.BIPED,
    pointSize: 5,
    walkMP: 5,
    runMP: 6,
    jumpMP: 0,
    engineRating: 25,
    engineWeight: 0.625,
    myomerBooster: false,
    glidingWings: false,
    armorType: 'Standard',
    // Populate torso armor + structure so defensive BV is non-trivial and the
    // dispatcher cannot accidentally short-circuit to 0.
    armorByLocation: { ...zeroArmor(), [ProtoLocation.TORSO]: 10 },
    structureByLocation: { ...zeroArmor(), [ProtoLocation.TORSO]: 5 },
    hasMainGun: false,
    mainGunWeaponId: undefined,
    equipment: [],
    isModified: false,
    createdAt: 0,
    lastModifiedAt: 0,
  };
}

describe('calculateBattleValueForUnit — PROTOMECH dispatch', () => {
  /*
   * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
   *       — Requirement: ProtoMech BV Dispatch
   */
  it('routes a PROTOMECH unit to the proto calculator and returns its breakdown', () => {
    const proto = buildDispatchProto();

    const dispatched = calculateBattleValueForUnit(proto);

    // The dispatcher must invoke the proto path and surface the breakdown
    // under a `protomech`-tagged result; the spec requires the return to
    // include an IProtoMechBVBreakdown.
    expect(dispatched).toBeDefined();
    expect(dispatched?.kind).toBe('protomech');
    expect(dispatched?.breakdown).toBeDefined();

    // Must match a direct call to the canonical calculator — dispatch is a
    // routing concern, not a recomputation.
    const direct = calculateProtoMechBV(proto);
    if (dispatched?.kind !== 'protomech') {
      throw new Error('Expected protomech dispatch result');
    }
    expect(dispatched.breakdown.final).toBe(direct.final);
    expect(dispatched.breakdown.baseBV).toBe(direct.baseBV);

    // Proto with positive armor + structure should always produce a non-zero
    // final BV; catches regressions where dispatch returns a zero stub.
    expect(direct.final).toBeGreaterThan(0);
  });

  it('returns undefined for non-ProtoMech shapes so mech callers fall through', () => {
    // A stand-in mech-shaped value: the dispatcher must not try to treat it
    // as a proto and must leave the caller to use the existing mech path.
    const notAProto = {
      unitType: UnitType.BATTLEMECH,
    } as const;
    expect(calculateBattleValueForUnit(notAProto)).toBeUndefined();
  });
});

// =============================================================================
// calculateBattleValueForUnit — AEROSPACE dispatch
// =============================================================================

/**
 * Build a minimal aerospace-shaped value for dispatcher tests. The aerospace
 * BV calculator only reads tonnage / SI / thrust / armor / equipment fields,
 * so the fixture stays intentionally narrow — extra `IAerospaceUnit` fields
 * are not required to exercise the dispatch path.
 */
function buildDispatchAerospace(unitType: UnitType = UnitType.AEROSPACE): {
  unitType: UnitType;
  tonnage: number;
  structuralIntegrity: number;
  movement: { safeThrust: number; maxThrust: number };
  armorType: string;
  totalArmorPoints: number;
  equipment: ReadonlyArray<{ equipmentId: string; location: string }>;
} {
  return {
    unitType,
    tonnage: 50,
    structuralIntegrity: 5,
    movement: { safeThrust: 5, maxThrust: 8 },
    // Use the canonical string key so the dispatcher's adapter forwards it
    // verbatim to `getArmorBVMultiplier` (no numeric → string fallback).
    armorType: 'standard',
    totalArmorPoints: 100,
    equipment: [
      // No matching equipment in the catalogue — that's fine for dispatch
      // testing; the aerospace calculator still produces a valid breakdown
      // with a zero weapon fire pool.
      { equipmentId: 'medlas', location: 'Nose' },
    ],
  };
}

describe('calculateBattleValueForUnit — AEROSPACE dispatch', () => {
  /*
   * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
   *       — Requirement: Aerospace BV Dispatch
   */
  it('routes an AEROSPACE unit to the aerospace calculator and returns its breakdown', () => {
    const aero = buildDispatchAerospace(UnitType.AEROSPACE);

    // The cast widens our minimal fixture to the dispatcher's accepted union.
    // We intentionally keep the fixture narrow — adding the full IAerospace
    // surface (motionType, armorByArc, etc.) would obscure what's being tested.
    const dispatched = calculateBattleValueForUnit(
      aero as unknown as Parameters<typeof calculateBattleValueForUnit>[0],
    );

    expect(dispatched).toBeDefined();
    expect(dispatched?.kind).toBe('aerospace');

    if (dispatched?.kind !== 'aerospace') {
      throw new Error('Expected aerospace dispatch result');
    }

    // Must match a direct call to the canonical adapter — dispatch is a
    // routing concern, not a recomputation.
    const direct = calculateAerospaceBVFromUnit(
      aero as unknown as Parameters<typeof calculateAerospaceBVFromUnit>[0],
    );
    expect(dispatched.breakdown.final).toBe(direct.final);
    expect(dispatched.breakdown.defensive).toBe(direct.defensive);
    expect(dispatched.breakdown.offensive).toBe(direct.offensive);

    // Required-by-spec fields on the breakdown.
    expect(dispatched.breakdown).toHaveProperty('arcContributions');
    expect(dispatched.breakdown).toHaveProperty('pilotMultiplier');
    expect(dispatched.breakdown).toHaveProperty('defensiveFactor');
  });

  it('routes a CONVENTIONAL_FIGHTER unit through the aerospace path', () => {
    const cf = buildDispatchAerospace(UnitType.CONVENTIONAL_FIGHTER);
    const dispatched = calculateBattleValueForUnit(
      cf as unknown as Parameters<typeof calculateBattleValueForUnit>[0],
    );
    expect(dispatched?.kind).toBe('aerospace');
    if (dispatched?.kind !== 'aerospace') {
      throw new Error('Expected aerospace dispatch result');
    }
    // Conventional fighters get a 0.8 sub-type multiplier per spec.
    expect(dispatched.breakdown.subTypeMultiplier).toBeCloseTo(0.8, 4);
  });

  it('routes a SMALL_CRAFT unit through the aerospace path', () => {
    const sc = buildDispatchAerospace(UnitType.SMALL_CRAFT);
    const dispatched = calculateBattleValueForUnit(
      sc as unknown as Parameters<typeof calculateBattleValueForUnit>[0],
    );
    expect(dispatched?.kind).toBe('aerospace');
    if (dispatched?.kind !== 'aerospace') {
      throw new Error('Expected aerospace dispatch result');
    }
    // Small craft retain a 1.0 sub-type multiplier (the 1.2× armor bonus is
    // applied inside the defensive block, not as a final multiplier).
    expect(dispatched.breakdown.subTypeMultiplier).toBeCloseTo(1.0, 4);
  });
});
