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

import type { VehicleEngineType } from '@/types/construction/EngineType';
import type { IVehicleTurretSourceContext } from '@/types/unit/VehicleInterfaces';

import {
  getVehicleMaxTonnage,
  getVehicleMinTonnage,
} from '@/services/construction/constructionConstants';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { isValidWeight } from '@/utils/physical/weightUtils';

import { validateVehicleArmorLocations } from './armor';
import {
  computeVehicleControlsLiftWeights,
  type VehicleControlsLiftContext,
} from './controlsLift';
import { validateVehicleCrew } from './crew';
import { validateVehicleEngine } from './engine';
import { validatePowerAmplifiers } from './powerAmplifier';
import {
  computeVehicleStructureWeight,
  VehicleStructureType,
} from './structure';
import {
  computeVehicleTurretMechanismWeight,
  validateTurretEligibility,
  validateTurretWeight,
} from './turret';

// =============================================================================
// Registered Rule IDs
// =============================================================================

/** All VAL-VEHICLE-* rule IDs registered in this pipeline */
export const VEHICLE_VALIDATION_RULE_IDS = [
  'VAL-VEHICLE-TONNAGE',
  'VAL-VEHICLE-ENGINE',
  'VAL-VEHICLE-TURRET',
  'VAL-VEHICLE-ARMOR-LOC',
  'VAL-VEHICLE-CREW',
  'VAL-VEHICLE-POWER-AMP',
] as const;

export type VehicleValidationRuleId =
  (typeof VEHICLE_VALIDATION_RULE_IDS)[number];

// =============================================================================
// Validation Input
// =============================================================================

export interface VehicleValidationInput
  extends VehicleControlsLiftContext, IVehicleTurretSourceContext {
  /** Engine type */
  engineType: VehicleEngineType;
  /** Cruise MP */
  cruiseMP: number;
  /** Turret configuration */
  turretType: TurretType;
  /** Explicit secondary installation overrides the legacy Dual shorthand. */
  secondaryTurretType?: TurretType;
  /** Total weight of equipment in primary turret (tons) */
  turretEquipmentWeight: number | null;
  /** Current declared turret structure weight */
  turretStructureWeight: number | null;
  /** Total weight of equipment in secondary turret (tons, 0 if no dual) */
  secondaryTurretEquipmentWeight: number | null;
  /** Current declared secondary turret structure weight */
  secondaryTurretStructureWeight: number | null;
  /** Armor type */
  armorType: ArmorTypeEnum;
  /** Per-location armor allocation */
  armorAllocation: Record<string, number>;
  /** Configured crew size */
  crewSize: number;
  /** Total weight of energy weapons (tons) — for power amp check */
  energyWeaponWeight: number | null;
  /** Declared power amplifier weight */
  powerAmpWeight: number | null;
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
  /** Unknown or invalid dependent mass prevents successful validation. */
  isComplete: boolean;
  errors: VehicleValidationError[];
  warnings: string[];
  /** Computed weights for display in the status bar */
  computedWeights: {
    structure: number;
    engine: number;
    controls: number;
    lift: number;
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
  const primaryContext = {
    isOmni: input.isOmni,
    baseChassisWeight: input.baseChassisTurretWeight,
    isSupportVehicle: input.unitType === UnitType.SUPPORT_VEHICLE,
  };
  const secondaryContext = {
    ...primaryContext,
    baseChassisWeight: input.baseChassisSecondaryTurretWeight,
  };

  // ── VAL-VEHICLE-TONNAGE ─────────────────────────────────────────────────
  const support = input.unitType === UnitType.SUPPORT_VEHICLE;
  const maxTonnage = getVehicleMaxTonnage(input.motionType, support);
  const minTonnage = getVehicleMinTonnage(support);
  if (input.tonnage < minTonnage) {
    errors.push({
      ruleId: 'VAL-VEHICLE-TONNAGE',
      message: `Tonnage must be at least ${minTonnage} ton`,
    });
  } else if (input.tonnage > maxTonnage) {
    errors.push({
      ruleId: 'VAL-VEHICLE-TONNAGE',
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
    primaryContext,
  );
  for (const e of turretWeightErrors) {
    errors.push(e);
  }

  const secondaryTurretType =
    input.secondaryTurretType ??
    (input.turretType === TurretType.DUAL ? TurretType.DUAL : TurretType.NONE);
  const secondaryErrors = validateTurretWeight(
    secondaryTurretType,
    input.secondaryTurretEquipmentWeight,
    input.secondaryTurretStructureWeight,
    secondaryContext,
  );
  for (const error of secondaryErrors) {
    errors.push({ ...error, message: `Secondary: ${error.message}` });
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
  const amplifierMassesComplete = [
    input.energyWeaponWeight,
    input.powerAmpWeight,
  ].every((mass) => mass !== null && isValidWeight(mass));
  if (
    amplifierMassesComplete &&
    input.energyWeaponWeight !== null &&
    input.powerAmpWeight !== null
  ) {
    errors.push(
      ...validatePowerAmplifiers(
        input.engineType,
        input.energyWeaponWeight,
        input.powerAmpWeight,
      ).errors,
    );
  }
  const primaryMechanism = computeVehicleTurretMechanismWeight({
    ...primaryContext,
    type: input.turretType,
    equipmentWeight: input.turretEquipmentWeight,
  });
  const secondaryMechanism = computeVehicleTurretMechanismWeight({
    ...secondaryContext,
    type: secondaryTurretType,
    equipmentWeight: input.secondaryTurretEquipmentWeight,
  });
  const isComplete =
    primaryMechanism.weight !== null &&
    primaryMechanism.allowanceOverloaded !== null &&
    secondaryMechanism.weight !== null &&
    secondaryMechanism.allowanceOverloaded !== null &&
    (input.turretType === TurretType.NONE ||
      (input.turretStructureWeight !== null &&
        isValidWeight(input.turretStructureWeight))) &&
    (secondaryTurretType === TurretType.NONE ||
      (input.secondaryTurretStructureWeight !== null &&
        isValidWeight(input.secondaryTurretStructureWeight))) &&
    amplifierMassesComplete;

  // Computed weights for status bar display
  const computedWeights = {
    ...computeVehicleControlsLiftWeights(input),
    structure: computeVehicleStructureWeight(
      input.tonnage,
      input.structureType,
    ),
    engine: engineResult.engineWeight,
  };

  return {
    isValid: isComplete && errors.length === 0,
    isComplete,
    errors,
    warnings,
    computedWeights,
  };
}
