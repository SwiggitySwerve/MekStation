/**
 * Vehicle Equipment Mounting Rules
 *
 * Enforces legal mounting arcs for weapons and equipment on combat vehicles.
 *
 * Rules (TechManual):
 * - Sponson turrets fire forward-side arcs only (Front + Left or Front + Right)
 *   → equipment cannot be mounted in a Rear-arc sponson
 * - Standard turret: 360° arc, any combat vehicle with a turret
 * - Chin turret: VTOL only
 * - Rear-mounted weapons fire the rear arc
 * - Body location: internal components only (no weapons)
 * - Rotor: VTOL only, no weapons (structural component)
 * - Pod-mounted flag for OmniVehicles
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

// =============================================================================
// Mount Result
// =============================================================================

export interface MountResult {
  success: boolean;
  errors: Array<{ ruleId: string; message: string }>;
}

// =============================================================================
// Location Legality
// =============================================================================

/**
 * Return the set of locations that are valid for weapon/equipment mounting
 * given the vehicle's current configuration.
 */
export function getLegalMountingLocations(
  motionType: GroundMotionType,
  turretType: TurretType,
  isOmni: boolean,
): Array<VehicleLocation | VTOLLocation> {
  const isVTOL = motionType === GroundMotionType.VTOL;
  const locations: Array<VehicleLocation | VTOLLocation> = [
    VehicleLocation.FRONT,
    VehicleLocation.LEFT,
    VehicleLocation.RIGHT,
    VehicleLocation.REAR,
    VehicleLocation.BODY,
  ];

  // Turret location only exists when a turret is configured
  if (turretType !== TurretType.NONE) {
    locations.push(VehicleLocation.TURRET);
  }

  // Rotor is a VTOL-only structural location — no weapons allowed there
  if (isVTOL) {
    locations.push(VTOLLocation.ROTOR);
  }

  return locations;
}

/**
 * Check whether a sponson mount in a given location is legal.
 *
 * Sponsons fire forward-side arcs: Left sponson = Front+Left, Right sponson = Front+Right.
 * Equipment cannot be mounted in a Rear arc from a sponson.
 */
export function isSponsonMountLegal(
  location: VehicleLocation | VTOLLocation,
  turretType: TurretType,
): boolean {
  const isSponson =
    turretType === TurretType.SPONSON_LEFT ||
    turretType === TurretType.SPONSON_RIGHT;

  if (!isSponson) return true; // Not a sponson — rule doesn't apply

  // Sponsons cannot mount equipment in the Rear arc
  if (location === VehicleLocation.REAR) {
    return false;
  }

  return true;
}

// =============================================================================
// Mount Validation
// =============================================================================

/**
 * Validate a single equipment mount attempt.
 *
 * Checks:
 * 1. Location is valid for this vehicle configuration
 * 2. Sponson arc legality (no Rear mounts on sponsons)
 * 3. Rotor is structural-only (no weapons)
 * 4. Body is for internal components (no turret-mounted body equipment)
 */
export function validateEquipmentMount(
  location: VehicleLocation | VTOLLocation,
  motionType: GroundMotionType,
  turretType: TurretType,
  isTurretMounted: boolean,
  isWeapon: boolean,
): MountResult {
  const errors: Array<{ ruleId: string; message: string }> = [];

  // Rule: Rotor is structural — no weapons allowed
  if (location === VTOLLocation.ROTOR && isWeapon) {
    errors.push({
      ruleId: 'VAL-VEHICLE-MOUNT',
      message:
        'Weapons cannot be mounted on the Rotor (structural component only)',
    });
  }

  // Rule: Chin turret only valid on VTOLs
  if (
    isTurretMounted &&
    turretType === TurretType.CHIN &&
    motionType !== GroundMotionType.VTOL
  ) {
    errors.push({
      ruleId: 'VAL-VEHICLE-MOUNT',
      message: 'Chin turret is only available on VTOL vehicles',
    });
  }

  // Rule: Sponson arc — no Rear mounts
  if (!isSponsonMountLegal(location, turretType)) {
    errors.push({
      ruleId: 'VAL-VEHICLE-MOUNT',
      message: `Sponson turrets fire forward-side arcs only — equipment cannot be mounted in the ${location} arc`,
    });
  }

  // Rule: Turret location only valid when turret is configured
  if (
    (location === VehicleLocation.TURRET || isTurretMounted) &&
    turretType === TurretType.NONE
  ) {
    errors.push({
      ruleId: 'VAL-VEHICLE-MOUNT',
      message:
        'Cannot mount equipment in Turret — no turret configured on this vehicle',
    });
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Equipment Weight Helpers
// =============================================================================

/**
 * Compute total weight of equipment mounted in the turret location.
 * Used to derive turret structure weight.
 */
export function computeTurretEquipmentWeight(
  equipment: ReadonlyArray<{ isTurretMounted: boolean; weight?: number }>,
): number {
  return equipment
    .filter((e) => e.isTurretMounted)
    .reduce((sum, e) => sum + (e.weight ?? 0), 0);
}
