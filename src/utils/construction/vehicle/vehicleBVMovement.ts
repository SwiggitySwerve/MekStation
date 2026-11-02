import { getTMMByUpperBound } from '@/constants/movement';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { VehicleBVInput } from './vehicleBVTypes';

import {
  calculateOffensiveSpeedFactor,
  calculateTMM,
} from '../battleValueMovement';
import { normalizeEquipmentId } from '../equipmentBVResolver';
import { computeFlankMP } from './engine';

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
 * Public compatibility helper: preserve effective MP, the unconditional VTOL
 * running bonus and the shared positive-only jump guard for existing callers.
 * Defensive BV uses calculateVehicleBVDefensiveTMM instead.
 */
export function calculateVehicleTMM(input: VehicleBVInput): number {
  return calculateTMM(
    getVehicleEffectiveMP(input),
    input.jumpMP ?? 0,
    input.motionType === GroundMotionType.VTOL ? 1 : 0,
  );
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

/** Undamaged BV movement: Tank.java:387-418,1570-1575,2034-2042.
 * BV settings ignore modular armor, cargo, weather and gravity.
 */
export function getVehicleBVMovement(input: VehicleBVInput) {
  const ids = (input.chassisEquipment ?? []).map((id) =>
    normalizeEquipmentId(id)
      .replace(/:omni$/, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/^(clan|is|cl)/, ''),
  );
  let walkMP = input.cruiseMP;
  if (ids.includes('hydrofoilchassismod')) walkMP = Math.round(walkMP * 1.25);
  if (
    ids.some((id) =>
      ['dunebuggy', 'cvdunebuggychassis', 'svdunebuggychassis'].includes(id),
    )
  )
    walkMP = Math.max(0, walkMP - 1);
  const boosted = ids.some((id) =>
    ['supercharger', 'vtoljetbooster', 'masc'].includes(id),
  );
  const runMP = boosted
    ? walkMP * 2
    : walkMP === input.cruiseMP
      ? input.flankMP
      : computeFlankMP(walkMP);
  const jumpMP = Math.max(
    input.jumpMP ?? 0,
    ids.filter((id) => id === 'vehiclejumpjet').length,
  );
  return { walkMP, runMP, jumpMP };
}

/**
 * CombatVehicleBVCalculator running/jumping TMM (UMU is always zero).
 * flankMP is assembled run MP; submarine depth MP does not replace it.
 * Compute adds airborne OR jumped, so a VTOL gets exactly one running point.
 */
export function calculateVehicleBVDefensiveTMM(input: VehicleBVInput): number {
  const airborne =
    input.motionType === GroundMotionType.VTOL ||
    input.motionType === GroundMotionType.WIGE;
  const stealth =
    (input.hasStealth ?? hasVehicleStealth(input.armorType)) ? 2 : 0;
  const { runMP, jumpMP } = getVehicleBVMovement(input);
  const running =
    runMP === 0 ? 0 : getTMMByUpperBound(runMP) + Number(airborne) + stealth;
  const jumping = jumpMP === 0 ? 0 : getTMMByUpperBound(jumpMP) + 1 + stealth;
  return Math.max(running, jumping, 0);
}

/**
 * Vehicle speed factor — round(pow(1 + (mp - 5) / 10, 1.2) × 100) / 100.
 */
export function calculateVehicleSpeedFactor(input: VehicleBVInput): number {
  const { walkMP, runMP, jumpMP } = getVehicleBVMovement(input);
  const train =
    input.motionType === GroundMotionType.RAIL ||
    input.motionType === GroundMotionType.MAGLEV;
  // CombatVehicleBVCalculator.java:147-163: trains use cruise; original zero run uses one.
  const mp =
    input.cruiseMP === 0
      ? 1
      : train
        ? walkMP
        : input.motionType === GroundMotionType.SUBMARINE
          ? (input.submarineMP ?? runMP)
          : runMP;
  // Reuse shared mech formula — vehicles never get a UMU; jump contributes as mp + round(jump/2).
  return calculateOffensiveSpeedFactor(mp, jumpMP, 0);
}
