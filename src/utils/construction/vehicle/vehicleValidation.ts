/**
 * Vehicle Construction Validation Pipeline
 *
 * Orchestrates all VAL-VEHICLE-* rules into a single validation pass.
 * Rule IDs registered here:
 *   VAL-VEHICLE-TONNAGE   — tonnage within legal range for motion type
 *   VAL-VEHICLE-ENGINE    — engine rating legal, motion-type exclusions
 *   VAL-VEHICLE-TURRET    — turret mass rule + motion-type eligibility
 *   VAL-VEHICLE-ARMOR-LOC — per-location armor ≤ 2× structure
 *   VAL-VEHICLE-CREW      — at least minimum crew for tonnage / motion type
 *   VAL-VEHICLE-POWER-AMP — power amps present when required
 */

import { ArmorTypeEnum } from "@/types/construction/ArmorType";
import { EngineType } from "@/types/construction/EngineType";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { TurretType } from "@/types/unit/VehicleInterfaces";

import { validateVehicleArmorLocations } from "./armor";
import { validateVehicleCrew } from "./crew";
import { validateVehicleEngine } from "./engine";
import { validatePowerAmplifiers } from "./powerAmplifier";
import {
  computeVehicleStructureWeight,
  VehicleStructureType,
} from "./structure";
import { validateTurretEligibility, validateTurretWeight } from "./turret";

// =============================================================================
// Registered Rule IDs
// =============================================================================

/** All VAL-VEHICLE-* rule IDs registered in this pipeline */
export const VEHICLE_VALIDATION_RULE_IDS = [
  "VAL-VEHICLE-TONNAGE",
  "VAL-VEHICLE-ENGINE",
  "VAL-VEHICLE-TURRET",
  "VAL-VEHICLE-ARMOR-LOC",
  "VAL-VEHICLE-CREW",
  "VAL-VEHICLE-POWER-AMP",
] as const;

export type VehicleValidationRuleId =
  (typeof VEHICLE_VALIDATION_RULE_IDS)[number];

// =============================================================================
// Motion-type tonnage caps
// =============================================================================

/** Maximum tonnage per motion type (TechManual) */
const MOTION_TYPE_MAX_TONNAGE: Record<GroundMotionType, number> = {
  [GroundMotionType.TRACKED]: 200,
  [GroundMotionType.WHEELED]: 80,
  [GroundMotionType.HOVER]: 50,
  [GroundMotionType.VTOL]: 30,
  [GroundMotionType.NAVAL]: 300,
  [GroundMotionType.HYDROFOIL]: 100,
  [GroundMotionType.SUBMARINE]: 300,
  [GroundMotionType.WIGE]: 80,
  [GroundMotionType.RAIL]: 300,
  [GroundMotionType.MAGLEV]: 300,
};

export function getMotionTypeMaxTonnage(motionType: GroundMotionType): number {
  return MOTION_TYPE_MAX_TONNAGE[motionType] ?? 200;
}

// =============================================================================
// Validation Input
// =============================================================================

export interface VehicleValidationInput {
  /** Vehicle tonnage */
  tonnage: number;
  /** Motion type */
  motionType: GroundMotionType;
  /** Engine type */
  engineType: EngineType;
  /** Cruise MP */
  cruiseMP: number;
  /** Turret configuration */
  turretType: TurretType;
  /** Total weight of equipment in primary turret (tons) */
  turretEquipmentWeight: number;
  /** Current declared turret structure weight */
  turretStructureWeight: number;
  /** Total weight of equipment in secondary turret (tons, 0 if no dual) */
  secondaryTurretEquipmentWeight: number;
  /** Current declared secondary turret structure weight */
  secondaryTurretStructureWeight: number;
  /** Armor type */
  armorType: ArmorTypeEnum;
  /** Per-location armor allocation */
  armorAllocation: Record<string, number>;
  /** Configured crew size */
  crewSize: number;
  /** Total weight of energy weapons (tons) — for power amp check */
  energyWeaponWeight: number;
  /** Declared power amplifier weight */
  powerAmpWeight: number;
  /** Structure type */
  structureType: VehicleStructureType;
}

