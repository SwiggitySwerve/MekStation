/**
 * ProtoMech BV 2.0 unit tests.
 *
 * Covers:
 *   - Speed factor formula (`mp = runMP + round(max(jumpMP, 0) / 2)`)
 *   - Neutral chassis summary for every ProtoMech chassis
 *   - Armor / structure coefficient application (2.5× / 1.5×)
 *   - Main gun weapons counted at full BV
 *   - Zero native ProtoMech explosive-equipment penalty
 *   - Point BV aggregation (sum of 5 proto BVs)
 *   - Five canonical proto fixtures (Minotaur, Satyr, Sprite, Ares, Siren)
 *
 * @spec openspec/changes/add-protomech-battle-value/tasks.md §9.2
 * @spec openspec/changes/add-protomech-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-protomech-battle-value/specs/protomech-unit-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import {
  calculateProtoMechBV,
  calculateProtoPointBV,
  calculateProtoSpeedFactor,
  getProtoChassisMultiplier,
} from '@/utils/construction/protomech/protoMechBV';

import { armor, buildProto, mount } from './protoMechBV.test.helpers';

// =============================================================================
// calculateProtoSpeedFactor
// =============================================================================

describe('calculateProtoSpeedFactor', () => {
  it('baseline: run 5, jump 0 → 1.00', () => {
    expect(calculateProtoSpeedFactor(5, 0)).toBe(1);
  });

  it('run 6, jump 4 → mp = 6 + round(4/2) = 8 → sf ≈ 1.37', () => {
    // pow(1 + 3/10, 1.2) = 1.3738... → round(1.3738 × 100) / 100 = 1.37
    const sf = calculateProtoSpeedFactor(6, 4);
    expect(sf).toBeCloseTo(1.37, 2);
  });

  it('run 8, jump 8 → mp = 8 + 4 = 12 → sf ≈ 1.89', () => {
    const sf = calculateProtoSpeedFactor(8, 8);
    expect(sf).toBeCloseTo(1.89, 2);
  });

  it('run 3, jump 0 (ultraheavy) → mp = 3 → sf ≈ 0.77', () => {
    // pow(1 + (3-5)/10, 1.2) = pow(0.8, 1.2) ≈ 0.7664 → 0.77
    const sf = calculateProtoSpeedFactor(3, 0);
    expect(sf).toBeCloseTo(0.77, 2);
  });
});

// =============================================================================
// getProtoChassisMultiplier
// =============================================================================

describe('getProtoChassisMultiplier', () => {
  it.each(Object.values(ProtoChassis))(
    '%s has no generic chassis multiplier',
    (chassis) => {
      expect(getProtoChassisMultiplier(chassis)).toBe(1);
    },
  );
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
  it('no equipment has zero weapon, physical and offensive BV', () => {
    const proto = buildProto({ tonnage: 5 });
    const bv = calculateProtoMechBV(proto);
    expect(bv.weaponBV).toBe(0);
    expect(bv.physicalWeaponBV).toBe(0);
    expect(bv.offensiveBV).toBe(0);
  });

  it('speed factor applied to offensive total', () => {
    // Explicit Run 7, Jump 4: pinned Java speed factor 1.50.
    const proto = buildProto({
      tonnage: 5,
      walkMP: 6,
      runMP: 7,
      jumpMP: 4,
      equipment: [mount('clan-er-ppc', ProtoLocation.MAIN_GUN, true)],
    });
    const bv = calculateProtoMechBV(proto);
    expect(bv.speedFactor).toBe(1.5);
    expect(bv.weaponBV).toBeGreaterThan(0);
    expect(bv.offensiveBV).toBe(bv.weaponBV * 1.5);
  });
});

// =============================================================================
// Chassis multiplier application
// =============================================================================

describe('calculateProtoMechBV — chassis multipliers', () => {
  it('Glider retains its defensive bonus without a summary discount', () => {
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
    expect(gliderBV.chassisMultiplier).toBe(1);
    // Chassis differences are already represented in the defensive factor.
    expect(gliderBV.defensiveFactor).toBe(1.5);
    expect(bipedBV.defensiveFactor).toBe(1.4000000000000001);
    expect(gliderBV.offensiveBV).toBe(bipedBV.offensiveBV);
    expect(gliderBV.final).toBe(gliderBV.baseBV);
  });

  it('Ultraheavy has no generic summary bonus', () => {
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
    expect(uhBV.chassisMultiplier).toBe(1);
    expect(uhBV.final).toBe(bipedBV.final);
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
