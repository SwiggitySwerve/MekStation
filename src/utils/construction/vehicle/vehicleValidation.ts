import type { VehicleEngineType } from '@/types/construction/EngineType';
import type { IVehicleTurretSourceContext } from '@/types/unit/VehicleInterfaces';
/**
 * Vehicle Construction Validation Pipeline
 *
 * Orchestrates all VAL-VEHICLE-* rules into a single validation pass.
 * Rule IDs registered here:
 *   VAL-VEHICLE-TONNAGE   — tonnage within legal range for motion type
 *   VAL-VEHICLE-ENGINE    — engine rating legal, motion-type exclusions
 *   VAL-VEHICLE-TURRET    — turret mass rule + motion-type eligibility
 *   VAL-VEHICLE-ARMOR-LOC - rotor and unavailable location limits
 *   VAL-VEHICLE-ARMOR-TOTAL - separate vehicle-class total
 *   VAL-VEHICLE-CREW      — at least minimum crew for tonnage / motion type
 *   VAL-VEHICLE-POWER-AMP — power amps present when required
 */

import {
  getVehicleMaxTonnage,
  getVehicleMinTonnage,
} from '@/services/construction/constructionConstants';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';
import { normalizeEquipmentId } from '@/utils/construction/equipmentBV/normalization';
import { isValidWeight } from '@/utils/physical/weightUtils';

import { validateVehicleArmorLocations } from './armor';
import {
  computeVehicleControlsLiftWeights,
  type VehicleControlsLiftContext,
} from './controlsLift';
import { validateVehicleCrew } from './crew';
import { validateVehicleEngine } from './engine';
import {
  combatVehicleSlotErrors,
  supportVehicleSlotErrors,
  type VehicleSlotUnit,
} from './itemSlots';
import { vehicleMotiveErrors } from './motiveCompatibility';
import { validatePowerAmplifiers } from './powerAmplifier';
import {
  computeVehicleStructureWeight,
  hasSixSideVehicleHull,
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
  'VAL-VEHICLE-ARMOR-TOTAL',
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
  /** Completeness transported from the full weight composition, when supplied. */
  weightCalculationComplete?: boolean;
  /** Engine type */
  engineType: VehicleEngineType;
  /** Support engine TechRating index A-F; omitted retains the owner default D. */
  engineTechRating?: number;
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
    { unitType: input.unitType, engineTechRating: input.engineTechRating },
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
    {
      hasTurret,
      isVTOL,
      hasSecondaryTurret: secondaryTurretType !== TurretType.NONE,
      isSupport: input.unitType === UnitType.SUPPORT_VEHICLE,
      motionType: input.motionType,
      isSuperheavy: hasSixSideVehicleHull({
        tonnage: input.tonnage,
        motionType: input.motionType,
        isSupportVehicle: input.unitType === UnitType.SUPPORT_VEHICLE,
      }),
    },
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
    input.weightCalculationComplete !== false &&
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
      input.motionType,
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

/** TestTank.java:979-981,1079-1089: CASE flags require the body, for CV and SV. */
export function validateVehicleCaseLocations(
  equipment: readonly {
    readonly equipmentId: string;
    readonly location: string;
  }[],
): string[] {
  return equipment.flatMap((item) => {
    const id = normalizeEquipmentId(item.equipmentId).replace(/[^a-z]/g, '');
    if (
      !/^(?:is|cl|clan)?case(?:ii|pprototype)?$/.test(id) ||
      item.location === VehicleLocation.BODY
    )
      return [];
    const name = id.endsWith('ii')
      ? 'CASE II'
      : id.endsWith('prototype')
        ? 'CASE-P (Prototype)'
        : 'CASE';
    return [name + ' must be mounted in the body.'];
  });
}

/** TestTank:979-980,1079-1093: placement does not depend on slot completeness. */
function validateVehicleFireControlLocations(
  equipment: VehicleSlotUnit['equipment'],
): string[] {
  return equipment.flatMap(({ equipmentId, location }) => {
    if (location === VehicleLocation.BODY) return [];
    const record = getEquipmentEntry(equipmentId);
    return record && FIRE_CONTROL.has(record.id)
      ? [`${record.name} must be mounted in the body.`]
      : [];
  });
}

const FIRE_CONTROL = new Set(['basic-fire-control', 'advanced-fire-control']);

/** Combat vehicles and VTOLs: body locations, item slots, motive compatibility. */
export function validateCombatVehicleEquipment(
  unit: VehicleSlotUnit & { readonly motionType: GroundMotionType },
  sideUnknown = false,
): string[] {
  return [
    ...validateVehicleCaseLocations(unit.equipment),
    ...combatVehicleSlotErrors(unit, sideUnknown),
    ...validateVehicleFireControlLocations(unit.equipment),
    ...vehicleMotiveErrors(unit.equipment, unit.motionType, false),
  ];
}

/** Support vehicles: body locations, item slots, then motive compatibility. */
export function validateSupportVehicleEquipment(
  unit: VehicleSlotUnit & { readonly motionType: GroundMotionType },
): string[] {
  return [
    ...validateVehicleCaseLocations(unit.equipment),
    ...supportVehicleSlotErrors(unit),
    ...validateVehicleFireControlLocations(unit.equipment),
    ...vehicleMotiveErrors(unit.equipment, unit.motionType, true),
  ];
}
