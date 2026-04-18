/**
 * Vehicle Internal Structure Calculations
 *
 * Computes structure weight and structure points per location for combat vehicles.
 *
 * Rules (TechManual):
 * - Structure weight = 10% of tonnage, rounded up to the nearest half-ton
 * - Endo-Steel or Composite structure: 50% of standard weight
 * - Structure points per location come from the vehicle tonnage table
 */

import { ceilToHalfTon } from "@/utils/physical/weightUtils";

// =============================================================================
// Structure Types
// =============================================================================

export enum VehicleStructureType {
  STANDARD = "Standard",
  ENDO_STEEL = "Endo-Steel",
  COMPOSITE = "Composite",
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
): number {
  const multiplier = STRUCTURE_TYPE_MULTIPLIER[structureType];
  const baseWeight = tonnage * 0.1;
  return ceilToHalfTon(baseWeight * multiplier);
}

// =============================================================================
// Max armor per location (2 × structure points)
// =============================================================================

/**
 * Compute maximum armor points for each vehicle location
 *
 * Per TechManual: max armor per location = 2 × internal structure
 */
export function computeVehicleMaxArmorByLocation(
  tonnage: number,
): VehicleStructurePoints {
  const structure = computeVehicleStructurePoints(tonnage);
  return {
    front: structure.front * 2,
    left: structure.left * 2,
    right: structure.right * 2,
    rear: structure.rear * 2,
    turret: structure.turret * 2,
    rotor: structure.rotor * 2,
  };
}
