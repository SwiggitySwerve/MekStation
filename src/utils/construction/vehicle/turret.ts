/**
 * Vehicle Turret System Calculations
 *
 * Implements turret weight rules and eligibility checks per TechManual:
 *
 * - Single turret: 10% of turret-mounted equipment weight, ceil to half-ton
 * - Dual turret: each turret weighs 10% of its own equipment; requires ≥ 50t
 * - Chin turret (VTOL only): 5% of chin-mounted equipment weight
 * - Sponson turret: 5% of equipment weight per sponson (pair = 10%)
 * - None: no turret weight
 */

import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { TurretType } from "@/types/unit/VehicleInterfaces";
import { ceilToHalfTon } from "@/utils/physical/weightUtils";

// Minimum tonnage required for dual turrets
export const DUAL_TURRET_MIN_TONNAGE = 50;

// =============================================================================
// Turret Weight Computation
// =============================================================================

/**
 * Compute turret structure weight from the weight of equipment mounted in it.
 *
 * @param turretType - Type of turret
 * @param equipmentWeightInTurret - Total tons of weapons/ammo in the turret
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
      // 10% of equipment weight, rounded up to half-ton
      return ceilToHalfTon(equipmentWeightInTurret * 0.1);

    case TurretType.DUAL:
      // Each of the two turrets: 10% of its own equipment weight
      // This function handles one turret at a time; caller sums both
      return ceilToHalfTon(equipmentWeightInTurret * 0.1);

    case TurretType.CHIN:
      // VTOL chin turret: 5% of equipment weight
      return ceilToHalfTon(equipmentWeightInTurret * 0.05);

    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      // Each sponson: 5% of its own equipment weight
      return ceilToHalfTon(equipmentWeightInTurret * 0.05);

    default:
      return 0;
  }
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
          ruleId: "VAL-VEHICLE-TURRET",
          message: "Chin turret is only available on VTOL vehicles",
        });
      }
      break;

    case TurretType.SINGLE:
    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      if (isVTOL) {
        errors.push({
          ruleId: "VAL-VEHICLE-TURRET",
          message: `VTOLs may only use None or Chin turret configuration — ${turretType} is not permitted`,
        });
      }
      break;

    case TurretType.DUAL:
      if (isVTOL) {
        errors.push({
          ruleId: "VAL-VEHICLE-TURRET",
          message:
            "VTOLs may only use None or Chin turret configuration — Dual is not permitted",
        });
      }
      if (tonnage < DUAL_TURRET_MIN_TONNAGE) {
        errors.push({
          ruleId: "VAL-VEHICLE-TURRET",
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
 * @param equipmentWeight - Total equipment weight in turret (tons)
 * @param currentTurretWeight - Declared turret weight (must equal computed)
 */
export function validateTurretWeight(
  turretType: TurretType,
  equipmentWeight: number,
  currentTurretWeight: number,
): Array<{ ruleId: string; message: string }> {
  const errors: Array<{ ruleId: string; message: string }> = [];
  if (turretType === TurretType.NONE) return errors;

  const expected = computeTurretWeight(turretType, equipmentWeight);
  // Allow a small floating-point tolerance
  if (Math.abs(currentTurretWeight - expected) > 0.001) {
    errors.push({
      ruleId: "VAL-VEHICLE-TURRET",
      message: `Turret weight should be ${expected}t (10% of ${equipmentWeight}t equipment) — found ${currentTurretWeight}t`,
    });
  }
  return errors;
}
