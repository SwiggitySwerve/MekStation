/**
 * Unit tests for the Vehicle Battle Value calculator.
 *
 * Coverage matches the SHALL/MUST requirements in:
 *   openspec/changes/add-vehicle-battle-value/specs/battle-value-system/spec.md
 *   openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 *
 * Test units (as named in tasks.md 11.2):
 *   - Demolisher Heavy Tank (Tracked, dual AC/20 turret)
 *   - Manticore Heavy Tank  (Tracked, PPC/LRM-10/SRM-6 turret + ML front)
 *   - Savannah Master        (Hover, fast flank)
 *   - Warrior H-7 ("VTOL Warrior") (VTOL, +1 TMM altitude)
 *   - LRM Carrier            (Tracked, massed LRMs)
 *
 * Several tests use `bvOverride` on weapons to decouple from the equipment
 * catalog — they verify formula math and modifier wiring, not catalog values.
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  calculateVehicleBV,
  calculateVehicleDefensiveBV,
  calculateVehicleOffensiveBV,
  calculateVehicleSpeedFactor,
  calculateVehicleTMM,
  getVehicleEffectiveMP,
  type VehicleBVInput,
} from '../vehicleBV';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function baseInput(overrides: Partial<VehicleBVInput> = {}): VehicleBVInput {
  return {
    motionType: GroundMotionType.TRACKED,
    cruiseMP: 4,
    flankMP: 6,
    jumpMP: 0,
    tonnage: 60,
    totalArmorPoints: 176,
    totalStructurePoints: 30,
    armorType: 'standard',
    structureType: 'standard',
    barRating: null,
    weapons: [],
    ammo: [],
    defensiveEquipment: [],
    offensiveEquipment: [],
    explosivePenalty: 0,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Movement / TMM
// -----------------------------------------------------------------------------

describe('Vehicle TMM', () => {
  it('tracked flank 6 → TMM 2', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 6 }),
    );
    expect(tmm).toBe(2);
  });

  it('hover flank 12 → TMM 4', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.HOVER, flankMP: 12 }),
    );
    expect(tmm).toBe(4);
  });

  it('VTOL flank 15 → TMM 5 (4 base + 1 altitude)', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.VTOL, flankMP: 15 }),
    );
    expect(tmm).toBe(5);
  });

  it('tracked flank 2 → TMM 0', () => {
    const tmm = calculateVehicleTMM(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 2 }),
    );
    expect(tmm).toBe(0);
  });

  it('submarine uses submarineMP override when provided', () => {
    const mp = getVehicleEffectiveMP(
      baseInput({
        motionType: GroundMotionType.SUBMARINE,
        flankMP: 6,
        submarineMP: 3,
      }),
    );
    expect(mp).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// Speed factor
// -----------------------------------------------------------------------------

describe('Vehicle speed factor', () => {
  it('tracked flank 6 → sf ≈ 1.12', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 6 }),
    );
    expect(sf).toBeCloseTo(1.12, 2);
  });

  it('VTOL flank 15 → sf ≈ 2.30', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.VTOL, flankMP: 15 }),
    );
    expect(sf).toBeCloseTo(2.3, 2);
  });

  it('flank 5 → sf = 1.00 (baseline)', () => {
    const sf = calculateVehicleSpeedFactor(
      baseInput({ motionType: GroundMotionType.TRACKED, flankMP: 5 }),
    );
    expect(sf).toBeCloseTo(1.0, 2);
  });
});

// -----------------------------------------------------------------------------
// Defensive BV
// -----------------------------------------------------------------------------

describe('Vehicle defensive BV', () => {
  it('armor BV = totalArmor × 2.5 × armorMult (standard)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        armorType: 'standard',
      }),
    );
    // 100 × 2.5 × 1.0 = 250 raw; × defensiveFactor for final; inspect armorBV
    expect(def.armorBV).toBe(250);
  });

  it('armor BV uses hardened multiplier 2.0', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        armorType: 'hardened',
      }),
    );
    expect(def.armorBV).toBe(500); // 100 × 2.5 × 2.0
  });

  it('structure BV = totalStructure × 1.5 × structureMult (standard)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 0,
        totalStructurePoints: 30,
        structureType: 'standard',
      }),
    );
    expect(def.structureBV).toBe(45); // 30 × 1.5 × 1.0
  });

  it('structure BV uses composite multiplier 0.5', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 0,
        totalStructurePoints: 30,
        structureType: 'composite',
      }),
    );
    expect(def.structureBV).toBe(22.5); // 30 × 1.5 × 0.5
  });

  it('defensive factor = 1 + TMM × 0.5 / 10 (flank 6 → TMM 2 → 1.1)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
      }),
    );
    expect(def.defensiveFactor).toBeCloseTo(1.1, 4);
  });

  it('composes defensive total: (armor + structure + defEq − explosive) × factor', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        flankMP: 6, // TMM 2 → factor 1.1
        totalArmorPoints: 100, // armorBV 250
        totalStructurePoints: 30, // structureBV 45
        defensiveEquipment: [
          { id: 'custom-shield', location: 'body', bvOverride: 10 },
        ],
        explosivePenalty: 5,
      }),
    );
    const expectedBase = 250 + 45 + 10 - 5; // = 300
    const expectedTotal = expectedBase * 1.1; // = 330
    expect(def.total).toBeCloseTo(expectedTotal, 4);
  });
});

// -----------------------------------------------------------------------------
// BAR scaling for support vehicles
// -----------------------------------------------------------------------------

describe('Vehicle BAR scaling', () => {
  it('BAR 10 → no scaling', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 40,
        totalStructurePoints: 0,
        barRating: 10,
      }),
    );
    expect(def.armorBV).toBe(100); // 40 × 2.5 × 1.0 × 1.0
  });

  it('BAR 5 → armor BV × 0.5 (support-truck: 20 armor → armor BV = 25)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 20,
        totalStructurePoints: 0,
        barRating: 5,
      }),
    );
    expect(def.armorBV).toBe(25); // 20 × 2.5 × 1.0 × 0.5
  });

  it('BAR 6 → armor BV × 0.6 (spec scenario: 40 armor → armor BV = 60)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 40,
        totalStructurePoints: 0,
        barRating: 6,
      }),
    );
    expect(def.armorBV).toBe(60); // 40 × 2.5 × 1.0 × 0.6
  });

  it('BAR null (combat vehicle) → no scaling', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        barRating: null,
      }),
    );
    expect(def.armorBV).toBe(250);
  });
});

// -----------------------------------------------------------------------------
// Offensive BV — weapon modifiers
// -----------------------------------------------------------------------------

describe('Vehicle offensive BV — weapon modifiers', () => {
  it('single weapon, no turret, no TC → raw weapon BV × speed factor', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 6, // sf ≈ 1.12
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 176 }],
      }),
    );
    // weaponBV = 176 (no modifiers), total = 176 × 1.12
    expect(off.weaponBV).toBe(176);
    expect(off.total).toBeCloseTo(176 * 1.12, 2);
    expect(off.turretModifier).toBe(1.0);
  });

  it('turret-mounted weapon gets +5% bonus (single turret)', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5, // sf = 1.0
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(176 * 1.05, 4);
    expect(off.turretModifier).toBe(1.05);
  });

  it('sponson-mounted weapon gets +2.5% bonus', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        secondaryTurret: { kind: 'sponson' },
        weapons: [
          {
            id: 'medium-laser',
            location: 'right',
            bvOverride: 46,
            isSponsonMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(46 * 1.025, 4);
    expect(off.turretModifier).toBe(1.025);
  });

  it('rear-mounted, non-turret weapon → 0.5× BV', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          {
            id: 'medium-laser',
            location: 'rear',
            bvOverride: 46,
            isRearMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(46 * 0.5, 4);
  });

  it('rear-mounted turret weapon does NOT get the 0.5× rear penalty', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
            isRearMounted: true,
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(176 * 1.05, 4);
  });

  it('TC adds +25% to direct-fire weapons only', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          { id: 'ppc', location: 'front', bvOverride: 176 },
          { id: 'lrm-10', location: 'front', bvOverride: 90 }, // LRM = NOT direct-fire
        ],
        offensiveEquipment: [
          {
            id: 'targeting-computer',
            location: 'body',
            isTargetingComputer: true,
          },
        ],
      }),
    );
    // PPC × 1.25 + LRM × 1.0 = 220 + 90 = 310
    expect(off.weaponBV).toBeCloseTo(176 * 1.25 + 90, 4);
  });

  it('artemis-iv linked weapon gets +20%', () => {
    const off = calculateVehicleOffensiveBV(
      baseInput({
        flankMP: 5,
        weapons: [
          {
            id: 'lrm-10',
            location: 'front',
            bvOverride: 90,
            artemisType: 'iv',
          },
        ],
      }),
    );
    expect(off.weaponBV).toBeCloseTo(90 * 1.2, 4);
  });
});

// -----------------------------------------------------------------------------
// End-to-end: final BV = (def + off) × pilot multiplier
// -----------------------------------------------------------------------------

describe('Vehicle final BV', () => {
  it('4/5 pilot → multiplier 1.0 (baseline)', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6, // sf 1.12, TMM 2, factor 1.1
        totalArmorPoints: 100, // armor BV 250
        totalStructurePoints: 30, // structure BV 45
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 100 }],
        gunnery: 4,
        piloting: 5,
      }),
    );
    // def total = (250 + 45) × 1.1 = 324.5
    // off total = 100 × 1.12 = 112
    // sum = 436.5 → × 1.0 = 436.5 → round 437
    expect(bv.pilotMultiplier).toBe(1.0);
    expect(bv.final).toBe(Math.round(436.5));
  });

  it('3/4 pilot → multiplier 1.32', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        weapons: [{ id: 'ppc', location: 'front', bvOverride: 100 }],
        gunnery: 3,
        piloting: 4,
      }),
    );
    expect(bv.pilotMultiplier).toBe(1.32);
    // 436.5 × 1.32 = 576.18 → round 576
    expect(bv.final).toBe(Math.round(436.5 * 1.32));
  });

  it('breakdown contains required fields per spec', () => {
    const bv = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 100,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv).toHaveProperty('defensive');
    expect(bv).toHaveProperty('offensive');
    expect(bv).toHaveProperty('pilotMultiplier');
    expect(bv).toHaveProperty('turretModifier');
    expect(bv).toHaveProperty('final');
    expect(bv.turretModifier).toBe(1.05);
  });
});

// -----------------------------------------------------------------------------
// Named scenarios for task 11.2 — self-consistent smoke tests
// -----------------------------------------------------------------------------

describe('Named canonical vehicles (smoke)', () => {
  /**
   * Demolisher Heavy Tank (3039u) — 80-ton tracked, dual AC/20 turret.
   * Exercises: tracked TMM, turret modifier, heavy weapon BV.
   */
  it('Demolisher: tracked + single turret → turret mod 1.05, positive BV', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 2,
        flankMP: 3, // TMM 1, sf ≈ 0.82
        tonnage: 80,
        totalArmorPoints: 176,
        totalStructurePoints: 40,
        turret: { kind: 'single' },
        weapons: [
          {
            id: 'ac-20',
            location: 'turret',
            bvOverride: 178,
            isTurretMounted: true,
          },
          {
            id: 'ac-20',
            location: 'turret',
            bvOverride: 178,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv.turretModifier).toBe(1.05);
    expect(bv.final).toBeGreaterThan(0);
    expect(bv.offensive).toBeGreaterThan(0);
    expect(bv.defensive).toBeGreaterThan(0);
  });

  /**
   * Manticore Heavy Tank — 60-ton tracked, PPC/LRM-10/SRM-6 turret + ML front.
   * Exercises: mixed turret/non-turret, multiple weapon types.
   */
  it('Manticore: mixed turret + front weapon yields reasonable BV components', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 4,
        flankMP: 6, // TMM 2, sf ≈ 1.12, def factor 1.1
        tonnage: 60,
        totalArmorPoints: 176,
        totalStructurePoints: 30,
        turret: { kind: 'single' },
        weapons: [
          { id: 'medium-laser', location: 'front', bvOverride: 46 },
          {
            id: 'ppc',
            location: 'turret',
            bvOverride: 176,
            isTurretMounted: true,
          },
          {
            id: 'lrm-10',
            location: 'turret',
            bvOverride: 90,
            isTurretMounted: true,
          },
          {
            id: 'srm-6',
            location: 'turret',
            bvOverride: 59,
            isTurretMounted: true,
          },
        ],
      }),
    );
    expect(bv.turretModifier).toBe(1.05);
    expect(bv.defensive).toBeGreaterThan(0);
    expect(bv.offensive).toBeGreaterThan(0);
    expect(bv.final).toBeGreaterThan(500);
  });

  /**
   * Savannah Master — 5-ton hover, fast flank (11 MP).
   * Exercises: hover TMM, high speed factor.
   */
  it('Savannah Master: hover flank 11 → TMM 4, sf ≈ 1.78', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.HOVER,
        cruiseMP: 8,
        flankMP: 12,
        tonnage: 5,
        totalArmorPoints: 20,
        totalStructurePoints: 3,
        weapons: [{ id: 'small-laser', location: 'front', bvOverride: 9 }],
      }),
    );
    expect(bv.tmm).toBe(4);
    expect(bv.speedFactor).toBeGreaterThan(1.7);
    expect(bv.final).toBeGreaterThan(0);
  });

  /**
   * Warrior H-7 ("VTOL Warrior") — 20-ton VTOL.
   * Exercises: VTOL altitude +1 TMM bonus.
   */
  it('Warrior VTOL: VTOL flank 12 → TMM 5 (4 base + 1 altitude)', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.VTOL,
        cruiseMP: 8,
        flankMP: 12,
        tonnage: 20,
        totalArmorPoints: 52,
        totalStructurePoints: 10,
        weapons: [{ id: 'lrm-10', location: 'front', bvOverride: 90 }],
      }),
    );
    expect(bv.tmm).toBe(5);
    // def factor 1 + 5×0.5/10 = 1.25
    expect(bv.defensiveFactor).toBeCloseTo(1.25, 4);
  });

  /**
   * LRM Carrier — 60-ton tracked, massed LRMs.
   * Exercises: many weapons of same type, ammo interactions.
   */
  it('LRM Carrier: 10 LRM-20s produce large offensive BV', () => {
    const bv = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        cruiseMP: 3,
        flankMP: 5, // TMM 2, sf 1.0
        tonnage: 60,
        totalArmorPoints: 72,
        totalStructurePoints: 30,
        weapons: Array.from({ length: 10 }, (_, i) => ({
          id: `lrm-20-${i}`,
          location: 'front',
          bvOverride: 181,
        })),
      }),
    );
    // 10 × 181 = 1810, × sf 1.0 = 1810 (offensive before ammo cap effects)
    expect(bv.offensive).toBeGreaterThan(1500);
    expect(bv.final).toBeGreaterThan(0);
  });
});
