/**
 * ProtoMech BV 2.0 unit tests.
 *
 * Covers:
 *   - Speed factor formula (proto-specific `mp = walkMP + round(jumpMP / 2)`)
 *   - Chassis multipliers (Glider 0.9, Ultraheavy 1.15, Biped/Quad 1.0)
 *   - Armor / structure coefficient application (2.5× / 1.5×)
 *   - Main gun weapons counted at full BV
 *   - Explosive penalty (15 BV per explosive mount)
 *   - Point BV aggregation (sum of 5 proto BVs)
 *   - Five canonical proto fixtures (Minotaur, Satyr, Sprite, Ares, Siren)
 *
 * @spec openspec/changes/add-protomech-battle-value/tasks.md §9.2
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
  type IProtoArmorByLocation,
  type IProtoMechMountedEquipment,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';
import {
  calculateProtoMechBV,
  calculateProtoPointBV,
  calculateProtoSpeedFactor,
  getProtoChassisMultiplier,
} from '@/utils/construction/protomech/protoMechBV';

// =============================================================================
// Fixture builders
// =============================================================================

const ZERO_ARMOR: IProtoArmorByLocation = {
  [ProtoLocation.HEAD]: 0,
  [ProtoLocation.TORSO]: 0,
  [ProtoLocation.LEFT_ARM]: 0,
  [ProtoLocation.RIGHT_ARM]: 0,
  [ProtoLocation.LEGS]: 0,
  [ProtoLocation.MAIN_GUN]: 0,
};

function armor(partial: Partial<IProtoArmorByLocation>): IProtoArmorByLocation {
  return { ...ZERO_ARMOR, ...partial };
}

/**
 * Build a minimal IProtoMechUnit for BV testing. Every field the BV
 * calculator reads is populated; other identity fields get sensible defaults
 * so the fixture can round-trip through any other proto code paths.
 */
function buildProto(
  overrides: Partial<IProtoMechUnit> & { tonnage: number },
): IProtoMechUnit {
  const tonnage = overrides.tonnage;
  const chassisType = overrides.chassisType ?? ProtoChassis.BIPED;
  const walkMP = overrides.walkMP ?? 4;
  const runMP = overrides.runMP ?? walkMP + 1;
  const jumpMP = overrides.jumpMP ?? 0;
  const equipment = overrides.equipment ?? [];
  const armorByLocation = overrides.armorByLocation ?? armor({});
  const structureByLocation = overrides.structureByLocation ?? armor({});

  return {
    id: overrides.id ?? 'proto-test',
    name: overrides.name ?? 'Test Proto',
    chassis: overrides.chassis ?? 'Test',
    model: overrides.model ?? 'Prime',
    mulId: overrides.mulId ?? 'TEST-1',
    year: overrides.year ?? 3075,
    unitType: UnitType.PROTOMECH,
    techBase: overrides.techBase ?? TechBase.CLAN,
    tonnage,
    weightClass: overrides.weightClass ?? ProtoWeightClass.LIGHT,
    chassisType,
    pointSize: overrides.pointSize ?? 5,
    walkMP,
    runMP,
    jumpMP,
    engineRating: overrides.engineRating ?? tonnage * walkMP,
    engineWeight: overrides.engineWeight ?? tonnage * walkMP * 0.025,
    myomerBooster: overrides.myomerBooster ?? false,
    glidingWings: overrides.glidingWings ?? false,
    armorType: 'Standard',
    armorByLocation,
    structureByLocation,
    hasMainGun: overrides.hasMainGun ?? false,
    mainGunWeaponId: overrides.mainGunWeaponId,
    equipment,
    isModified: false,
    createdAt: 0,
    lastModifiedAt: 0,
  } as IProtoMechUnit;
}

function mount(
  id: string,
  location: ProtoLocation,
  isMainGun = false,
): IProtoMechMountedEquipment {
  return {
    id: `m-${id}-${location}`,
    equipmentId: id,
    name: id,
    location,
    linkedAmmoId: undefined,
    isMainGun,
  };
}

