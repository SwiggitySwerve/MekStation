/**
 * Vehicle Internal Structure Calculations
 *
 * Computes structure weight and structure points per location for combat vehicles.
 *
 * Rules (TechManual):
 * - Standard structure uses native superheavy and naval rules, rounded to half tons
 * - Endo-Steel or Composite structure: 50% of standard weight
 * - Structure points per location come from the vehicle tonnage table
 */

import { isSuperHeavyTank } from '@/services/conversion/blkVehicleArmorLayout';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import type { VehicleTurretKind } from './vehicleBVTypes';

import { isLargeSupportVehicle } from './engine';

/** Installed layout facts, before fixed-key armor maps add absent locations. */
export interface VehicleBVStructureLayout {
  tonnage: number;
  motionType: GroundMotionType;
  isSupportVehicle?: boolean;
  structureLocations?: readonly string[];
  turretKind?: VehicleTurretKind;
  secondaryTurretKind?: VehicleTurretKind;
}

/** The existing construction owner decides Tank versus six-side native layout. */
export function hasSixSideVehicleHull(
  layout: Pick<
    VehicleBVStructureLayout,
    'tonnage' | 'motionType' | 'isSupportVehicle'
  >,
): boolean {
  return layout.isSupportVehicle
    ? isLargeSupportVehicle(layout.tonnage, layout.motionType)
    : isSuperHeavyTank(layout.motionType, layout.tonnage);
}

/** Tank.autoSetInternal; SuperHeavyTank changes the layout, not points per location. */
export function computeVehicleBVStructurePoints(
  layout: VehicleBVStructureLayout,
): number {
  const locations = layout.structureLocations;
  const installed = (kind?: VehicleTurretKind) =>
    kind !== undefined && kind !== 'sponson';
  const turrets =
    layout.turretKind === 'dual' || installed(layout.secondaryTurretKind)
      ? 2
      : installed(layout.turretKind)
        ? 1
        : 0;
  const sixSideHull = hasSixSideVehicleHull(layout);
  const count = locations
    ? new Set(locations.filter((location) => location.toLowerCase() !== 'body'))
        .size
    : (layout.motionType === GroundMotionType.VTOL ? 5 : sixSideHull ? 6 : 4) +
      turrets;
  return computeVehicleLocationStructurePoints(layout.tonnage) * count;
}

/** Tank.autoSetInternal assigns this to each installed non-body location. */
export function computeVehicleLocationStructurePoints(tonnage: number): number {
  return Math.ceil(tonnage / 10);
}

/** Normalize the pinned EquipmentType structure codes for the shared BV table. */
export function vehicleStructureBVType(type?: string | number): string {
  if (typeof type === 'string') return type.toLowerCase();
  switch (type) {
    case 1:
      return 'industrial';
    case 4:
      return 'reinforced';
    case 5:
      return 'composite';
    default:
      return 'standard';
  }
}

// =============================================================================
// Structure Types
// =============================================================================

export enum VehicleStructureType {
  STANDARD = 'Standard',
  ENDO_STEEL = 'Endo-Steel',
  COMPOSITE = 'Composite',
}

/**
 * Weight multiplier per structure type
 */
const STRUCTURE_TYPE_MULTIPLIER: Record<VehicleStructureType, number> = {
  [VehicleStructureType.STANDARD]: 1.0,
  [VehicleStructureType.ENDO_STEEL]: 0.5,
  [VehicleStructureType.COMPOSITE]: 0.5,
};

// =============================================================================
// Structure Points Table (TechManual, pp. 60-61)
// Maps tonnage to structure points per location
// =============================================================================

/**
 * Structure points for each vehicle location by tonnage bracket.
 *
 * Columns: [Front, Left, Right, Rear, Turret] (Body = same as Front for most vehicles)
 * Per TechManual vehicle internal structure table.
 */
const VEHICLE_STRUCTURE_TABLE: Record<
  number,
  { front: number; side: number; rear: number; turret: number; rotor: number }
