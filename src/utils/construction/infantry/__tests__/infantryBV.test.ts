/**
 * Unit tests for the Infantry Battle Value calculator.
 *
 * Coverage is organized to match the SHALL/MUST requirements in:
 *   openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 *   openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 *
 * Test units (as named in tasks.md 8.2):
 *   - Foot Rifle Platoon — baseline motive × 1.0, no extras.
 *   - Jump SRM Platoon — motive 1.1, secondary ratio scaling.
 *   - Mechanized MG Platoon — motive 1.15, heavy primary.
 *   - Field Gun AC/5 Platoon — field gun + ammo pathway.
 *
 * All weapon BV values in these tests use `bvOverride` so the tests verify
 * formula math and modifier wiring without coupling to the live equipment
 * catalog. The adapter-level tests exercise catalog-resolved IDs separately.
 */

import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import {
  calculateInfantryBV,
  calculateInfantryFieldGunBV,
  calculateInfantryPerTrooperBV,
  calculateInfantryPrimaryBV,
  calculateInfantrySecondaryBV,
  getInfantryMotiveMultiplier,
  getInfantryPilotMultiplier,
  type InfantryBVInput,
  type InfantryWeaponRef,
} from '../infantryBV';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function baseInput(overrides: Partial<InfantryBVInput> = {}): InfantryBVInput {
  return {
    motive: InfantryMotive.FOOT,
    totalTroopers: 28,
    primaryWeapon: {
      id: 'inf-laser-rifle',
      bvOverride: 12,
      damageDivisor: 1,
    },
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

// =============================================================================
// Requirement: Infantry Per-Trooper BV — primary weapon contribution
// =============================================================================

describe('Infantry Per-Trooper BV — Primary Weapon (spec.md §Primary weapon contribution)', () => {
  it('primary Laser Rifle (BV 12, divisor 1) contributes 12', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-laser-rifle',
      bvOverride: 12,
      damageDivisor: 1,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(12);
  });

  it('higher damage divisor divides weapon BV proportionally', () => {
    // Rifle with divisor 10 — contributes 1/10 the weapon BV per trooper.
    const weapon: InfantryWeaponRef = {
      id: 'inf-rifle',
      bvOverride: 30,
      damageDivisor: 10,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(3);
  });

  it('returns 0 when damage divisor is 0 (defensive guard)', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-broken',
      bvOverride: 50,
      damageDivisor: 0,
    };
    expect(calculateInfantryPrimaryBV(weapon)).toBe(0);
  });
});

// =============================================================================
// Requirement: Secondary ratio scaling
// =============================================================================

describe('Infantry Per-Trooper BV — Secondary Ratio (spec.md §Secondary ratio scaling)', () => {
  it('secondary SRM launcher (BV 25, divisor 1) at ratio 4 = 6.25', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 1,
      secondaryRatio: 4,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBeCloseTo(6.25, 5);
  });

  it('returns 0 when secondary weapon is undefined', () => {
    expect(calculateInfantrySecondaryBV(undefined)).toBe(0);
  });

  it('returns 0 when ratio is 0', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 1,
      secondaryRatio: 0,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBe(0);
  });

  it('divides by both damageDivisor and ratio (SRM BV 25, div 6, ratio 4)', () => {
    const weapon: InfantryWeaponRef = {
      id: 'inf-srm2',
      bvOverride: 25,
      damageDivisor: 6,
      secondaryRatio: 4,
    };
    expect(calculateInfantrySecondaryBV(weapon)).toBeCloseTo(
      (25 / 6) * (1 / 4),
      5,
    );
  });
});

// =============================================================================
// Requirement: Armor kit modifier
// =============================================================================

describe('Infantry Per-Trooper BV — Armor Kit Modifier (spec.md §Armor kit modifier)', () => {
  it('Sneak Camo adds 3 BV per trooper', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.SNEAK_CAMO,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 12,
        damageDivisor: 1,
      },
    });
    // primary (12) + secondary (0) + sneak-camo (3) = 15
    expect(calculateInfantryPerTrooperBV(input)).toBe(15);
  });

  it('Flak kit adds 2 BV per trooper', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.FLAK,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 10,
        damageDivisor: 10,
      },
    });
    // primary (1) + flak (2) = 3
    expect(calculateInfantryPerTrooperBV(input)).toBe(3);
  });

  it('NONE kit contributes 0 BV', () => {
    const input = baseInput({ armorKit: InfantryArmorKit.NONE });
    // primary 12 + no kit = 12
    expect(calculateInfantryPerTrooperBV(input)).toBe(12);
  });

  it('clamps per-trooper BV at 0 (never negative)', () => {
    const input = baseInput({
      armorKit: InfantryArmorKit.NONE,
      primaryWeapon: {
        id: 'inf-bad',
        bvOverride: -100,
        damageDivisor: 1,
      },
    });
    expect(calculateInfantryPerTrooperBV(input)).toBe(0);
  });
});

