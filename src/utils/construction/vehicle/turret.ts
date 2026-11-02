/**
 * Vehicle Turret System Calculations
 *
 * Implements turret weight rules and eligibility checks per TechManual:
 *
 * - Single turret: 10% of turret-mounted equipment weight, ceil to half-ton
 * - Dual turret: each turret weighs 10% of its own equipment; requires ≥ 50t
 * - Chin turret (VTOL only): same 10% rule as an ordinary combat turret
 * - Sponson turret: 5% of equipment weight per sponson (pair = 10%)
 * - None: no turret weight
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  TurretType,
  type ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';
import { ceilToHalfTon, isValidWeight } from '@/utils/physical/weightUtils';

// Minimum tonnage required for dual turrets
export const DUAL_TURRET_MIN_TONNAGE = 50;

/**
 * Project explicit installed locations without inventing a missing turret.
 * Legacy type/toggle disagreements still need separate construction validation.
 */
export function getInstalledVehicleTurretType(
  primary: ITurretConfiguration | null,
  secondary: ITurretConfiguration | null,
): TurretType {
  const type = primary?.type ?? TurretType.NONE;
  if (type === TurretType.NONE) return TurretType.NONE;
  if (secondary && secondary.type !== TurretType.NONE) return TurretType.DUAL;
  return type === TurretType.DUAL ? TurretType.SINGLE : type;
}

// =============================================================================
// Turret Weight Computation
// =============================================================================

/**
 * Compute turret structure weight from the weight of equipment mounted in it.
 *
 * @param turretType - Type of turret
 * @param equipmentWeightInTurret - Resolved qualifying equipment tons, excluding ammo
 * @returns Turret structure weight in tons (rounded up to nearest half-ton)
 */
export function computeTurretWeight(
  turretType: TurretType,
  equipmentWeightInTurret: number,
): number {
  if (equipmentWeightInTurret <= 0) return 0;

  switch (turretType) {
    case TurretType.NONE:
      return 0;

    case TurretType.SINGLE:
    case TurretType.DUAL:
    case TurretType.CHIN:
      // Each turret: 10% of its own equipment, rounded independently.
      // This function handles one turret at a time; the caller sums both.
      return ceilToHalfTon(equipmentWeightInTurret * 0.1);

    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      // Each sponson: 5% of its own equipment weight
      return ceilToHalfTon(equipmentWeightInTurret * 0.05);

    default:
      return 0;
  }
}

export interface VehicleTurretMechanismResult {
  weight: number | null;
  allowanceOverloaded: boolean | null;
  issues: readonly string[];
}

export interface VehicleTurretMechanismContext {
  type: TurretType;
  equipmentWeight: number | null;
  isOmni?: boolean;
  baseChassisWeight?: number;
  isSupportVehicle?: boolean;
}

/**
 * Keep assigned Omni mechanism mass separate from required mechanism mass.
 * Legacy capacity/usage fields have no authority.
 * @spec openspec/changes/validate-combat-omni-turret-mechanisms/specs/vehicle-unit-system/spec.md
 */
export function computeVehicleTurretMechanismWeight(
  context: VehicleTurretMechanismContext,
): VehicleTurretMechanismResult {
  const { type, equipmentWeight, isOmni, baseChassisWeight } = context;
  if (
    isOmni &&
    baseChassisWeight !== undefined &&
    !Number.isFinite(baseChassisWeight)
  ) {
    return {
      weight: null,
      allowanceOverloaded: null,
      issues: ['Omni mechanism allowance is nonfinite'],
    };
  }
  const assigned =
    isOmni && baseChassisWeight !== undefined && baseChassisWeight >= 0;
  if (type === TurretType.NONE && !assigned)
    return { weight: 0, allowanceOverloaded: false, issues: [] };
  if (
    isOmni &&
    (context.isSupportVehicle ||
      type === TurretType.SPONSON_LEFT ||
      type === TurretType.SPONSON_RIGHT)
  ) {
    return {
      weight: null,
      allowanceOverloaded: null,
      issues: ['Omni support/sponson mechanism calculation is unsupported'],
    };
  }
  if (
    type !== TurretType.NONE &&
    equipmentWeight !== null &&
    !isValidWeight(equipmentWeight)
  ) {
    return {
      weight: null,
      allowanceOverloaded: null,
      issues: ['Mechanism equipment mass is invalid'],
    };
  }
  const required =
    type === TurretType.NONE
      ? 0
      : equipmentWeight === null
        ? null
        : computeTurretWeight(type, equipmentWeight);
  const weight = assigned ? ceilToHalfTon(baseChassisWeight) : required;
  if (weight !== null && !Number.isFinite(weight)) {
    return {
      weight: null,
      allowanceOverloaded: null,
      issues: ['Rounded mechanism mass is nonfinite'],
    };
  }
  return {
    weight,
    allowanceOverloaded:
      required === null
        ? null
        : assigned
          ? required > baseChassisWeight
          : false,
    issues: [],
  };
}