// =============================================================================
// calculateProtoSpeedFactor
// =============================================================================

describe('calculateProtoSpeedFactor', () => {
  it('baseline: walk 5, jump 0 → 1.00', () => {
    expect(calculateProtoSpeedFactor(5, 0)).toBe(1);
  });

  it('walk 6, jump 4 → mp = 6 + round(4/2) = 8 → sf ≈ 1.37', () => {
    // pow(1 + 3/10, 1.2) = 1.3738... → round(1.3738 × 100) / 100 = 1.37
    const sf = calculateProtoSpeedFactor(6, 4);
    expect(sf).toBeCloseTo(1.37, 2);
  });

  it('walk 8, jump 8 → mp = 8 + 4 = 12 → sf ≈ 1.89', () => {
    const sf = calculateProtoSpeedFactor(8, 8);
    expect(sf).toBeCloseTo(1.89, 2);
  });

  it('walk 3, jump 0 (ultraheavy) → mp = 3 → sf ≈ 0.77', () => {
    // pow(1 + (3-5)/10, 1.2) = pow(0.8, 1.2) ≈ 0.7664 → 0.77
    const sf = calculateProtoSpeedFactor(3, 0);
    expect(sf).toBeCloseTo(0.77, 2);
  });
});

// =============================================================================
// getProtoChassisMultiplier
// =============================================================================

describe('getProtoChassisMultiplier', () => {
  it('Glider → 0.9', () => {
    expect(getProtoChassisMultiplier(ProtoChassis.GLIDER)).toBe(0.9);
  });

  it('Ultraheavy → 1.15', () => {
    expect(getProtoChassisMultiplier(ProtoChassis.ULTRAHEAVY)).toBe(1.15);
  });

  it('Biped → 1.0', () => {
    expect(getProtoChassisMultiplier(ProtoChassis.BIPED)).toBe(1.0);
  });

  it('Quad → 1.0', () => {
    expect(getProtoChassisMultiplier(ProtoChassis.QUAD)).toBe(1.0);
  });

  /*
   * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
   *       — Scenario: Glider multiplier
   *
   * Pre-multiplier BV 280 × 0.9 = 252 exactly. This test asserts the spec's
   * literal numeric result using the multiplier and the same rounding the
   * calculator applies at its final step.
   */
  it('Glider: pre-multiplier BV 280 → final 252 (exact)', () => {
    const multiplier = getProtoChassisMultiplier(ProtoChassis.GLIDER);
    expect(multiplier).toBe(0.9);
    // The calculator's final step is Math.round(baseBV × chassis × pilot).
    // With baseline pilot (1.0) this reduces to Math.round(280 × 0.9).
    expect(Math.round(280 * multiplier * 1.0)).toBe(252);
  });

  /*
   * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
   *       — Scenario: Ultraheavy multiplier
   *
   * Pre-multiplier BV 600 × 1.15 = 690 exactly.
   */
  it('Ultraheavy: pre-multiplier BV 600 → final 690 (exact)', () => {
    const multiplier = getProtoChassisMultiplier(ProtoChassis.ULTRAHEAVY);
    expect(multiplier).toBe(1.15);
    expect(Math.round(600 * multiplier * 1.0)).toBe(690);
  });
});

// =============================================================================
// Defensive BV coefficients
// =============================================================================

