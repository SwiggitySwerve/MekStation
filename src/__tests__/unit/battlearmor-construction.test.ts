/**
 * Battle Armor Construction — Unit Tests
 *
 * Covers all VAL-BA-* rule IDs from the construction pipeline.
 * Each describe block maps to one area of the spec delta.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 */

import {
  BAArmorType,
  BAChassisType,
  BALocation,
  BAManipulator,
  BAMovementType,
  BAWeightClass,
  BA_VALIDATION_RULES,
  BA_WEIGHT_CLASS_LIMITS,
  defaultSquadSize,
  BA_SQUAD_SIZE_MIN,
  BA_SQUAD_SIZE_MAX,
  IBattleArmorUnit,
  IBAWeaponMount,
  IBAEquipmentMount,
} from "@/types/unit/BattleArmorInterfaces";

import { TechBase } from "@/types/enums/TechBase";

import {
  validateBattleArmorConstruction,
  registeredBARules,
} from "@/utils/construction/battlearmor/validation";

import {
  validateArmor,
  armorMassKg,
} from "@/utils/construction/battlearmor/armor";
import { computeTrooperMass } from "@/utils/construction/battlearmor/mass";
import {
  validateMovement,
  validateJumpMP,
} from "@/utils/construction/battlearmor/movement";
import { validateSquadSize } from "@/utils/construction/battlearmor/squad";
import {
  validateAllManipulatorCompatibility,
  manipulatorMassKg,
} from "@/utils/construction/battlearmor/manipulators";
import {
  getSlotCapacity,
  isArmLocation,
} from "@/utils/construction/battlearmor/chassis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid IBattleArmorUnit for the given weight class */
function makeUnit(overrides: Partial<IBattleArmorUnit> = {}): IBattleArmorUnit {
  return {
    id: "test-unit",
    name: "Test BA",
    chassis: "Test",
    model: "",
    techBase: TechBase.INNER_SPHERE,
    chassisType: BAChassisType.BIPED,
    weightClass: BAWeightClass.MEDIUM,
    squadSize: 4,
    movementType: BAMovementType.JUMP,
    groundMP: 1,
    jumpMP: 3,
    umuMP: 0,
    hasMechanicalJumpBoosters: false,
    armorType: BAArmorType.STANDARD,
    armorPointsPerTrooper: 5,
    leftManipulator: BAManipulator.BASIC_CLAW,
    rightManipulator: BAManipulator.BASIC_CLAW,
    weapons: [],
    equipment: [],
    hasMagneticClamp: false,
    hasMechanicalJumpBooster: false,
    hasPartialWing: false,
    hasDetachableWeaponPack: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Trooper mass — weight class representative samples
// ---------------------------------------------------------------------------

describe("Trooper mass (BA_WEIGHT_CLASS_LIMITS)", () => {
  test("PA(L) max mass is 400 kg", () => {
    expect(BA_WEIGHT_CLASS_LIMITS[BAWeightClass.PA_L].maxMassKg).toBe(400);
  });

  test("Medium max mass is 1000 kg", () => {
    expect(BA_WEIGHT_CLASS_LIMITS[BAWeightClass.MEDIUM].maxMassKg).toBe(1000);
  });

  test("Assault max mass is 2000 kg", () => {
    expect(BA_WEIGHT_CLASS_LIMITS[BAWeightClass.ASSAULT].maxMassKg).toBe(2000);
  });

  test("computeTrooperMass — standard armor + no extras stays well within Medium range", () => {
    // 5 pts Standard armor = 250 kg; no manipulators, no weapons → 250 kg total
    const breakdown = computeTrooperMass(
      5,
      BAArmorType.STANDARD,
      BAChassisType.BIPED,
      BAManipulator.NONE,
      BAManipulator.NONE,
      [],
      [],
    );
    expect(breakdown.armorMass).toBe(250);
    expect(breakdown.totalMass).toBe(250);
    expect(breakdown.totalMass).toBeLessThanOrEqual(
      BA_WEIGHT_CLASS_LIMITS[BAWeightClass.MEDIUM].maxMassKg,
    );
  });

  test("VAL-BA-CLASS fires when trooper mass exceeds class cap", () => {
    // Assault max = 2000 kg; 15 pts Standard armor = 750 kg, two Heavy Claws = 50 kg
    // Add a weapon of 1400 kg to push over the cap
    const heavyWeapon: IBAWeaponMount = {
      equipmentId: "fake-heavy",
      name: "Over-Cap Weapon",
      location: BALocation.BODY,
      massKg: 1400,
      weaponWeight: "heavy",
      isAPWeapon: false,
    };
    const unit = makeUnit({
      weightClass: BAWeightClass.ASSAULT,
      armorPointsPerTrooper: 14, // 14 × 50 = 700 kg
      weapons: [heavyWeapon], // 1400 kg → total 2100 kg > 2000 cap
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes(BA_VALIDATION_RULES.VAL_BA_CLASS)),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Armor cap per weight class
// ---------------------------------------------------------------------------

describe("Armor cap (VAL-BA-ARMOR)", () => {
  const cases: [BAWeightClass, number][] = [
    [BAWeightClass.PA_L, 2],
    [BAWeightClass.LIGHT, 5],
    [BAWeightClass.MEDIUM, 8],
    [BAWeightClass.HEAVY, 10],
    [BAWeightClass.ASSAULT, 14],
  ];

  test.each(cases)("%s max armor points is %i", (wc, cap) => {
    expect(BA_WEIGHT_CLASS_LIMITS[wc].maxArmorPoints).toBe(cap);
  });

  test("validateArmor passes at exactly the cap", () => {
    const result = validateArmor(
      BA_WEIGHT_CLASS_LIMITS[BAWeightClass.MEDIUM].maxArmorPoints,
      BAArmorType.STANDARD,
      BAWeightClass.MEDIUM,
    );
    expect(result.isValid).toBe(true);
  });

  test("validateArmor fails one point above the cap", () => {
    const cap = BA_WEIGHT_CLASS_LIMITS[BAWeightClass.PA_L].maxArmorPoints;
    const result = validateArmor(
      cap + 1,
      BAArmorType.STANDARD,
      BAWeightClass.PA_L,
    );
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/VAL-BA-ARMOR/);
  });

  test("Mimetic armor forbidden on Heavy", () => {
    const result = validateArmor(5, BAArmorType.MIMETIC, BAWeightClass.HEAVY);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("VAL-BA-ARMOR"))).toBe(true);
  });

  test("Mimetic armor forbidden on Assault", () => {
    const result = validateArmor(5, BAArmorType.MIMETIC, BAWeightClass.ASSAULT);
    expect(result.isValid).toBe(false);
  });

  test("Mimetic armor allowed on Light", () => {
    const result = validateArmor(3, BAArmorType.MIMETIC, BAWeightClass.LIGHT);
    expect(result.isValid).toBe(true);
  });

  test("armorMassKg: Stealth costs 60 kg/pt", () => {
    expect(armorMassKg(4, BAArmorType.STEALTH_BASIC)).toBe(240);
  });

  test("armorMassKg: Standard costs 50 kg/pt", () => {
    expect(armorMassKg(6, BAArmorType.STANDARD)).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// 3. Movement MP caps
// ---------------------------------------------------------------------------

describe("Movement MP caps (VAL-BA-MP / VAL-BA-MOVE-TYPE)", () => {
  test.each([
    [BAWeightClass.PA_L, 3],
    [BAWeightClass.LIGHT, 3],
    [BAWeightClass.MEDIUM, 2],
    [BAWeightClass.HEAVY, 2],
    [BAWeightClass.ASSAULT, 1],
  ] as [BAWeightClass, number][])("%s max ground MP is %i", (wc, cap) => {
    expect(BA_WEIGHT_CLASS_LIMITS[wc].maxGroundMP).toBe(cap);
  });

  test.each([
    [BAWeightClass.PA_L, 3],
    [BAWeightClass.LIGHT, 3],
    [BAWeightClass.MEDIUM, 3],
    [BAWeightClass.HEAVY, 2],
    [BAWeightClass.ASSAULT, 0],
  ] as [BAWeightClass, number][])("%s max jump MP is %i", (wc, cap) => {
    expect(BA_WEIGHT_CLASS_LIMITS[wc].maxJumpMP).toBe(cap);
  });

  test("Assault cannot jump — VAL-BA-MP fires", () => {
    const result = validateJumpMP(1, BAWeightClass.ASSAULT);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/VAL-BA-MP/);
  });

  test("VTOL rejected on PA(L) — VAL-BA-MOVE-TYPE fires", () => {
    const result = validateMovement(
      BAMovementType.VTOL,
      0,
      0,
      0,
      BAWeightClass.PA_L,
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("VAL-BA-MOVE-TYPE"))).toBe(
      true,
    );
  });

  test("VTOL allowed on Light", () => {
    const result = validateMovement(
      BAMovementType.VTOL,
      0,
      0,
      0,
      BAWeightClass.LIGHT,
    );
    expect(result.isValid).toBe(true);
  });

  test("UMU max 3 on any class; 4 fires VAL-BA-MP", () => {
    const result = validateMovement(
      BAMovementType.UMU,
      0,
      0,
      4,
      BAWeightClass.MEDIUM,
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("VAL-BA-MP"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Manipulator gate
// ---------------------------------------------------------------------------

describe("Manipulator gate (VAL-BA-MANIPULATOR)", () => {
  const heavyArmWeapon: IBAWeaponMount = {
    equipmentId: "srm-2",
    name: "SRM 2",
    location: BALocation.LEFT_ARM,
    massKg: 200,
    weaponWeight: "heavy",
    isAPWeapon: false,
  };

  test("Battle Claw allows heavy weapon on arm", () => {
    const result = validateAllManipulatorCompatibility(
      BAChassisType.BIPED,
      [heavyArmWeapon],
      BAManipulator.BATTLE_CLAW,
      BAManipulator.BASIC_CLAW,
    );
    expect(result.isValid).toBe(true);
  });

  test("Heavy Claw allows heavy weapon on arm", () => {
    const result = validateAllManipulatorCompatibility(
      BAChassisType.BIPED,
      [heavyArmWeapon],
      BAManipulator.HEAVY_CLAW,
      BAManipulator.BASIC_CLAW,
    );
    expect(result.isValid).toBe(true);
  });

  test("Basic Claw rejects heavy weapon — VAL-BA-MANIPULATOR fires", () => {
    const result = validateAllManipulatorCompatibility(
      BAChassisType.BIPED,
      [heavyArmWeapon],
      BAManipulator.BASIC_CLAW,
      BAManipulator.BASIC_CLAW,
    );
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/VAL-BA-MANIPULATOR/);
  });

  test("Cargo Lifter has lift capability", () => {
    // Verified via manipulatorMassKg — Cargo Lifter adds 15 kg
    expect(
      manipulatorMassKg(
        BAChassisType.BIPED,
        BAManipulator.CARGO_LIFTER,
        BAManipulator.NONE,
      ),
    ).toBe(15);
  });

  test("Quad chassis ignores arm manipulator check (no arms)", () => {
    const result = validateAllManipulatorCompatibility(
      BAChassisType.QUAD,
      [heavyArmWeapon],
      BAManipulator.NONE,
      BAManipulator.NONE,
    );
    // Quad returns valid here; arm-mount is blocked separately in slot validation
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Squad composition
// ---------------------------------------------------------------------------

describe("Squad composition (VAL-BA-SQUAD)", () => {
  test("IS default squad size is 4", () => {
    expect(defaultSquadSize(TechBase.INNER_SPHERE)).toBe(4);
  });

  test("Clan default squad size is 5", () => {
    expect(defaultSquadSize(TechBase.CLAN)).toBe(5);
  });

  test("Squad sizes 1-6 are legal", () => {
    expect(BA_SQUAD_SIZE_MIN).toBe(1);
    expect(BA_SQUAD_SIZE_MAX).toBe(6);
  });

  test("Squad size 0 is a hard error", () => {
    const result = validateSquadSize(0, TechBase.INNER_SPHERE);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toMatch(/VAL-BA-SQUAD/);
  });

  test("Squad size 7 is a hard error", () => {
    const result = validateSquadSize(7, TechBase.INNER_SPHERE);
    expect(result.isValid).toBe(false);
  });

  test("IS squad of 3 is a warning, not an error", () => {
    const result = validateSquadSize(3, TechBase.INNER_SPHERE);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/VAL-BA-SQUAD/);
  });

  test("Clan squad of 4 is a warning, not an error", () => {
    const result = validateSquadSize(4, TechBase.CLAN);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("IS squad of 4 is clean (no errors, no warnings)", () => {
    const result = validateSquadSize(4, TechBase.INNER_SPHERE);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Anti-mech class restriction — Assault cannot jump/swarm
// ---------------------------------------------------------------------------

describe("Anti-mech class restrictions (VAL-BA-CLASS / VAL-BA-MP)", () => {
  test("Partial Wing restricted to Light class — fires VAL-BA-CLASS on Medium", () => {
    const unit = makeUnit({
      weightClass: BAWeightClass.MEDIUM,
      hasPartialWing: true,
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes(BA_VALIDATION_RULES.VAL_BA_CLASS)),
    ).toBe(true);
  });

  test("Assault cannot jump — validateBattleArmorConstruction fires VAL-BA-MP", () => {
    const unit = makeUnit({
      weightClass: BAWeightClass.ASSAULT,
      movementType: BAMovementType.JUMP,
      groundMP: 1,
      jumpMP: 1, // assault maxJumpMP = 0
      armorPointsPerTrooper: 5, // within mass budget for this test
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.includes(BA_VALIDATION_RULES.VAL_BA_MP)),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Quad chassis — no arm locations for weapons
// ---------------------------------------------------------------------------

describe("Quad chassis (VAL-BA-MANIPULATOR)", () => {
  test("Quad slot capacity has 0 arm slots", () => {
    const cap = getSlotCapacity(BAChassisType.QUAD);
    expect(cap[BALocation.LEFT_ARM]).toBe(0);
    expect(cap[BALocation.RIGHT_ARM]).toBe(0);
    expect(cap[BALocation.BODY]).toBe(2);
  });

  test("isArmLocation correctly identifies arm locations", () => {
    expect(isArmLocation(BALocation.LEFT_ARM)).toBe(true);
    expect(isArmLocation(BALocation.RIGHT_ARM)).toBe(true);
    expect(isArmLocation(BALocation.BODY)).toBe(false);
    expect(isArmLocation(BALocation.LEFT_LEG)).toBe(false);
  });

  test("Quad with arm-mounted weapon fires slot overflow / arm restriction error", () => {
    const armWeapon: IBAWeaponMount = {
      equipmentId: "mg",
      name: "Machine Gun",
      location: BALocation.LEFT_ARM,
      massKg: 100,
      weaponWeight: "light",
      isAPWeapon: false,
    };
    const unit = makeUnit({
      chassisType: BAChassisType.QUAD,
      weapons: [armWeapon],
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(false);
  });

  test("Quad manipulator mass is always 0 regardless of manipulator values", () => {
    expect(
      manipulatorMassKg(
        BAChassisType.QUAD,
        BAManipulator.BATTLE_CLAW,
        BAManipulator.HEAVY_CLAW,
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 8. All 6 VAL-BA-* rule IDs registered
// ---------------------------------------------------------------------------

describe("registeredBARules — rule ID registration", () => {
  const EXPECTED_RULE_IDS = [
    "VAL-BA-CLASS",
    "VAL-BA-ARMOR",
    "VAL-BA-MP",
    "VAL-BA-MANIPULATOR",
    "VAL-BA-SQUAD",
    "VAL-BA-MOVE-TYPE",
  ];

  test("BA_VALIDATION_RULES contains all 6 expected rule IDs", () => {
    const registered = Object.values(BA_VALIDATION_RULES);
    for (const id of EXPECTED_RULE_IDS) {
      expect(registered).toContain(id);
    }
  });

  test("registeredBARules() returns all 6 rule IDs", () => {
    const registered = registeredBARules();
    expect(registered).toHaveLength(6);
    for (const id of EXPECTED_RULE_IDS) {
      expect(registered).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Happy-path: valid unit passes all rules
// ---------------------------------------------------------------------------

describe("End-to-end: valid unit passes all construction rules", () => {
  test("Elemental-style Clan Medium unit passes validation", () => {
    const unit = makeUnit({
      techBase: TechBase.CLAN,
      chassisType: BAChassisType.BIPED,
      weightClass: BAWeightClass.MEDIUM,
      squadSize: 5,
      movementType: BAMovementType.JUMP,
      groundMP: 1,
      jumpMP: 3,
      umuMP: 0,
      armorType: BAArmorType.STANDARD,
      armorPointsPerTrooper: 5, // 250 kg armor, well within 1000 kg cap
      leftManipulator: BAManipulator.BATTLE_CLAW,
      rightManipulator: BAManipulator.BASIC_CLAW,
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("IS Heavy unit with ground movement passes validation", () => {
    const unit = makeUnit({
      techBase: TechBase.INNER_SPHERE,
      chassisType: BAChassisType.BIPED,
      weightClass: BAWeightClass.HEAVY,
      squadSize: 4,
      movementType: BAMovementType.GROUND,
      groundMP: 2,
      jumpMP: 0,
      umuMP: 0,
      armorType: BAArmorType.STANDARD,
      armorPointsPerTrooper: 7, // 350 kg, within Heavy 1500 kg cap
    });
    const result = validateBattleArmorConstruction(unit);
    expect(result.isValid).toBe(true);
  });
});
