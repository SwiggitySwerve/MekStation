import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from './vehicleBVTypes';

import {
  calculateOffensiveSpeedFactor,
  calculateTMM,
} from '../battleValueMovement';

// =============================================================================
// Movement Helpers
// =============================================================================

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
  return calculateTMM(
    getVehicleEffectiveMP(input),
    input.jumpMP ?? 0,
    input.motionType === GroundMotionType.VTOL ? 1 : 0,
  );
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