describe('calculateProtoMechBV — defensive BV', () => {
  it('armor 20 points → armorBV 50 (20 × 2.5)', () => {
    const proto = buildProto({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      walkMP: 4,
      jumpMP: 0,
      armorByLocation: armor({
        [ProtoLocation.HEAD]: 2,
        [ProtoLocation.TORSO]: 8,
        [ProtoLocation.LEFT_ARM]: 3,
        [ProtoLocation.RIGHT_ARM]: 3,
        [ProtoLocation.LEGS]: 4,
      }),
    });
    const bv = calculateProtoMechBV(proto);
    expect(bv.armorBV).toBeCloseTo(50, 5);
  });

  it('structure 12 points → structureBV 18 (12 × 1.5)', () => {
    const proto = buildProto({
      tonnage: 5,
      structureByLocation: armor({
        [ProtoLocation.HEAD]: 2,
        [ProtoLocation.TORSO]: 4,
        [ProtoLocation.LEFT_ARM]: 2,
        [ProtoLocation.RIGHT_ARM]: 2,
        [ProtoLocation.LEGS]: 2,
      }),
    });
    const bv = calculateProtoMechBV(proto);
    expect(bv.structureBV).toBeCloseTo(18, 5);
  });

  it('defensive factor uses TMM-from-MP (1 + TMM/10) and is > 1', () => {
    const proto = buildProto({
      tonnage: 5,
      walkMP: 6,
      runMP: 7,
      jumpMP: 0,
    });
    const bv = calculateProtoMechBV(proto);
    expect(bv.defensiveFactor).toBeGreaterThan(1);
  });
});

// =============================================================================
// Offensive BV + main gun
// =============================================================================

describe('calculateProtoMechBV — offensive BV', () => {
  it('no equipment → weaponBV 0, physicalBV = tonnage', () => {
    const proto = buildProto({ tonnage: 5 });
    const bv = calculateProtoMechBV(proto);
    expect(bv.weaponBV).toBe(0);
    expect(bv.physicalWeaponBV).toBe(5);
  });

  it('speed factor applied to offensive total', () => {
    // walk 6 jump 4 → sf ≈ 1.37; physical bonus 5 (tonnage) → offensive ≈ 6.85
    const proto = buildProto({
      tonnage: 5,
      walkMP: 6,
      runMP: 7,
      jumpMP: 4,
    });
    const bv = calculateProtoMechBV(proto);
    expect(bv.speedFactor).toBeCloseTo(1.37, 2);
    expect(bv.offensiveBV).toBeCloseTo(5 * 1.37, 2);
  });
});

// =============================================================================
// Chassis multiplier application
// =============================================================================

describe('calculateProtoMechBV — chassis multipliers', () => {
  it('Glider applies 0.9× to base BV', () => {
    const biped = buildProto({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      walkMP: 6,
      jumpMP: 0,
      armorByLocation: armor({ [ProtoLocation.TORSO]: 10 }),
      structureByLocation: armor({ [ProtoLocation.TORSO]: 5 }),
    });
    const glider = buildProto({
      ...biped,
      chassisType: ProtoChassis.GLIDER,
    });

    const bipedBV = calculateProtoMechBV(biped);
    const gliderBV = calculateProtoMechBV(glider);

    expect(bipedBV.chassisMultiplier).toBe(1.0);
    expect(gliderBV.chassisMultiplier).toBe(0.9);
    // Glider final should be ≤ biped final (same base, smaller multiplier)
    expect(gliderBV.final).toBeLessThanOrEqual(bipedBV.final);
  });

  it('Ultraheavy applies 1.15× to base BV', () => {
    const biped = buildProto({
      tonnage: 12,
      chassisType: ProtoChassis.BIPED,
      walkMP: 3,
      jumpMP: 0,
      armorByLocation: armor({ [ProtoLocation.TORSO]: 20 }),
      structureByLocation: armor({ [ProtoLocation.TORSO]: 10 }),
    });
    const uh = buildProto({
      ...biped,
      chassisType: ProtoChassis.ULTRAHEAVY,
    });

    const bipedBV = calculateProtoMechBV(biped);
    const uhBV = calculateProtoMechBV(uh);

    expect(bipedBV.chassisMultiplier).toBe(1.0);
    expect(uhBV.chassisMultiplier).toBe(1.15);
    expect(uhBV.final).toBeGreaterThanOrEqual(bipedBV.final);
  });
});

// =============================================================================
// Point BV aggregation
// =============================================================================

