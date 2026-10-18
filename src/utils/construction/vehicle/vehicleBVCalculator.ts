import type { VehicleBVInput, IVehicleBVBreakdown } from './vehicleBVTypes';

import { calculateVehicleDefensiveBV } from './vehicleBVDefensive';
import { calculateVehicleOffensiveBV } from './vehicleBVOffensive';

// =============================================================================
// Pilot skill table (vehicle crew — same matrix as mech pilots)
// =============================================================================

const VEHICLE_PILOT_MATRIX: number[][] = [
  [2.42, 2.31, 2.21, 2.1, 1.93, 1.75, 1.68, 1.59, 1.5],
  [2.21, 2.11, 2.02, 1.92, 1.76, 1.6, 1.54, 1.46, 1.38],
  [1.93, 1.85, 1.76, 1.68, 1.54, 1.4, 1.35, 1.28, 1.21],
  [1.66, 1.58, 1.51, 1.44, 1.32, 1.2, 1.16, 1.1, 1.04],
  [1.38, 1.32, 1.26, 1.2, 1.1, 1.0, 0.95, 0.9, 0.85],
  [1.31, 1.19, 1.13, 1.08, 0.99, 0.9, 0.86, 0.81, 0.77],
  [1.24, 1.12, 1.07, 1.02, 0.94, 0.85, 0.81, 0.77, 0.72],
  [1.17, 1.06, 1.01, 0.96, 0.88, 0.8, 0.76, 0.72, 0.68],
  [1.1, 0.99, 0.95, 0.9, 0.83, 0.75, 0.71, 0.68, 0.64],
];

function getVehiclePilotMultiplier(gunnery: number, piloting: number): number {
  const g = Math.max(0, Math.min(8, Math.floor(gunnery)));
  const p = Math.max(0, Math.min(8, Math.floor(piloting)));
  return VEHICLE_PILOT_MATRIX[g][p];
}

// =============================================================================
// Unified Calculator
// =============================================================================

/**
 * Compute the full vehicle BV breakdown.
 */
export function calculateVehicleBV(input: VehicleBVInput): IVehicleBVBreakdown {
  const def = calculateVehicleDefensiveBV(input);
  const off = calculateVehicleOffensiveBV(input);

  const gunnery = input.gunnery ?? 4;
  const piloting = input.piloting ?? 5;
  const pilotMultiplier = getVehiclePilotMultiplier(gunnery, piloting);

  const base = def.total + off.total;
  const final = Math.round(base * pilotMultiplier);

  return {
    defensive: def.total,
    offensive: off.total,
    pilotMultiplier,
    turretModifier: off.turretModifier,
    final,

    armorBV: def.armorBV,
    structureBV: def.structureBV,
    defensiveEquipmentBV: def.defensiveEquipmentBV,
    defensiveFactor: def.defensiveFactor,
    tmm: def.tmm,

    weaponBV: off.weaponBV,
    ammoBV: off.ammoBV,
    offensiveEquipmentBV: off.offensiveEquipmentBV,
    speedFactor: off.speedFactor,
  };
}
