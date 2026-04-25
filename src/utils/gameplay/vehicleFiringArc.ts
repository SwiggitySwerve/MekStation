/**
 * Vehicle Firing Arc Calculation
 *
 * Per TW, ground vehicles have a fixed Front (60°), Left Side (120°),
 * Right Side (120°), and Rear (60°) arc based on chassis facing. Turret
 * weapons ignore chassis facing and fire in a 360° arc unless the turret is
 * locked (in which case they fire in the chassis Front arc only). Sponson
 * turrets fire in a 180° forward-side hemisphere.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/firing-arc-calculation/spec.md
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  FiringArc,
  IHexCoordinate,
  IVehicleCombatState,
} from '@/types/gameplay';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { calculateFiringArc } from './firingArc';

// =============================================================================
// Arc Span Table (degrees)
// =============================================================================

/**
 * Degree span for each vehicle arc. Full 360° is covered by:
 *   Front (60) + Right Side (120) + Rear (60) + Left Side (120) = 360.
 */
export const VEHICLE_ARC_DEGREES: Readonly<Record<FiringArc, number>> = {
  [FiringArc.Front]: 60,
  [FiringArc.Left]: 120,
  [FiringArc.Right]: 120,
  [FiringArc.Rear]: 60,
};

// =============================================================================
// Turret Arc
// =============================================================================

/**
 * Arc span for a turret given its type and lock state.
 *  - Single / Dual: 360° (or Front if locked).
 *  - Chin: 360° (a +1 pivot penalty fires when the turret rotated this
 *    turn — see `calculateChinTurretPivotModifier` in `toHit/vehicleModifiers.ts`).
 *  - Sponson (left/right): 180° forward-side hemisphere — modeled as two
 *    arcs (Front + same-side Side).
 *  - None: no turret arc.
 *
 * Returns `null` for NONE; returns the set of arcs the turret weapon can
 * reach (relative to chassis facing).
 */
export function getTurretArcs(
  turretType: TurretType | undefined,
  locked: boolean,
): readonly FiringArc[] {
  if (!turretType || turretType === TurretType.NONE) return [];

  if (locked) {
    return [FiringArc.Front];
  }

  switch (turretType) {
    case TurretType.SINGLE:
    case TurretType.DUAL:
    case TurretType.CHIN:
      return [FiringArc.Front, FiringArc.Left, FiringArc.Right, FiringArc.Rear];
    case TurretType.SPONSON_LEFT:
      return [FiringArc.Front, FiringArc.Left];
    case TurretType.SPONSON_RIGHT:
      return [FiringArc.Front, FiringArc.Right];
    default:
      return [];
  }
}

// =============================================================================
// Location-Based Firing Arc
// =============================================================================

/**
 * Compute which firing arc a weapon mounted at `mountLocation` covers
 * relative to chassis facing, given turret lock state.
 *
 * For body-mounted or chassis weapons we return the `FiringArc` that matches
 * the mount location (Front/Left/Right/Rear). For turret-mounted weapons we
 * return 360° coverage (all four arcs) or Front if locked.
 */
export function getVehicleWeaponArcs(params: {
  readonly mountLocation: VehicleLocation | VTOLLocation;
  readonly isTurretMounted: boolean;
  readonly isSponsonMounted: boolean;
  readonly turretType?: TurretType;
  readonly turretLocked: boolean;
  readonly isSecondary?: boolean;
  readonly secondaryTurretType?: TurretType;
  readonly secondaryTurretLocked?: boolean;
}): readonly FiringArc[] {
  if (params.isTurretMounted) {
    if (params.isSecondary) {
      return getTurretArcs(
        params.secondaryTurretType,
        params.secondaryTurretLocked ?? false,
      );
    }
    return getTurretArcs(params.turretType, params.turretLocked);
  }

  if (params.isSponsonMounted) {
    // Sponsons are effectively turrets of type SPONSON_LEFT / SPONSON_RIGHT;
    // caller typically specifies the side via mountLocation.
    if (params.mountLocation === VehicleLocation.LEFT) {
      return getTurretArcs(TurretType.SPONSON_LEFT, params.turretLocked);
    }
    if (params.mountLocation === VehicleLocation.RIGHT) {
      return getTurretArcs(TurretType.SPONSON_RIGHT, params.turretLocked);
    }
  }

  // Chassis-mounted weapon: fires in the arc matching its location.
  switch (params.mountLocation) {
    case VehicleLocation.FRONT:
      return [FiringArc.Front];
    case VehicleLocation.LEFT:
      return [FiringArc.Left];
    case VehicleLocation.RIGHT:
      return [FiringArc.Right];
    case VehicleLocation.REAR:
      return [FiringArc.Rear];
    default:
      return [];
  }
}

/**
 * True if the vehicle's weapon (per its mount config + lock state) can reach
 * the attacker from `attackerPos`.
 */
export function canVehicleWeaponReach(params: {
  readonly attackerPos: IHexCoordinate;
  readonly targetPos: IHexCoordinate;
  readonly targetFacing: Facing;
  readonly mountLocation: VehicleLocation | VTOLLocation;
  readonly isTurretMounted: boolean;
  readonly isSponsonMounted: boolean;
  readonly turretType?: TurretType;
  readonly turretLocked: boolean;
}): boolean {
  const attackerArc = calculateFiringArc(
    params.attackerPos,
    params.targetPos,
    params.targetFacing,
  );
  const coverage = getVehicleWeaponArcs({
    mountLocation: params.mountLocation,
    isTurretMounted: params.isTurretMounted,
    isSponsonMounted: params.isSponsonMounted,
    turretType: params.turretType,
    turretLocked: params.turretLocked,
  });
  return coverage.includes(attackerArc);
}

// =============================================================================
// Convenience
// =============================================================================

/**
 * True if the vehicle's primary turret is currently locked.
 */
export function isPrimaryTurretLocked(state: IVehicleCombatState): boolean {
  return state.turretLock.primaryLocked;
}

/**
 * True if the vehicle's secondary turret is currently locked.
 */
export function isSecondaryTurretLocked(state: IVehicleCombatState): boolean {
  return state.turretLock.secondaryLocked;
}