> = {
  5: { front: 3, side: 2, rear: 1, turret: 1, rotor: 2 },
  10: { front: 4, side: 3, rear: 2, turret: 2, rotor: 2 },
  15: { front: 5, side: 4, rear: 3, turret: 2, rotor: 2 },
  20: { front: 6, side: 5, rear: 3, turret: 3, rotor: 2 },
  25: { front: 7, side: 6, rear: 4, turret: 3, rotor: 2 },
  30: { front: 8, side: 7, rear: 4, turret: 4, rotor: 2 },
  35: { front: 9, side: 8, rear: 5, turret: 4, rotor: 2 },
  40: { front: 10, side: 9, rear: 5, turret: 5, rotor: 2 },
  45: { front: 11, side: 10, rear: 6, turret: 5, rotor: 2 },
  50: { front: 12, side: 11, rear: 6, turret: 6, rotor: 2 },
  55: { front: 13, side: 12, rear: 7, turret: 6, rotor: 2 },
  60: { front: 14, side: 13, rear: 7, turret: 7, rotor: 2 },
  65: { front: 15, side: 14, rear: 8, turret: 7, rotor: 2 },
  70: { front: 16, side: 15, rear: 8, turret: 8, rotor: 2 },
  75: { front: 17, side: 16, rear: 9, turret: 8, rotor: 2 },
  80: { front: 18, side: 17, rear: 9, turret: 9, rotor: 2 },
  85: { front: 19, side: 18, rear: 10, turret: 9, rotor: 2 },
  90: { front: 20, side: 19, rear: 10, turret: 10, rotor: 2 },
  95: { front: 21, side: 20, rear: 11, turret: 10, rotor: 2 },
  100: { front: 22, side: 21, rear: 11, turret: 11, rotor: 2 },
};

/**
 * Get structure points for a given tonnage (rounds up to nearest 5-ton bracket)
 */
function getStructureRow(tonnage: number): {
  front: number;
  side: number;
  rear: number;
  turret: number;
  rotor: number;
} {
  // Round up to nearest 5-ton bracket (min 5, max 100 for standard vehicles)
  const bracket = Math.min(100, Math.max(5, Math.ceil(tonnage / 5) * 5));
  return VEHICLE_STRUCTURE_TABLE[bracket] ?? VEHICLE_STRUCTURE_TABLE[100];
}

// =============================================================================
// Structure Points by Location
// =============================================================================

export interface VehicleStructurePoints {
  front: number;
  left: number;
  right: number;
  rear: number;
  turret: number;
  rotor: number;
}

/**
 * Compute internal structure points per location for a given tonnage
 */
export function computeVehicleStructurePoints(
  tonnage: number,
): VehicleStructurePoints {
  const row = getStructureRow(tonnage);
  return {
    front: row.front,
    left: row.side,
    right: row.side,
    rear: row.rear,
    turret: row.turret,
    rotor: row.rotor,
  };
}

// =============================================================================
// Structure Weight
// =============================================================================

/**
 * Compute vehicle structure weight
 *
 * weight = ceil(tonnage × 0.10 / 0.5) × 0.5 × structureMultiplier
 */
export function computeVehicleStructureWeight(
  tonnage: number,
  structureType: VehicleStructureType = VehicleStructureType.STANDARD,
  motionType: GroundMotionType = GroundMotionType.TRACKED,
): number {
  const multiplier = STRUCTURE_TYPE_MULTIPLIER[structureType];
  // TestTank.java:87-95 uses VTOL.isSuperHeavy (VTOL.java:729-730),
  // independently of the Tank hull-layout classifier.
  const superHeavy =
    isSuperHeavyTank(motionType, tonnage) ||
    (motionType === GroundMotionType.VTOL && tonnage > 30);
  const doubles =
    superHeavy &&
    structureType !== VehicleStructureType.COMPOSITE &&
    (structureType === VehicleStructureType.ENDO_STEEL ||
      (motionType !== GroundMotionType.NAVAL &&
        motionType !== GroundMotionType.SUBMARINE));
  const baseWeight = tonnage * 0.1;
  return ceilToHalfTon(baseWeight * multiplier * (doubles ? 2 : 1));
}