// =============================================================================
// Requirement: Platoon BV with motive multiplier
// =============================================================================

describe('Infantry Platoon BV — Motive Multiplier (spec.md §Infantry Platoon BV with Motive Multiplier)', () => {
  it('Foot multiplier = 1.0', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.FOOT)).toBe(1.0);
  });

  it('Jump multiplier = 1.1', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.JUMP)).toBe(1.1);
  });

  it('Motorized multiplier = 1.05', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.MOTORIZED)).toBe(1.05);
  });

  it('Mechanized variants all = 1.15', () => {
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_TRACKED)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_WHEELED)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_HOVER)).toBe(
      1.15,
    );
    expect(getInfantryMotiveMultiplier(InfantryMotive.MECHANIZED_VTOL)).toBe(
      1.15,
    );
  });

  it('Foot 28-trooper perTrooperBV 15 -> platoonBV 420 (pre-pilot)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      // use a gunnery/piloting pair that multiplies by exactly 1.0 so final == platoonBV
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.perTrooper).toBe(15);
    expect(result.platoonBV).toBeCloseTo(420, 5);
    // with 4/5 gunnery/piloting, pilotMultiplier = 1.0, so final rounds to 420
    expect(result.final).toBe(420);
  });

  it('Mechanized 20-trooper perTrooperBV 20 -> platoonBV 460', () => {
    const input = baseInput({
      motive: InfantryMotive.MECHANIZED_TRACKED,
      totalTroopers: 20,
      primaryWeapon: {
        id: 'inf-mg',
        bvOverride: 20,
        damageDivisor: 1,
      },
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    // 20 × 20 × 1.15 = 460
    expect(result.platoonBV).toBeCloseTo(460, 5);
    expect(result.final).toBe(460);
  });
});

// =============================================================================
// Requirement: Anti-mech training multiplier
// =============================================================================

describe('Infantry Anti-Mech Training Multiplier (spec.md §Infantry Anti-Mech Training Multiplier)', () => {
  it('trained Foot platoonBV 420 becomes 462 (×1.1)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      hasAntiMechTraining: true,
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.antiMechMultiplier).toBe(1.1);
    expect(result.platoonBV).toBeCloseTo(462, 5);
  });

  it('untrained multiplier = 1.0', () => {
    const input = baseInput({ hasAntiMechTraining: false });
    const result = calculateInfantryBV(input);
    expect(result.antiMechMultiplier).toBe(1.0);
  });
});

// =============================================================================
// Requirement: Field gun BV addition
// =============================================================================

describe('Infantry Field Gun BV Addition (spec.md §Infantry Field Gun BV Addition)', () => {
  it('AC/5 field gun contributes weapon BV 70 + ammo BV (capped)', () => {
    // Use override to simulate "AC/5 BV 70" + "1 bin ammo BV 9".
    // Excessive cap: ammoBV <= weaponBV → 9 ≤ 70, full 9 counts.
    const result = calculateInfantryFieldGunBV([
      {
        id: 'ac5',
        bvOverride: 70,
        ammo: [
          {
            id: 'isammoac5',
            bvOverride: 9,
            weaponTypeOverride: 'ac5',
          },
        ],
      },
    ]);
    expect(result.weaponBV).toBe(70);
    expect(result.ammoBV).toBe(9);
    expect(result.total).toBe(79);
  });

  it('caps excessive ammo BV at weapon BV', () => {
    const result = calculateInfantryFieldGunBV([
      {
        id: 'ac5',
        bvOverride: 70,
        ammo: [
          {
            id: 'isammoac5',
            bvOverride: 500, // intentionally huge
            weaponTypeOverride: 'ac5',
          },
        ],
      },
    ]);
    expect(result.weaponBV).toBe(70);
    // ammo capped at weapon BV = 70
    expect(result.ammoBV).toBe(70);
    expect(result.total).toBe(140);
  });

  it('returns zero when no field guns are supplied', () => {
    expect(calculateInfantryFieldGunBV(undefined)).toEqual({
      weaponBV: 0,
      ammoBV: 0,
      total: 0,
    });
    expect(calculateInfantryFieldGunBV([])).toEqual({
      weaponBV: 0,
      ammoBV: 0,
      total: 0,
    });
  });

  it('field gun BV is added to platoonBV before pilot multiplier', () => {
    // Foot platoon 28 × perTrooper 10 × 1.0 = 280 → + 79 AC/5 = 359
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 10,
        damageDivisor: 1,
      },
      fieldGuns: [
        {
          id: 'ac5',
          bvOverride: 70,
          ammo: [
            {
              id: 'isammoac5',
              bvOverride: 9,
              weaponTypeOverride: 'ac5',
            },
          ],
        },
      ],
      gunnery: 4,
      piloting: 5,
    });
    const result = calculateInfantryBV(input);
    expect(result.fieldGunBV).toBe(79);
    expect(result.platoonBV).toBeCloseTo(359, 5);
    expect(result.final).toBe(359);
  });
});

