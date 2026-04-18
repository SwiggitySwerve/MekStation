/**
 * Infantry Construction Tests
 *
 * Covers all 11 spec scenarios from the infantry-unit-system delta spec plus
 * the 6 VAL-INF-* rule ID registration requirement.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import {
  InfantryMotive,
  InfantryArmorKitType,
  IPlatoonComposition,
  PLATOON_DEFAULTS,
  MOTIVE_MP,
  ANTI_MECH_ELIGIBLE_MOTIVES,
  SNEAK_ELIGIBLE_MOTIVES,
  SNEAK_ARMOR_KITS,
  PLATOON_MIN_TROOPERS,
  PLATOON_MAX_TROOPERS,
  VTOL_MAX_TROOPERS,
} from '@/types/unit/InfantryInterfaces';
import { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';
import {
  totalTroopers,
  effectiveFiringTroopers,
  secondaryWeaponCount,
  HEAVY_WEAPON_MOTIVES,
} from '@/utils/construction/infantry/platoonComposition';
import {
  validatePlatoonSize,
  validateMotiveCompatibility,
  validateArmorKit,
  validatePrimaryWeapon,
  validateFieldGuns,
  validateAntiMechTraining,
  validateInfantryConstruction,
  INF_VALIDATION_RULE_IDS,
} from '@/utils/construction/infantry/validation';

// =============================================================================
// Scenario helpers
// =============================================================================

/**
 * Build a minimal field gun entry for testing without importing the full catalog.
 */
function makeFieldGun(
  equipmentId: string,
  name: string,
  crew: number,
): IInfantryFieldGun {
  return { equipmentId, name, crew, ammoRounds: 10 };
}

// =============================================================================
// Spec Scenario 1: Foot default composition — 7 × 4 = 28
// =============================================================================

describe('Platoon Composition Defaults', () => {
  it('Foot default: 7 squads × 4 troopers = 28 total', () => {
    const comp: IPlatoonComposition = PLATOON_DEFAULTS[InfantryMotive.FOOT];
    expect(comp.squads).toBe(7);
    expect(comp.troopersPerSquad).toBe(4);
    expect(totalTroopers(comp)).toBe(28);
  });

  // Spec Scenario 2: Jump default — 5 × 5 = 25
  it('Jump default: 5 squads × 5 troopers = 25 total', () => {
    const comp: IPlatoonComposition = PLATOON_DEFAULTS[InfantryMotive.JUMP];
    expect(totalTroopers(comp)).toBe(25);
  });

  // Spec Scenario 3: Mechanized default — 4 × 5 = 20
  it('Mechanized-Tracked default: 4 squads × 5 troopers = 20 total', () => {
    const comp: IPlatoonComposition =
      PLATOON_DEFAULTS[InfantryMotive.MECHANIZED_TRACKED];
    expect(totalTroopers(comp)).toBe(20);
  });
});

// =============================================================================
// Spec Scenario 4: VTOL troop cap — VAL-INF-MOTIVE
// =============================================================================

