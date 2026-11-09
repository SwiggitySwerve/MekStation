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
import { HEAT_SINK_EQUIPMENT_IDS } from '@/utils/equipment/equipmentConstants';
import { ceilToHalfTon, isValidWeight } from '@/utils/physical/weightUtils';

import { isVehicleArmorEquipment } from './itemSlots';
import { roundSupportComponentWeight } from './supportRounding';

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
  kilograms = false,
): number {
  if (equipmentWeightInTurret <= 0) return 0;
  const round = kilograms
    ? (weight: number) => roundSupportComponentWeight(weight, 0, true)
    : ceilToHalfTon;

  switch (turretType) {
    case TurretType.NONE:
      return 0;

    case TurretType.SINGLE:
    case TurretType.DUAL:
    case TurretType.CHIN:
      // Each turret: 10% of its own equipment, rounded independently.
      // This function handles one turret at a time; the caller sums both.
      return round(equipmentWeightInTurret * 0.1);

    case TurretType.SPONSON_LEFT:
    case TurretType.SPONSON_RIGHT:
      // Each sponson: 5% of its own equipment weight
      return round(equipmentWeightInTurret * 0.05);

    default:
      return 0;
  }
}

export interface VehicleTurretMechanismResult {
  weight: number | null;
  allowanceOverloaded: boolean | null;
  issues: readonly string[];
}

/** MiscType.java:563-591 at 48fcb2f6. Native equipment records share the
 * rounded aggregate mechanism, rather than rounding each half independently.
 * Legacy configured left/right turrets above retain their per-side contract.
 */
export function computeVehicleSponsonMechanismWeight(context: {
  equipmentWeight: number | null;
  count: number;
  isOmni?: boolean;
  baseChassisWeight?: number;
  kilograms?: boolean;
}): number | null {
  const { equipmentWeight, count, isOmni, baseChassisWeight } = context;
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  if (isOmni && baseChassisWeight !== undefined) {
    if (!Number.isFinite(baseChassisWeight)) return null;
    if (baseChassisWeight >= 0) return baseChassisWeight / count;
  }
  if (equipmentWeight === null || !isValidWeight(equipmentWeight)) return null;
  return (
    computeTurretWeight(TurretType.SINGLE, equipmentWeight, context.kilograms) /
    count
  );
}

/** MiscType.java:592-603 at 48fcb2f64. A fixed chassis weight (even zero, and
 * even off an Omni chassis) is split over the pintles; otherwise a pintle
 * weighs 5% of the pintle-mounted weapons in its own location, rounded up
 * (kilograms on a small support vehicle, half ton otherwise). A negative fixed
 * weight is MegaMek's unassigned sentinel.
 */
export function computeVehiclePintleMechanismWeight(context: {
  weaponWeight: number | null;
  count: number;
  baseChassisWeight?: number;
  kilograms?: boolean;
}): number | null {
  const { weaponWeight, count, baseChassisWeight } = context;
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  if (baseChassisWeight !== undefined) {
    if (!Number.isFinite(baseChassisWeight)) return null;
    if (baseChassisWeight >= 0) return baseChassisWeight / count;
  }
  if (weaponWeight === null || !isValidWeight(weaponWeight)) return null;
  return roundSupportComponentWeight(
    weaponWeight / 20,
    0,
    context.kilograms ?? false,
  );
}

/** One mount as the sponson and pintle mechanisms see it. */
export interface IVehicleMechanismMount<Location> {
  id: string;
  location: Location;
  /** Null while unresolved; mechanism mounts are overwritten by the pass. */
  weight: number | null;
  weapon: boolean;
  pintleMounted: boolean;
  /** Non-ammunition, non-heat-sink, non-armor equipment mounted on a sponson. */
  sponsonPayload: boolean;
}

/** The sponson basis (MiscType.java:576-584): everything sponson-mounted except
 * ammunition, heat sinks and armor.
 */
export function isSponsonMechanismPayload(mount: {
  isSponsonMounted: boolean;
  isAmmunition: boolean;
  id: string;
}): boolean {
  return (
    mount.isSponsonMounted &&
    !mount.isAmmunition &&
    !HEAT_SINK_EQUIPMENT_IDS.includes(mount.id) &&
    !isVehicleArmorEquipment(mount.id)
  );
}

/** The catalog identities of the two mechanism mounts the pass below weighs. */
const SPONSON_MOUNT_ID = 'vehicular-sponson-turret';
const PINTLE_MOUNT_ID = 'pintle-mount';
export const isVehicleMechanismMountId = (id: string): boolean =>
  id === SPONSON_MOUNT_ID || id === PINTLE_MOUNT_ID;

const sumKnown = (weights: readonly (number | null)[]): number | null =>
  weights.some((weight) => weight === null)
    ? null
    : weights.reduce<number>((total, weight) => total + (weight ?? 0), 0);

/**
 * Weigh every sponson and pintle mechanism mount in place, for the editor and
 * the support handler alike. A mechanism whose basis has an unresolved mass is
 * left null (unavailable), never charged as if that mass were zero.
 */
export function applyVehicleMountMechanismWeights<Location>(
  mounts: IVehicleMechanismMount<Location>[],
  context: {
    isOmni?: boolean;
    baseChassisWeight?: number;
    kilograms?: boolean;
  },
): { sponsonUnavailable: boolean; pintleUnavailable: boolean } {
  const sponsons = mounts.filter((m) => m.id === SPONSON_MOUNT_ID);
  const pintles = mounts.filter((m) => m.id === PINTLE_MOUNT_ID);
  const { isOmni, baseChassisWeight, kilograms } = context;
  let sponsonUnavailable = false;
  let pintleUnavailable = false;
  if (sponsons.length) {
    const weight = computeVehicleSponsonMechanismWeight({
      equipmentWeight: sumKnown(
        mounts.filter((m) => m.sponsonPayload).map((m) => m.weight),
      ),
      count: sponsons.length,
      isOmni,
      baseChassisWeight,
      kilograms,
    });
    for (const mount of sponsons) mount.weight = weight;
    sponsonUnavailable = weight === null;
  }
  for (const pintle of pintles) {
    const weight = computeVehiclePintleMechanismWeight({
      weaponWeight: sumKnown(
        mounts
          .filter(
            (m) =>
              m.weapon && m.pintleMounted && m.location === pintle.location,
          )
          .map((m) => m.weight),
      ),
      count: pintles.length,
      baseChassisWeight,
      kilograms,
    });
    pintle.weight = weight;
    if (weight === null) pintleUnavailable = true;
  }
  return { sponsonUnavailable, pintleUnavailable };
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

/** S10/S12: explicit per-turret allowance, never a total pod budget.
 * Tank.java:3135-3169; TestTank.java:182-234,842-879 (48fcb2f6).
 */
export function getVehicleTurretMechanismFigures(
  context: VehicleTurretMechanismContext,
): VehicleTurretMechanismResult & {
  allowance: number | null;
  required: number | null;
  remaining: number | null;
} {
  const assigned = computeVehicleTurretMechanismWeight(context);
  const required = computeVehicleTurretMechanismWeight({
    ...context,
    baseChassisWeight: undefined,
  }).weight;
  const allowance =
    context.isOmni &&
    context.baseChassisWeight !== undefined &&
    Number.isFinite(context.baseChassisWeight) &&
    context.baseChassisWeight >= 0
      ? context.baseChassisWeight
      : null;
  return {
    ...assigned,
    allowance,
    required,
    remaining:
      allowance !== null && required !== null && assigned.issues.length === 0
        ? allowance - required
        : null,
  };
}

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