// =============================================================================
// Requirement: Infantry BV Dispatch — top-level calculator
// =============================================================================

describe('Infantry BV Dispatch (spec.md §Infantry BV Dispatch)', () => {
  it('calculateInfantryBV returns IInfantryBVBreakdown shape', () => {
    const result = calculateInfantryBV(baseInput());
    // Spec: must include perTrooper, motiveMultiplier, antiMechMultiplier,
    //       fieldGunBV, platoonBV, pilotMultiplier, final
    expect(result).toHaveProperty('perTrooper');
    expect(result).toHaveProperty('motiveMultiplier');
    expect(result).toHaveProperty('antiMechMultiplier');
    expect(result).toHaveProperty('fieldGunBV');
    expect(result).toHaveProperty('platoonBV');
    expect(result).toHaveProperty('pilotMultiplier');
    expect(result).toHaveProperty('final');
  });
});

// =============================================================================
// Pilot multiplier
// =============================================================================

describe('Infantry Pilot Multiplier', () => {
  it('defaults to 4/5 gunnery/piloting (= 1.0 baseline)', () => {
    expect(getInfantryPilotMultiplier(undefined, undefined)).toBe(1.0);
  });

  it('uses shared 9x9 matrix — 3/4 gunnery/piloting > 1.0', () => {
    const m = getInfantryPilotMultiplier(3, 4);
    expect(m).toBeGreaterThan(1.0);
  });

  it('final BV = round(platoonBV * pilotMultiplier)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      gunnery: 3,
      piloting: 4,
    });
    const result = calculateInfantryBV(input);
    const expected = Math.round(result.platoonBV * result.pilotMultiplier);
    expect(result.final).toBe(expected);
  });
});

// =============================================================================
// Test fixtures from tasks.md 8.2
// =============================================================================

describe('Tasks.md 8.2 fixtures end-to-end', () => {
  it('Foot Rifle Platoon computes a non-zero final BV', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 1.5,
        damageDivisor: 10,
      },
      armorKit: InfantryArmorKit.NONE,
    });
    const result = calculateInfantryBV(input);
    expect(result.final).toBeGreaterThan(0);
    // 28 × 0.15 × 1.0 = 4.2 platoon → final round = 4
    expect(result.perTrooper).toBeCloseTo(0.15, 5);
    expect(result.platoonBV).toBeCloseTo(4.2, 5);
  });

  it('Jump SRM Platoon applies motive 1.1 + secondary ratio', () => {
    const input = baseInput({
      motive: InfantryMotive.JUMP,
      totalTroopers: 25,
      primaryWeapon: {
        id: 'inf-auto-rifle',
        bvOverride: 2,
        damageDivisor: 10,
      },
      secondaryWeapon: {
        id: 'inf-srm2',
        bvOverride: 25,
        damageDivisor: 6,
        secondaryRatio: 4,
      },
    });
    const result = calculateInfantryBV(input);
    // primary = 2/10 = 0.2; secondary = 25/6/4 ≈ 1.0417
    // perTrooper ≈ 1.2417; platoon = 1.2417 × 25 × 1.1 ≈ 34.15
    expect(result.motiveMultiplier).toBe(1.1);
    expect(result.perTrooper).toBeCloseTo(0.2 + (25 / 6) * (1 / 4), 5);
  });

  it('Mechanized MG Platoon applies motive 1.15', () => {
    const input = baseInput({
      motive: InfantryMotive.MECHANIZED_TRACKED,
      totalTroopers: 20,
      primaryWeapon: {
        id: 'inf-mg',
        bvOverride: 5,
        damageDivisor: 10,
      },
      armorKit: InfantryArmorKit.FLAK,
    });
    const result = calculateInfantryBV(input);
    expect(result.motiveMultiplier).toBe(1.15);
    // perTrooper = 0.5 + 2 (flak) = 2.5
    expect(result.perTrooper).toBeCloseTo(2.5, 5);
  });

  it('Foot Field Gun AC/5 adds full gun BV to platoon total', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-rifle',
        bvOverride: 1.5,
        damageDivisor: 10,
      },
      fieldGuns: [
        {
          id: 'ac5',
          bvOverride: 70,
          ammo: [
            {
              id: 'isammoac5',
              bvOverride: 9,
              weaponTypeOverride: 'ac5',
            },
          ],
        },
      ],
    });
    const result = calculateInfantryBV(input);
    expect(result.fieldGunBV).toBe(79);
    // Platoon = (28 × 0.15 × 1.0) + 79 = 4.2 + 79 = 83.2
    expect(result.platoonBV).toBeCloseTo(83.2, 5);
  });
});