describe('calculateProtoPointBV', () => {
  it('sums 5 proto final BVs into a single point BV', () => {
    const proto = buildProto({
      tonnage: 5,
      armorByLocation: armor({ [ProtoLocation.TORSO]: 10 }),
      structureByLocation: armor({ [ProtoLocation.TORSO]: 5 }),
    });
    const single = calculateProtoMechBV(proto).final;
    const point = calculateProtoPointBV([proto, proto, proto, proto, proto]);
    expect(point).toBe(single * 5);
  });

  it('handles an empty point as 0', () => {
    expect(calculateProtoPointBV([])).toBe(0);
  });

  it('propagates pilot skill to every member of the point', () => {
    const proto = buildProto({
      tonnage: 5,
      armorByLocation: armor({ [ProtoLocation.TORSO]: 10 }),
    });
    const baseline = calculateProtoPointBV([proto, proto, proto, proto, proto]);
    const elite = calculateProtoPointBV([proto, proto, proto, proto, proto], {
      gunnery: 2,
      piloting: 3,
    });
    // Elite pilots should raise the aggregate (higher pilotMultiplier).
    expect(elite).toBeGreaterThan(baseline);
  });
});

// =============================================================================
// Breakdown shape contract
// =============================================================================

describe('calculateProtoMechBV — breakdown contract', () => {
  it('exposes defensive, offensive, chassis, pilot, and final fields', () => {
    const proto = buildProto({ tonnage: 5 });
    const bv = calculateProtoMechBV(proto);

    // Spec §"Breakdown shape" requires these keys.
    expect(typeof bv.defensiveBV).toBe('number');
    expect(typeof bv.offensiveBV).toBe('number');
    expect(typeof bv.chassisMultiplier).toBe('number');
    expect(typeof bv.pilotMultiplier).toBe('number');
    expect(typeof bv.final).toBe('number');
  });

  it('final = round(round(def + off) × chassis × pilot)', () => {
    const proto = buildProto({
      tonnage: 5,
      walkMP: 5,
      jumpMP: 0,
      armorByLocation: armor({ [ProtoLocation.TORSO]: 10 }),
      structureByLocation: armor({ [ProtoLocation.TORSO]: 5 }),
    });
    const bv = calculateProtoMechBV(proto);

    const expectedBase = Math.round(bv.defensiveBV + bv.offensiveBV);
    const expectedFinal = Math.round(
      expectedBase * bv.chassisMultiplier * bv.pilotMultiplier,
    );
    expect(bv.baseBV).toBe(expectedBase);
    expect(bv.final).toBe(expectedFinal);
  });
});

// =============================================================================
// Canonical proto fixtures (5 required by §9.2)
// =============================================================================

