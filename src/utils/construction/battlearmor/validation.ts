/**
 * Battle Armor Construction Validation
 *
 * Orchestrates all VAL-BA-* rules into a single validation pass.
 * Each rule group is delegated to its specialist module; this file
 * aggregates results into a unified ConstructionResult shape.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Construction Validation Rule Set
 */

import {
  BA_VALIDATION_RULES,
  BA_WEIGHT_CLASS_LIMITS,
  IBattleArmorUnit,
} from '@/types/unit/BattleArmorInterfaces';

import { validateAntiMechEquipment } from './antiMech';
import { camoBodySlots, validateArmor } from './armor';
import { isArmLocation, isLegLocation } from './chassis';
import { validateAllManipulatorCompatibility } from './manipulators';
import { computeTrooperMass } from './mass';
import { validateMovement } from './movement';
import { assertSquadHomogeneous, validateSquadSize } from './squad';
import {
  validateAPWeaponSlot,
  validateAllHeavyWeaponClasses,
} from './weaponGates';

// ============================================================================
// Result types
// ============================================================================

export interface BAConstructionIssue {
  readonly ruleId: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface BAConstructionResult {
  readonly isValid: boolean;
  readonly issues: readonly BAConstructionIssue[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  /** Total per-trooper mass (kg) */
  readonly trooperMassKg: number;
}

// ============================================================================
// Slot validation helper
// ============================================================================

/**
 * Validate that no location exceeds its slot capacity.
 * Returns error strings for over-capacity locations.
 */
function validateSlots(unit: IBattleArmorUnit): string[] {
  const errors: string[] = [];
  const slotUsage: Record<string, number> = {};

  // Count weapon slots (AP weapons use the AP slot, not a regular slot)
  for (const weapon of unit.weapons) {
    if (!weapon.isAPWeapon) {
      slotUsage[weapon.location] = (slotUsage[weapon.location] ?? 0) + 1;
    }
  }

  // Count equipment slots
  for (const eq of unit.equipment) {
    slotUsage[eq.location] = (slotUsage[eq.location] ?? 0) + eq.slotsUsed;
  }

  // Slot capacity differs by chassis type
  const capacity =
    unit.chassisType === 'Biped'
      ? {
          Body: 2,
          'Left Arm': 2,
          'Right Arm': 2,
          'Left Leg': 1,
          'Right Leg': 1,
        }
      : {
          Body: 2,
          'Left Arm': 0,
          'Right Arm': 0,
          'Left Leg': 1,
          'Right Leg': 1,
        };

  // Reserve Body slots consumed by armor-type fixtures (e.g., Stealth armor's
  // camouflage generator, §Requirement 2 "Armor Points per Trooper" /
  // tasks.md §5.3). These are not user-mounted equipment — they are a
  // fixed cost of the chosen armor type — so we deduct them from Body
  // capacity BEFORE the overflow check runs. A Stealth unit that mounts
  // 2 body weapons now correctly trips VAL-BA-CLASS because only 1 Body
  // slot is actually available.
  const reservedBodySlots = camoBodySlots(unit.armorType);
  capacity.Body -= reservedBodySlots;

  for (const [loc, used] of Object.entries(slotUsage)) {
    const cap = capacity[loc as keyof typeof capacity] ?? 0;
    if (used > cap) {
      errors.push(
        `${BA_VALIDATION_RULES.VAL_BA_CLASS}: ${loc} slot overflow — ${used} used, ${cap} available`,
      );
    }
  }

  // Arm-mounted weapons on Quad are always illegal
  if (unit.chassisType === 'Quad') {
    for (const weapon of unit.weapons) {
      if (isArmLocation(weapon.location)) {
        errors.push(
          `${BA_VALIDATION_RULES.VAL_BA_MANIPULATOR}: Quad chassis cannot mount arm weapons`,
        );
      }
    }
  }

  // Leg slots only permit AP weapons
  for (const weapon of unit.weapons) {
    if (isLegLocation(weapon.location) && !weapon.isAPWeapon) {
      errors.push(
        `${BA_VALIDATION_RULES.VAL_BA_CLASS}: Only anti-personnel weapons may be leg-mounted`,
      );
    }
  }

  return errors;
}

// ============================================================================
// Anti-mech installed ID helper
// ============================================================================

function installedAntiMechIds(unit: IBattleArmorUnit): string[] {
  const ids: string[] = [];
  if (unit.hasMagneticClamp) ids.push('ba-magnetic-clamp');
  if (unit.hasMechanicalJumpBooster) ids.push('ba-mechanical-jump-booster');
  if (unit.hasPartialWing) ids.push('ba-partial-wing');
  if (unit.hasDetachableWeaponPack) ids.push('ba-detachable-weapon-pack');
  return ids;
}

// ============================================================================
// Issue builder helper
// ============================================================================

function extractRuleId(message: string): string {
  const match = /^(VAL-BA-[\w-]+)/.exec(message);
  return match?.[1] ?? 'UNKNOWN';
}

function toIssues(
  messages: readonly string[],
  severity: 'error' | 'warning',
): BAConstructionIssue[] {
  return messages.map((message) => ({
    ruleId: extractRuleId(message),
    severity,
    message,
  }));
}

// ============================================================================
// Main validator
// ============================================================================

/**
 * Run all VAL-BA-* construction rules against the provided unit.
 *
 * Rule coverage:
 * - VAL-BA-CLASS      — trooper mass within weight class range; slot limits
 * - VAL-BA-ARMOR      — armor points <= class max; type legal for class
 * - VAL-BA-MP         — ground/jump/UMU MP <= class cap
 * - VAL-BA-MANIPULATOR — weapon/manipulator compatibility; Quad arm restriction
 * - VAL-BA-SQUAD      — squad size 1-6, warn outside tech-base default
 * - VAL-BA-MOVE-TYPE  — movement type legal for class
 */
export function validateBattleArmorConstruction(
  unit: IBattleArmorUnit,
): BAConstructionResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // VAL-BA-SQUAD
  const squadResult = validateSquadSize(unit.squadSize, unit.techBase);
  errors.push(...squadResult.errors);
  warnings.push(...squadResult.warnings);

  // VAL-BA-ARMOR
  const armorResult = validateArmor(
    unit.armorPointsPerTrooper,
    unit.armorType,
    unit.weightClass,
  );
  errors.push(...armorResult.errors);

  // VAL-BA-MP + VAL-BA-MOVE-TYPE
  const movementResult = validateMovement(
    unit.movementType,
    unit.groundMP,
    unit.jumpMP,
    unit.umuMP,
    unit.weightClass,
  );
  errors.push(...movementResult.errors);

  // VAL-BA-MANIPULATOR
  const manipulatorResult = validateAllManipulatorCompatibility(
    unit.chassisType,
    unit.weapons,
    unit.leftManipulator,
    unit.rightManipulator,
  );
  errors.push(...manipulatorResult.errors);

  // Slot overflow + location restrictions (VAL-BA-CLASS / VAL-BA-MANIPULATOR)
  errors.push(...validateSlots(unit));

  // Anti-mech equipment class restrictions (VAL-BA-CLASS)
  const antiMechResult = validateAntiMechEquipment(
    installedAntiMechIds(unit),
    unit.weightClass,
  );
  errors.push(...antiMechResult.errors);

  // VAL-BA-CLASS: heavy weapon weight class gate (§7.1)
  const heavyWeaponResult = validateAllHeavyWeaponClasses(
    unit.weapons,
    unit.weightClass,
  );
  errors.push(...heavyWeaponResult.errors);

  // VAL-BA-CLASS: AP weapon slot is Light-class-only (§8.4)
  const apWeaponResult = validateAPWeaponSlot(unit.weapons, unit.weightClass);
  errors.push(...apWeaponResult.errors);

  // VAL-BA-SQUAD: squad loadout homogeneity invariant (§3.4)
  // Runtime guard — the type system already prevents heterogeneous loadouts,
  // this check catches any future refactor that would break the invariant.
  try {
    assertSquadHomogeneous(unit);
  } catch (e) {
    errors.push(
      e instanceof Error
        ? e.message
        : `${BA_VALIDATION_RULES.VAL_BA_SQUAD}: squad loadout is not homogeneous`,
    );
  }

  // VAL-BA-CLASS: trooper mass (includes extra-MP weight cost per §4.5)
  const massBreakdown = computeTrooperMass(
    unit.armorPointsPerTrooper,
    unit.armorType,
    unit.chassisType,
    unit.leftManipulator,
    unit.rightManipulator,
    unit.weapons,
    unit.equipment,
    {
      groundMP: unit.groundMP,
      jumpMP: unit.jumpMP,
      umuMP: unit.umuMP,
      weightClass: unit.weightClass,
    },
  );

  const classLimits = BA_WEIGHT_CLASS_LIMITS[unit.weightClass];
  if (massBreakdown.totalMass > classLimits.maxMassKg) {
    errors.push(
      `${BA_VALIDATION_RULES.VAL_BA_CLASS}: ${unit.weightClass} class trooper mass ${massBreakdown.totalMass} kg exceeds maximum ${classLimits.maxMassKg} kg`,
    );
  }

  const issues: BAConstructionIssue[] = [
    ...toIssues(errors, 'error'),
    ...toIssues(warnings, 'warning'),
  ];

  return {
    isValid: errors.length === 0,
    issues,
    errors,
    warnings,
    trooperMassKg: massBreakdown.totalMass,
  };
}

/**
 * Return the set of VAL-BA-* rule IDs registered in this pipeline.
 * Used by integration tests to confirm rule registration.
 */
export function registeredBARules(): readonly string[] {
  return Object.values(BA_VALIDATION_RULES);
}
