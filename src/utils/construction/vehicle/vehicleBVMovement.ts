import { getTMMByUpperBound } from '@/constants/movement';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from './vehicleBVTypes';

import { calculateOffensiveSpeedFactor } from '../battleValueMovement';

// =============================================================================
// Movement Helpers
// =============================================================================

/**
 * Effective MP used for the existing offensive speed factor.
 *
 * Rules:
 *   - Tracked / wheeled / naval / rail / maglev: flank MP.
 *   - VTOL: flank MP.
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
 * Entity.hasStealth: uniform stealth armor only; patchwork is excluded.
 * Numeric values are the pinned MegaMek armor codes, not local enum ordinals.
 */
export function hasVehicleStealth(armorType?: string | number): boolean {
  return typeof armorType === 'number'
    ? armorType === 8 || armorType === 22
    : armorType?.toLowerCase() === 'stealth';
}

/**
 * CombatVehicleBVCalculator running/jumping TMM (UMU is always zero).
 * flankMP is assembled run MP; submarine depth MP does not replace it.
 * Compute adds airborne OR jumped, so a VTOL gets exactly one running point.
 */
export function calculateVehicleTMM(input: VehicleBVInput): number {
  const airborne =
    input.motionType === GroundMotionType.VTOL ||
    input.motionType === GroundMotionType.WIGE;
  const stealth =
    (input.hasStealth ?? hasVehicleStealth(input.armorType)) ? 2 : 0;
  const jumpMP = input.jumpMP ?? 0;
  const running =
    input.flankMP === 0
      ? 0
      : getTMMByUpperBound(input.flankMP) + Number(airborne) + stealth;
  const jumping = jumpMP === 0 ? 0 : getTMMByUpperBound(jumpMP) + 1 + stealth;
  return Math.max(running, jumping, 0);
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