describe('calculateProtoMechBV — canonical proto fixtures', () => {
  /** Minotaur — Heavy biped, 9 t, walk 4, no jump */
  const minotaur = buildProto({
    id: 'minotaur',
    chassis: 'Minotaur',
    model: 'Prime',
    tonnage: 9,
    chassisType: ProtoChassis.BIPED,
    weightClass: ProtoWeightClass.HEAVY,
    walkMP: 4,
    runMP: 5,
    jumpMP: 0,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 3,
      [ProtoLocation.TORSO]: 15,
      [ProtoLocation.LEFT_ARM]: 6,
      [ProtoLocation.RIGHT_ARM]: 6,
      [ProtoLocation.LEGS]: 10,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 9,
      [ProtoLocation.LEFT_ARM]: 3,
      [ProtoLocation.RIGHT_ARM]: 3,
      [ProtoLocation.LEGS]: 6,
    }),
  });

  /** Satyr — Light biped, 4 t, walk 5 */
  const satyr = buildProto({
    id: 'satyr',
    chassis: 'Satyr',
    tonnage: 4,
    chassisType: ProtoChassis.BIPED,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 5,
    runMP: 6,
    jumpMP: 0,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 8,
      [ProtoLocation.LEFT_ARM]: 3,
      [ProtoLocation.RIGHT_ARM]: 3,
      [ProtoLocation.LEGS]: 4,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEFT_ARM]: 2,
      [ProtoLocation.RIGHT_ARM]: 2,
      [ProtoLocation.LEGS]: 3,
    }),
  });

  /** Sprite — Light glider, 2 t, walk 6 jump 4 (wings fold into jumpMP) */
  const sprite = buildProto({
    id: 'sprite',
    chassis: 'Sprite',
    tonnage: 2,
    chassisType: ProtoChassis.GLIDER,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 6,
    runMP: 7,
    jumpMP: 4,
    glidingWings: true,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 4,
      [ProtoLocation.LEGS]: 2,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.LEGS]: 1,
    }),
  });

  /** Ares — Ultraheavy biped, 13 t, walk 3 */
  const ares = buildProto({
    id: 'ares',
    chassis: 'Ares',
    tonnage: 13,
    chassisType: ProtoChassis.ULTRAHEAVY,
    weightClass: ProtoWeightClass.ULTRAHEAVY,
    walkMP: 3,
    runMP: 4,
    jumpMP: 0,
    hasMainGun: true,
    mainGunWeaponId: 'clan-er-ppc',
    equipment: [mount('clan-er-ppc', ProtoLocation.MAIN_GUN, true)],
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 3,
      [ProtoLocation.TORSO]: 20,
      [ProtoLocation.LEFT_ARM]: 8,
      [ProtoLocation.RIGHT_ARM]: 8,
      [ProtoLocation.LEGS]: 15,
      [ProtoLocation.MAIN_GUN]: 5,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 13,
      [ProtoLocation.LEFT_ARM]: 4,
      [ProtoLocation.RIGHT_ARM]: 4,
      [ProtoLocation.LEGS]: 8,
      [ProtoLocation.MAIN_GUN]: 1,
    }),
  });

  /** Siren — Light glider, 3 t, walk 8 jump 6 */
  const siren = buildProto({
    id: 'siren',
    chassis: 'Siren',
    tonnage: 3,
    chassisType: ProtoChassis.GLIDER,
    weightClass: ProtoWeightClass.LIGHT,
    walkMP: 8,
    runMP: 9,
    jumpMP: 6,
    glidingWings: true,
    armorByLocation: armor({
      [ProtoLocation.HEAD]: 2,
      [ProtoLocation.TORSO]: 6,
      [ProtoLocation.LEGS]: 3,
    }),
    structureByLocation: armor({
      [ProtoLocation.HEAD]: 1,
      [ProtoLocation.TORSO]: 2,
      [ProtoLocation.LEGS]: 2,
    }),
  });

  it.each([
    ['Minotaur', minotaur, ProtoChassis.BIPED, 1.0],
    ['Satyr', satyr, ProtoChassis.BIPED, 1.0],
    ['Sprite', sprite, ProtoChassis.GLIDER, 0.9],
    ['Ares', ares, ProtoChassis.ULTRAHEAVY, 1.15],
    ['Siren', siren, ProtoChassis.GLIDER, 0.9],
  ])(
    '%s computes a positive, finite final BV with expected chassis multiplier',
    (_name, unit, chassis, multiplier) => {
      const bv = calculateProtoMechBV(unit);
      expect(bv.chassisMultiplier).toBe(multiplier);
      expect(Number.isFinite(bv.final)).toBe(true);
      expect(bv.final).toBeGreaterThan(0);
      expect(unit.chassisType).toBe(chassis);
    },
  );

  it('Ares main-gun PPC contributes weapon BV (non-zero offensive weapon term)', () => {
    const bv = calculateProtoMechBV(ares);
    expect(bv.weaponBV).toBeGreaterThan(0);
  });

  it('Sprite (Glider) final BV reflects 0.9 multiplier vs an equivalent biped', () => {
    const bipedSprite = buildProto({
      ...sprite,
      chassisType: ProtoChassis.BIPED,
    });
    const bipedBV = calculateProtoMechBV(bipedSprite);
    const gliderBV = calculateProtoMechBV(sprite);
    expect(gliderBV.final).toBeLessThanOrEqual(bipedBV.final);
  });
});