// =============================================================================
// Turret Eligibility
// =============================================================================

export interface TurretEligibilityResult {
  isEligible: boolean;
  errors: Array<{ ruleId: string; message: string }>;
}

/**
 * Validate that a turret configuration is legal for the given motion type and tonnage.
 *
 * Emits VAL-VEHICLE-TURRET errors for:
 * - Dual turret on vehicles < 50 tons
 * - Non-chin turret on VTOLs
 * - Chin turret on non-VTOL vehicles
 */
export function validateTurretEligibility(
  turretType: TurretType,
  motionType: GroundMotionType,
  tonnage: number,
): TurretEligibilityResult {
  const errors: Array<{ ruleId: string; message: string }> = [];
  const isVTOL = motionType === GroundMotionType.VTOL;

  switch (turretType) {
    case TurretType.NONE:
      // Always valid
      break;

    case TurretType.CHIN:
      if (!isVTOL) {
        errors.push({
          ruleId: 'VAL-VEHICLE-TURRET',
          message: 'Chin turret is only available on VTOL vehicles',
        });
      }
      break;

    case TurretType.SINGLE:
    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      if (isVTOL) {
        errors.push({
          ruleId: 'VAL-VEHICLE-TURRET',
          message: `VTOLs may only use None or Chin turret configuration — ${turretType} is not permitted`,
        });
      }
      break;

    case TurretType.DUAL:
      if (isVTOL) {
        errors.push({
          ruleId: 'VAL-VEHICLE-TURRET',
          message:
            'VTOLs may only use None or Chin turret configuration — Dual is not permitted',
        });
      }
      if (tonnage < DUAL_TURRET_MIN_TONNAGE) {
        errors.push({
          ruleId: 'VAL-VEHICLE-TURRET',
          message: `Dual turrets require a vehicle of at least ${DUAL_TURRET_MIN_TONNAGE} tons (this vehicle is ${tonnage}t)`,
        });
      }
      break;
  }

  return {
    isEligible: errors.length === 0,
    errors,
  };
}

/**
 * Return the list of turret options that are valid for a given motion type and tonnage.
 * Useful for filtering dropdowns in the UI.
 */
export function getEligibleTurretTypes(
  motionType: GroundMotionType,
  tonnage: number,
): TurretType[] {
  return Object.values(TurretType).filter((t) => {
    const result = validateTurretEligibility(t, motionType, tonnage);
    return result.isEligible;
  });
}

/**
 * Validate the 10% turret weight rule for a turret configuration.
 *
 * @param turretType - Type of turret
 * @param equipmentWeight - Turret equipment weight in tons, excluding ammunition
 * @param currentTurretWeight - Declared turret weight (must equal computed)
 */
export function validateTurretWeight(
  turretType: TurretType,
  equipmentWeight: number | null,
  currentTurretWeight: number | null,
  context: Omit<VehicleTurretMechanismContext, 'type' | 'equipmentWeight'> = {},
): Array<{ ruleId: string; message: string }> {
  const errors: Array<{ ruleId: string; message: string }> = [];

  const result = computeVehicleTurretMechanismWeight({
    ...context,
    type: turretType,
    equipmentWeight,
  });
  const expected = result.weight;
  if (
    result.issues.length ||
    (turretType !== TurretType.NONE &&
      currentTurretWeight !== null &&
      !isValidWeight(currentTurretWeight))
  ) {
    return [
      {
        ruleId: 'VAL-VEHICLE-TURRET',
        message: `Turret mass is incomplete or invalid${result.issues.length ? `: ${result.issues.join('; ')}` : ''}`,
      },
    ];
  }
  if (turretType === TurretType.NONE) return errors;
  // Allow a small floating-point tolerance
  if (
    expected !== null &&
    currentTurretWeight !== null &&
    Math.abs(currentTurretWeight - expected) > 0.001
  ) {
    errors.push({
      ruleId: 'VAL-VEHICLE-TURRET',
      message: `Turret mechanism weight should be ${expected}t — found ${currentTurretWeight}t`,
    });
  }
  if (result.allowanceOverloaded)
    errors.push({
      ruleId: 'VAL-VEHICLE-TURRET',
      message: `Turret mechanism requirement exceeds the assigned Omni base-chassis allowance ${context.baseChassisWeight}t`,
    });
  return errors;
}