// =============================================================================
// Validation Output
// =============================================================================

export interface VehicleValidationError {
  ruleId: string;
  message: string;
}

export interface VehicleValidationResult {
  isValid: boolean;
  errors: VehicleValidationError[];
  warnings: string[];
  /** Computed weights for display in the status bar */
  computedWeights: {
    structure: number;
    engine: number;
  };
}

// =============================================================================
// Validation Pipeline
// =============================================================================

/**
 * Run the full VAL-VEHICLE-* validation suite against a vehicle configuration.
 *
 * Returns a consolidated result with all errors and computed weights.
 */
export function validateVehicleConstruction(
  input: VehicleValidationInput,
): VehicleValidationResult {
  const errors: VehicleValidationError[] = [];
  const warnings: string[] = [];

  // ── VAL-VEHICLE-TONNAGE ─────────────────────────────────────────────────
  const maxTonnage = getMotionTypeMaxTonnage(input.motionType);
  if (input.tonnage < 1) {
    errors.push({
      ruleId: "VAL-VEHICLE-TONNAGE",
      message: `Tonnage must be at least 1 ton`,
    });
  } else if (input.tonnage > maxTonnage) {
    errors.push({
      ruleId: "VAL-VEHICLE-TONNAGE",
      message: `${input.motionType} vehicles cannot exceed ${maxTonnage} tons — this vehicle is ${input.tonnage}t`,
    });
  }

  // ── VAL-VEHICLE-ENGINE ─────────────────────────────────────────────────
  const engineResult = validateVehicleEngine(
    input.tonnage,
    input.cruiseMP,
    input.engineType,
    input.motionType,
  );
  for (const e of engineResult.errors) {
    errors.push(e);
  }
  warnings.push(...engineResult.warnings);

  // ── VAL-VEHICLE-TURRET (eligibility) ──────────────────────────────────
  const turretEligibility = validateTurretEligibility(
    input.turretType,
    input.motionType,
    input.tonnage,
  );
  for (const e of turretEligibility.errors) {
    errors.push(e);
  }

  // ── VAL-VEHICLE-TURRET (weight rule) ──────────────────────────────────
  const turretWeightErrors = validateTurretWeight(
    input.turretType,
    input.turretEquipmentWeight,
    input.turretStructureWeight,
  );
  for (const e of turretWeightErrors) {
    errors.push(e);
  }

  // Secondary turret weight rule (Dual only)
  if (input.turretType === TurretType.DUAL) {
    const secondaryErrors = validateTurretWeight(
      TurretType.DUAL,
      input.secondaryTurretEquipmentWeight,
      input.secondaryTurretStructureWeight,
    );
    for (const e of secondaryErrors) {
      errors.push(e);
    }
  }

  // ── VAL-VEHICLE-ARMOR-LOC ──────────────────────────────────────────────
  const hasTurret = input.turretType !== TurretType.NONE;
  const isVTOL = input.motionType === GroundMotionType.VTOL;
  const armorLocErrors = validateVehicleArmorLocations(
    input.tonnage,
    input.armorAllocation,
    hasTurret,
    isVTOL,
  );
  for (const e of armorLocErrors) {
    errors.push(e);
  }

  // ── VAL-VEHICLE-CREW ──────────────────────────────────────────────────
  const crewResult = validateVehicleCrew(
    input.tonnage,
    input.motionType,
    input.crewSize,
  );
  for (const e of crewResult.errors) {
    errors.push(e);
  }

  // ── VAL-VEHICLE-POWER-AMP ─────────────────────────────────────────────
  const powerAmpResult = validatePowerAmplifiers(
    input.engineType,
    input.energyWeaponWeight,
    input.powerAmpWeight,
  );
  for (const e of powerAmpResult.errors) {
    errors.push(e);
  }

  // Computed weights for status bar display
  const computedWeights = {
    structure: computeVehicleStructureWeight(
      input.tonnage,
      input.structureType,
    ),
    engine: engineResult.engineWeight,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    computedWeights,
  };
}
