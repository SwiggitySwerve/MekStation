import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from './vehicleBVTypes';

import { calculateOffensiveSpeedFactor } from '../battleValueMovement';

// =============================================================================
// Movement Helpers
// =============================================================================

/**
 * Vehicle TMM table — same as mech table, indexed by run MP.
 */
function vehicleRunMPtoTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

/**
 * Effective MP used for TMM and speed factor.
 *
 * Rules:
 *   - Tracked / wheeled / naval / rail / maglev: flank MP.
 *   - VTOL: flank MP (altitude delta is 0 at construction time —
 *           the +1 TMM bonus is added downstream).
 *   - Hover / hydrofoil / WiGE: flank MP.
 *   - Submarine: submarineMP override (defaults to flank MP).
 */
export function getVehicleEffectiveMP(input: VehicleBVInput): number {
  if (input.motionType === GroundMotionType.SUBMARINE) {
    return input.submarineMP ?? input.flankMP;
  }
  return input.flankMP;
}

/**
 * Vehicle TMM including motion-type bonuses.
 *
 *   - VTOL: +1 TMM (altitude bonus).
 *   - Hover / Hydrofoil / WiGE: +0 at construction BV (terrain-dependent
 *     bonus is applied in combat, not in BV per MegaMek rules).
 */
export function calculateVehicleTMM(input: VehicleBVInput): number {
  const runMP = getVehicleEffectiveMP(input);
  let tmm = vehicleRunMPtoTMM(runMP);

  if (input.motionType === GroundMotionType.VTOL) {
    tmm += 1;
  }

  // Include jump bonus (rare on vehicles, but WiGE/VTOL jet-equipped can have it).
  const jumpMP = input.jumpMP ?? 0;
  if (jumpMP > 0) {
    const jumpTMM = vehicleRunMPtoTMM(jumpMP) + 1;
    if (jumpTMM > tmm) tmm = jumpTMM;
  }

  return tmm;
}

/**
 * Vehicle speed factor — round(pow(1 + (mp - 5) / 10, 1.2) × 100) / 100.
 */
export function calculateVehicleSpeedFactor(input: VehicleBVInput): number {
  const mp = getVehicleEffectiveMP(input);
  const jumpMP = input.jumpMP ?? 0;
  // Reuse shared mech formula — vehicles never get a UMU; jump contributes as mp + round(jump/2).
  return calculateOffensiveSpeedFactor(mp, jumpMP, 0);
}
