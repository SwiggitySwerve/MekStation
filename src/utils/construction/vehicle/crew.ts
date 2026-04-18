/**
 * Vehicle Crew Size Calculation
 *
 * Derives minimum crew from tonnage and motion type per BattleTech TechManual.
 *
 * Crew slots:
 * - All vehicles > 5t require a commander slot
 * - Driver is always required
 * - Gunner required when weapons are present (assumed for combat vehicles)
 * - VTOL: pilot + gunner minimum (2)
 *
 * Tonnage-based minimums (Tracked/Wheeled/Hover ground vehicles):
 *   1–10t  : 1 (driver only)
 *   11–20t : 2 (driver + gunner)
 *   21–40t : 3 (driver + gunner + commander)
 *   41–80t : 4
 *   81–100t: 5
 *   >100t  : 6
 *
 * Naval/Submarine/Hydrofoil add +1 per 100t above 100.
 * VTOL minimum is always 2 regardless of tonnage.
 */

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

// =============================================================================
// Minimum Crew Table
// =============================================================================

/**
 * Crew breakpoints for standard ground vehicles (Tracked/Wheeled/Hover/WiGE)
 */
const GROUND_CREW_BREAKPOINTS: Array<{ maxTonnage: number; crew: number }> = [
  { maxTonnage: 10, crew: 1 },
  { maxTonnage: 20, crew: 2 },
  { maxTonnage: 40, crew: 3 },
  { maxTonnage: 80, crew: 4 },
  { maxTonnage: 100, crew: 5 },
  { maxTonnage: Infinity, crew: 6 },
];

/**
 * Compute minimum crew for standard ground vehicles
 */
function groundVehicleMinCrew(tonnage: number): number {
  for (const { maxTonnage, crew } of GROUND_CREW_BREAKPOINTS) {
    if (tonnage <= maxTonnage) return crew;
  }
  return 6;
}

/**
 * Compute minimum crew for naval vehicles (Naval, Submarine, Hydrofoil)
 * Base crew follows ground table; add 1 per 100t above 100t.
 */
function navalVehicleMinCrew(tonnage: number): number {
  const base = groundVehicleMinCrew(Math.min(tonnage, 100));
  const extraHundreds = Math.max(0, Math.floor((tonnage - 100) / 100));
  return base + extraHundreds;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compute minimum crew for a vehicle given tonnage and motion type
 */
export function computeMinimumCrew(
  tonnage: number,
  motionType: GroundMotionType,
): number {
  switch (motionType) {
    case GroundMotionType.VTOL:
      // VTOLs always require at least pilot + gunner
      return 2;

    case GroundMotionType.NAVAL:
    case GroundMotionType.SUBMARINE:
    case GroundMotionType.HYDROFOIL:
      return navalVehicleMinCrew(tonnage);

    case GroundMotionType.TRACKED:
    case GroundMotionType.WHEELED:
    case GroundMotionType.HOVER:
    case GroundMotionType.WIGE:
    case GroundMotionType.RAIL:
    case GroundMotionType.MAGLEV:
    default:
      return groundVehicleMinCrew(tonnage);
  }
}

/**
 * Compute total crew weight
 *
 * Each crew member weighs 0 tons (crew weight is baked into the vehicle
 * per BattleTech TechManual — no separate tonnage entry for crew).
 * This function is a no-op but is kept for API symmetry and future extension.
 */
export function computeCrewWeight(_crewSize: number): number {
  return 0;
}

// =============================================================================
// Validation
// =============================================================================

export interface CrewValidationResult {
  isValid: boolean;
  minimumCrew: number;
  errors: Array<{ ruleId: string; message: string }>;
}

/**
 * Validate that a vehicle has at least the minimum required crew.
 *
 * Emits VAL-VEHICLE-CREW when configured crew < minimum.
 */
export function validateVehicleCrew(
  tonnage: number,
  motionType: GroundMotionType,
  configuredCrew: number,
): CrewValidationResult {
  const minimumCrew = computeMinimumCrew(tonnage, motionType);
  const errors: Array<{ ruleId: string; message: string }> = [];

  if (configuredCrew < minimumCrew) {
    errors.push({
      ruleId: 'VAL-VEHICLE-CREW',
      message: `Vehicle requires at least ${minimumCrew} crew members for a ${tonnage}t ${motionType} vehicle — only ${configuredCrew} configured`,
    });
  }

  return {
    isValid: errors.length === 0,
    minimumCrew,
    errors,
  };
}