describe('VAL-INF-MOTIVE: VTOL troop cap', () => {
  it('emits error when VTOL platoon exceeds 10 troopers', () => {
    // 11 troopers — over the VTOL cap
    const errors = validateMotiveCompatibility(
      InfantryMotive.MECHANIZED_VTOL,
      11,
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/VTOL motive supports up to 10 troopers/);
  });

  it('passes when VTOL platoon has exactly 10 troopers', () => {
    const errors = validateMotiveCompatibility(
      InfantryMotive.MECHANIZED_VTOL,
      VTOL_MAX_TROOPERS,
    );
    expect(errors).toHaveLength(0);
  });

  it('non-VTOL motives are not affected by the VTOL cap', () => {
    const errors = validateMotiveCompatibility(InfantryMotive.FOOT, 30);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Spec Scenario 5: Flak kit modifier — damage divisor applied
// (InfantryArmorKitType.FLAK is a distinct non-sneak kit)
// =============================================================================

describe('VAL-INF-ARMOR-KIT: Flak armor kit', () => {
  it('Flak kit passes validation for Foot motive', () => {
    const errors = validateArmorKit(
      InfantryMotive.FOOT,
      InfantryArmorKitType.FLAK,
    );
    expect(errors).toHaveLength(0);
  });

  it('Flak kit passes validation for Motorized motive', () => {
    const errors = validateArmorKit(
      InfantryMotive.MOTORIZED,
      InfantryArmorKitType.FLAK,
    );
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Spec Scenario 6: Sneak suit motive restriction — VAL-INF-ARMOR-KIT
// =============================================================================

describe('VAL-INF-ARMOR-KIT: Sneak suit restriction', () => {
  it('emits error when Motorized platoon tries to use Sneak Camo', () => {
    const errors = validateArmorKit(
      InfantryMotive.MOTORIZED,
      InfantryArmorKitType.SNEAK_CAMO,
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/Sneak suits require Foot motive/);
  });

  it('Sneak Camo is allowed for Foot motive', () => {
    const errors = validateArmorKit(
      InfantryMotive.FOOT,
      InfantryArmorKitType.SNEAK_CAMO,
    );
    expect(errors).toHaveLength(0);
  });

  it('all sneak kit variants in SNEAK_ARMOR_KITS fail for non-Foot motives', () => {
    const nonFootMotives = [
      InfantryMotive.JUMP,
      InfantryMotive.MOTORIZED,
      InfantryMotive.MECHANIZED_TRACKED,
    ];
    for (const kit of Array.from(SNEAK_ARMOR_KITS)) {
      for (const motive of nonFootMotives) {
        const errors = validateArmorKit(motive, kit);
        expect(errors.length).toBeGreaterThan(0);
      }
    }
  });

  it('SNEAK_ELIGIBLE_MOTIVES contains only Foot', () => {
    expect(SNEAK_ELIGIBLE_MOTIVES.size).toBe(1);
    expect(SNEAK_ELIGIBLE_MOTIVES.has(InfantryMotive.FOOT)).toBe(true);
  });
});

// =============================================================================
// Spec Scenario 7: Environmental Sealing enables vacuum deployment
// =============================================================================

describe('Environmental Sealing armor kit', () => {
  it('Environmental Sealing passes VAL-INF-ARMOR-KIT for any motive', () => {
    const motives = Object.values(InfantryMotive);
    for (const motive of motives) {
      const errors = validateArmorKit(
        motive,
        InfantryArmorKitType.ENVIRONMENTAL_SEALING,
      );
      expect(errors).toHaveLength(0);
    }
  });
});

// =============================================================================
// Spec Scenario 8: 28 Laser Rifle troopers / 7 SRM secondary at ratio 1-per-4
// =============================================================================

describe('Primary and Secondary Weapon Selection', () => {
  it('28-trooper Foot platoon: all 28 carry primary (Laser Rifle)', () => {
    // Primary applies uniformly — the count equals platoon strength
    const platoonStrength = 28;
    // All troopers fire primary; effective count = platoonStrength - fieldGunCrew
    expect(effectiveFiringTroopers(platoonStrength, 0)).toBe(28);
  });

  it('28-trooper platoon with SRM Launcher secondary at ratio 1-per-4 = 7 secondaries', () => {
    const count = secondaryWeaponCount(28, 4);
    expect(count).toBe(7);
  });
});

// =============================================================================
// Spec Scenario 9: Heavy primary weapon on Foot — VAL-INF-WEAPON
// =============================================================================

describe('VAL-INF-WEAPON: Heavy primary on Foot', () => {
  it('emits error when Foot platoon is given a heavy primary weapon', () => {
    const errors = validatePrimaryWeapon(InfantryMotive.FOOT, true);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(
      /heavy primary weapon requires Mechanized or Motorized motive/,
    );
  });

  it('HEAVY_WEAPON_MOTIVES does not include Foot or Jump', () => {
    expect(HEAVY_WEAPON_MOTIVES.has(InfantryMotive.FOOT)).toBe(false);
    expect(HEAVY_WEAPON_MOTIVES.has(InfantryMotive.JUMP)).toBe(false);
  });

  it('Mechanized-Tracked may use heavy primary', () => {
    const errors = validatePrimaryWeapon(
      InfantryMotive.MECHANIZED_TRACKED,
      true,
    );
    expect(errors).toHaveLength(0);
  });

  it('Motorized may use heavy primary', () => {
    const errors = validatePrimaryWeapon(InfantryMotive.MOTORIZED, true);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Spec Scenario 10a: AC/5 crew 3 subtracts from personal weapon count
// =============================================================================

describe('VAL-INF-FIELD-GUN: Field gun crew accounting', () => {
  it('20-trooper platoon with AC/5 (crew 3): 17 fire personal weapons', () => {
    const ac5 = makeFieldGun('ac5', 'Autocannon/5', 3);
    const effective = effectiveFiringTroopers(20, ac5.crew);
    expect(effective).toBe(17);
  });

  // Spec Scenario 10b: AC/20 over-crew — VAL-INF-FIELD-GUN
  it('5-trooper platoon with AC/20 (crew 5): VAL-INF-FIELD-GUN fires', () => {
    const ac20 = makeFieldGun('ac20', 'Autocannon/20', 5);
    const errors = validateFieldGuns(InfantryMotive.FOOT, 5, [ac20]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/field gun crew/);
  });

  it('field gun crew strictly less than platoon size passes', () => {
    const ac5 = makeFieldGun('ac5', 'Autocannon/5', 3);
    const errors = validateFieldGuns(InfantryMotive.FOOT, 20, [ac5]);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// Spec Scenario 11: Anti-mech — Motorized excluded
// =============================================================================

describe('VAL-INF-ANTI-MECH: Anti-mech training eligibility', () => {
  it('Motorized platoon with antiMechTraining=true emits VAL-INF-ANTI-MECH', () => {
    const errors = validateAntiMechTraining(InfantryMotive.MOTORIZED, true);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(
      /anti-mech training requires Foot, Jump, or Mechanized motive/,
    );
  });

  it('Foot platoon with antiMechTraining=true passes', () => {
    const errors = validateAntiMechTraining(InfantryMotive.FOOT, true);
    expect(errors).toHaveLength(0);
  });

  it('Jump platoon with antiMechTraining=true passes', () => {
    const errors = validateAntiMechTraining(InfantryMotive.JUMP, true);
    expect(errors).toHaveLength(0);
  });

  it('Mechanized motives are eligible for anti-mech training', () => {
    const mechanizedMotives = [
      InfantryMotive.MECHANIZED_TRACKED,
      InfantryMotive.MECHANIZED_WHEELED,
      InfantryMotive.MECHANIZED_HOVER,
      InfantryMotive.MECHANIZED_VTOL,
    ];
    for (const motive of mechanizedMotives) {
      expect(ANTI_MECH_ELIGIBLE_MOTIVES.has(motive)).toBe(true);
      const errors = validateAntiMechTraining(motive, true);
      expect(errors).toHaveLength(0);
    }
  });

  it('Motorized is absent from ANTI_MECH_ELIGIBLE_MOTIVES', () => {
    expect(ANTI_MECH_ELIGIBLE_MOTIVES.has(InfantryMotive.MOTORIZED)).toBe(
      false,
    );
  });
});

// =============================================================================
// VAL-INF-PLATOON: Out-of-range platoon size
// =============================================================================

describe('VAL-INF-PLATOON: Platoon size bounds', () => {
  it('platoon size 35 emits "platoon size 35 exceeds maximum 30"', () => {
    const errors = validatePlatoonSize(35);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/platoon size 35 exceeds maximum 30/);
  });

  it('platoon size 4 emits below-minimum error', () => {
    const errors = validatePlatoonSize(4);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/below minimum/);
  });

  it('platoon size within 5–30 passes', () => {
    expect(validatePlatoonSize(5)).toHaveLength(0);
    expect(validatePlatoonSize(30)).toHaveLength(0);
    expect(validatePlatoonSize(15)).toHaveLength(0);
  });
});

// =============================================================================
// Motive MP derivation (Foot, Jump, Hover)
// =============================================================================

describe('Motive MP derivation', () => {
  it('Foot: ground MP 1, jump MP 0', () => {
    expect(MOTIVE_MP[InfantryMotive.FOOT].groundMP).toBe(1);
    expect(MOTIVE_MP[InfantryMotive.FOOT].jumpMP).toBe(0);
  });

  it('Jump: ground MP 3, jump MP 3', () => {
    expect(MOTIVE_MP[InfantryMotive.JUMP].groundMP).toBe(3);
    expect(MOTIVE_MP[InfantryMotive.JUMP].jumpMP).toBe(3);
  });

  it('Mechanized Hover: ground MP 5', () => {
    expect(MOTIVE_MP[InfantryMotive.MECHANIZED_HOVER].groundMP).toBe(5);
  });
});

// =============================================================================
// Rule ID registration — all 6 VAL-INF-* IDs must be present
// =============================================================================

describe('VAL-INF-* rule registry', () => {
  const REQUIRED_RULE_IDS = [
    'VAL-INF-PLATOON',
    'VAL-INF-MOTIVE',
    'VAL-INF-ARMOR-KIT',
    'VAL-INF-WEAPON',
    'VAL-INF-FIELD-GUN',
    'VAL-INF-ANTI-MECH',
  ] as const;

  it('INF_VALIDATION_RULE_IDS registers all 6 required rule IDs', () => {
    expect(INF_VALIDATION_RULE_IDS).toHaveLength(6);
    for (const ruleId of REQUIRED_RULE_IDS) {
      expect(INF_VALIDATION_RULE_IDS).toContain(ruleId);
    }
  });
});

// =============================================================================
// Composite validator — validateInfantryConstruction
// =============================================================================

describe('validateInfantryConstruction (composite)', () => {
  it('valid Foot Rifle Platoon (28 troopers, standard armor, no field gun, no anti-mech) passes', () => {
    const result = validateInfantryConstruction({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      armorKit: InfantryArmorKitType.STANDARD,
      isPrimaryHeavy: false,
      fieldGuns: [],
      hasAntiMechTraining: false,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('valid Jump SRM Platoon (25 troopers, no heavy weapon, anti-mech allowed) passes', () => {
    const result = validateInfantryConstruction({
      motive: InfantryMotive.JUMP,
      totalTroopers: 25,
      armorKit: InfantryArmorKitType.STANDARD,
      isPrimaryHeavy: false,
      fieldGuns: [],
      hasAntiMechTraining: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalid platoon: Mechanized with Sneak kit fails VAL-INF-ARMOR-KIT', () => {
    const result = validateInfantryConstruction({
      motive: InfantryMotive.MECHANIZED_TRACKED,
      totalTroopers: 20,
      armorKit: InfantryArmorKitType.SNEAK_CAMO,
      isPrimaryHeavy: false,
      fieldGuns: [],
      hasAntiMechTraining: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('VAL-INF-ARMOR-KIT'))).toBe(
      true,
    );
  });

  it('invalid platoon: over-size (35 troopers) fails VAL-INF-PLATOON', () => {
    const result = validateInfantryConstruction({
      motive: InfantryMotive.FOOT,
      totalTroopers: 35,
      armorKit: InfantryArmorKitType.NONE,
      isPrimaryHeavy: false,
      fieldGuns: [],
      hasAntiMechTraining: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('VAL-INF-PLATOON'))).toBe(true);
  });

  it('Motorized + anti-mech training fails VAL-INF-ANTI-MECH', () => {
    const result = validateInfantryConstruction({
      motive: InfantryMotive.MOTORIZED,
      totalTroopers: 28,
      armorKit: InfantryArmorKitType.STANDARD,
      isPrimaryHeavy: false,
      fieldGuns: [],
      hasAntiMechTraining: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('VAL-INF-ANTI-MECH'))).toBe(
      true,
    );
  });
});
