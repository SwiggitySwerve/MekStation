/**
 * Aerospace Construction Validation Rules (VAL-AERO-*)
 *
 * Implements the VAL-AERO-* rule group registered in the validation registry.
 * Each rule returns a ValidationError[] — empty means the unit is legal.
 *
 * Rules:
 *   VAL-AERO-TONNAGE  — tonnage within sub-type range
 *   VAL-AERO-THRUST   — engine type legal for sub-type; safeThrust ≤ cap
 *   VAL-AERO-SI       — structural integrity within class max
 *   VAL-AERO-FUEL     — fuel tonnage ≥ minimum for sub-type
 *   VAL-AERO-ARC-MAX  — per-arc armor ≤ arc maximum
 *   VAL-AERO-CREW     — small craft has crew quarters
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 * Requirement: Aerospace Construction Validation Rules
 */

import {
  AerospaceArc,
  AerospaceEngineType,
  AerospaceSubType,
} from "../../../types/unit/AerospaceInterfaces";
import { maxArcArmorPoints } from "./armorArcCalculations";
import { minFuelTons } from "./fuelCalculations";
import { maxSI } from "./siCalculations";
import {
  getMaxSafeThrust,
  isEngineLegalForSubType,
} from "./thrustCalculations";

// ============================================================================
// Validation Error Shape
// ============================================================================

/** A single construction validation failure. */
export interface AerospaceValidationError {
  /** Stable rule identifier, e.g. "VAL-AERO-TONNAGE" */
  readonly ruleId: string;
  /** Human-readable description of the violation */
  readonly message: string;
}

// ============================================================================
// Tonnage Range Table
// ============================================================================

const TONNAGE_RANGE: Record<AerospaceSubType, { min: number; max: number }> = {
  [AerospaceSubType.AEROSPACE_FIGHTER]: { min: 5, max: 100 },
  [AerospaceSubType.CONVENTIONAL_FIGHTER]: { min: 5, max: 50 },
  [AerospaceSubType.SMALL_CRAFT]: { min: 100, max: 200 },
};

// ============================================================================
// Individual Rule Functions
// ============================================================================

/**
 * VAL-AERO-TONNAGE: tonnage must be within the sub-type range.
 */
export function validateTonnage(
  tonnage: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const { min, max } = TONNAGE_RANGE[subType];
  if (tonnage < min || tonnage > max) {
    return [
      {
        ruleId: "VAL-AERO-TONNAGE",
        message: `${subType} tonnage must be ${min}–${max} tons; got ${tonnage}t`,
      },
    ];
  }
  return [];
}

/**
 * VAL-AERO-THRUST: engine type must be legal for sub-type,
 * and safeThrust must not exceed the class cap.
 */
export function validateThrust(
  engineType: AerospaceEngineType,
  safeThrust: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const errors: AerospaceValidationError[] = [];

  if (!isEngineLegalForSubType(engineType, subType)) {
    errors.push({
      ruleId: "VAL-AERO-THRUST",
      message: `Engine type "${engineType}" is not legal for ${subType}`,
    });
  }

  const cap = getMaxSafeThrust(subType);
  if (safeThrust > cap) {
    errors.push({
      ruleId: "VAL-AERO-THRUST",
      message: `Safe thrust ${safeThrust} exceeds class cap of ${cap} for ${subType}`,
    });
  }

  return errors;
}

/**
 * VAL-AERO-SI: structural integrity must not exceed the class maximum.
 */
export function validateSI(
  si: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const max = maxSI(subType);
  if (si > max) {
    return [
      {
        ruleId: "VAL-AERO-SI",
        message: `Structural integrity ${si} exceeds class max of ${max} for ${subType}`,
      },
    ];
  }
  return [];
}

/**
 * VAL-AERO-FUEL: fuel tonnage must meet the sub-type minimum.
 */
export function validateFuel(
  fuelTons: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const min = minFuelTons(subType);
  if (fuelTons < min) {
    return [
      {
        ruleId: "VAL-AERO-FUEL",
        message: `Fuel tonnage ${fuelTons}t is below minimum ${min}t for ${subType}`,
      },
    ];
  }
  return [];
}

/**
 * VAL-AERO-ARC-MAX: each arc's allocated armor must not exceed its maximum.
 */
export function validateArcArmor(
  allocation: Partial<Record<AerospaceArc, number>>,
  tonnage: number,
  subType: AerospaceSubType,
): AerospaceValidationError[] {
  const errors: AerospaceValidationError[] = [];

  for (const [arcKey, points] of Object.entries(allocation) as [
    AerospaceArc,
    number,
  ][]) {
    if (points === undefined) continue;
    const max = maxArcArmorPoints(arcKey, tonnage, subType);
    if (max === 0) continue; // Arc not applicable to this sub-type
    if (points > max) {
      errors.push({
        ruleId: "VAL-AERO-ARC-MAX",
        message: `Arc "${arcKey}" armor ${points} exceeds max ${max} for ${tonnage}t ${subType}`,
      });
    }
  }

  return errors;
}

/**
 * VAL-AERO-CREW: small craft must have crew quarters (quartersTons > 0).
 * No-op for ASF and CF.
 */
export function validateCrew(
  subType: AerospaceSubType,
  quartersTons: number,
  crewCount: number,
): AerospaceValidationError[] {
  if (subType !== AerospaceSubType.SMALL_CRAFT) return [];

  const errors: AerospaceValidationError[] = [];

  if (quartersTons <= 0) {
    errors.push({
      ruleId: "VAL-AERO-CREW",
      message: "Small craft must allocate tonnage for crew quarters",
    });
  }

  if (crewCount < 1) {
    errors.push({
      ruleId: "VAL-AERO-CREW",
      message: "Small craft must have at least 1 crew member",
    });
  }

  return errors;
}

// ============================================================================
// Registry
// ============================================================================

/** All registered VAL-AERO-* rule IDs. */
export const AERO_VALIDATION_RULE_IDS = [
  "VAL-AERO-TONNAGE",
  "VAL-AERO-THRUST",
  "VAL-AERO-SI",
  "VAL-AERO-FUEL",
  "VAL-AERO-ARC-MAX",
  "VAL-AERO-CREW",
] as const;

export type AeroValidationRuleId = (typeof AERO_VALIDATION_RULE_IDS)[number];

// ============================================================================
// Full Validation Runner
// ============================================================================

export interface AerospaceValidationInput {
  readonly tonnage: number;
  readonly subType: AerospaceSubType;
  readonly engineType: AerospaceEngineType;
  readonly safeThrust: number;
  readonly structuralIntegrity: number;
  readonly fuelTons: number;
  readonly arcArmor: Partial<Record<AerospaceArc, number>>;
  readonly quartersTons: number;
  readonly crewCount: number;
}

/**
 * Run all VAL-AERO-* rules against a unit configuration.
 * Returns a flat array of all violations.
 */
export function validateAerospaceUnit(
  input: AerospaceValidationInput,
): AerospaceValidationError[] {
  return [
    ...validateTonnage(input.tonnage, input.subType),
    ...validateThrust(input.engineType, input.safeThrust, input.subType),
    ...validateSI(input.structuralIntegrity, input.subType),
    ...validateFuel(input.fuelTons, input.subType),
    ...validateArcArmor(input.arcArmor, input.tonnage, input.subType),
    ...validateCrew(input.subType, input.quartersTons, input.crewCount),
  ];
}
