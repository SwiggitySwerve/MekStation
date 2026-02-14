/**
 * Ammo Explosion Resolution
 * Ammo explosions, Gauss explosions, heat-induced explosions, CASE effects, and CASE protection.
 */

import { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import type {
  CASEProtectionLevel,
  IAmmoExplosionResult,
  IGaussExplosionResult,
  UnitCASEConfig,
} from './types';

// Constants
const GAUSS_EXPLOSION_DAMAGE = 20;
const HEAT_AUTO_EXPLOSION_THRESHOLD = 30;
const HEAT_EXPLOSION_TN8_THRESHOLD = 28;
const HEAT_EXPLOSION_TN6_THRESHOLD = 23;
const HEAT_EXPLOSION_TN4_THRESHOLD = 19;
const HEAT_EXPLOSION_TN_HIGH = 8;
const HEAT_EXPLOSION_TN_MEDIUM = 6;
const HEAT_EXPLOSION_TN_LOW = 4;
const CASE_II_TRANSFER_DAMAGE = 1;
const UNPROTECTED_EXPLOSION_PILOT_DAMAGE = 1;

/**
 * Resolve an ammo bin explosion from a critical hit.
 * Damage = remainingRounds × damagePerRound, applied to IS at bin location.
 */
export function resolveAmmoExplosion(
  ammoState: Record<string, IAmmoSlotState>,
  binId: string,
  damagePerRound: number,
  caseProtection: CASEProtectionLevel,
): IAmmoExplosionResult | null {
  const bin = ammoState[binId];
  if (!bin) return null;

  if (bin.remainingRounds <= 0) {
    const updatedAmmoState: Record<string, IAmmoSlotState> = {
      ...ammoState,
      [binId]: { ...bin, remainingRounds: 0 },
    };
    return {
      totalDamage: 0,
      location: bin.location,
      caseProtection,
      transferDamage: 0,
      pilotDamage: 0,
      binDestroyed: true,
      updatedAmmoState,
      binId,
      weaponType: bin.weaponType,
    };
  }

  const totalDamage = bin.remainingRounds * damagePerRound;

  const { transferDamage, pilotDamage } = calculateCASEEffects(
    totalDamage,
    caseProtection,
  );

  const updatedAmmoState: Record<string, IAmmoSlotState> = {
    ...ammoState,
    [binId]: { ...bin, remainingRounds: 0 },
  };

  return {
    totalDamage,
    location: bin.location,
    caseProtection,
    transferDamage,
    pilotDamage,
    binDestroyed: true,
    updatedAmmoState,
    binId,
    weaponType: bin.weaponType,
  };
}

/**
 * Calculate CASE protection effects on explosion damage.
 *
 * - CASE: No transfer damage, no pilot damage. Location may be destroyed.
 * - CASE II: Only 1 point transfers, no pilot damage.
 * - No CASE: Full transfer, pilot takes 1 damage.
 */
export function calculateCASEEffects(
  totalDamage: number,
  protection: CASEProtectionLevel,
): { transferDamage: number; pilotDamage: number } {
  if (totalDamage <= 0) {
    return { transferDamage: 0, pilotDamage: 0 };
  }

  switch (protection) {
    case 'case':
      return { transferDamage: 0, pilotDamage: 0 };
    case 'case_ii':
      return { transferDamage: CASE_II_TRANSFER_DAMAGE, pilotDamage: 0 };
    case 'none':
    default:
      return {
        transferDamage: totalDamage,
        pilotDamage: UNPROTECTED_EXPLOSION_PILOT_DAMAGE,
      };
  }
}

/**
 * Determine CASE protection level for a location, considering
 * Clan OmniMech default CASE in side torsos.
 */
export function getCASEProtection(
  location: string,
  unitCASE: UnitCASEConfig = {},
  isClanOmnimech: boolean = false,
): CASEProtectionLevel {
  const explicitCASE = unitCASE[location];
  if (explicitCASE) return explicitCASE;

  if (isClanOmnimech) {
    if (location === 'left_torso' || location === 'right_torso') {
      return 'case';
    }
  }

  return 'none';
}

/**
 * Resolve a Gauss rifle explosion on critical hit.
 * Always 20 damage, no ammo dependency.
 */
export function resolveGaussExplosion(
  location: string,
  caseProtection: CASEProtectionLevel,
): IGaussExplosionResult {
  const totalDamage = GAUSS_EXPLOSION_DAMAGE;
  const { transferDamage, pilotDamage } = calculateCASEEffects(
    totalDamage,
    caseProtection,
  );

  return {
    totalDamage,
    location,
    caseProtection,
    transferDamage,
    pilotDamage,
  };
}

/**
 * Get the target number for heat-induced ammo explosion check.
 * Returns null if heat is below explosion threshold.
 *
 * Heat 19-22: TN 4 (roll >= 4 to avoid)
 * Heat 23-27: TN 6
 * Heat 28-29: TN 8
 * Heat 30+: Auto-explosion (TN = Infinity)
 */
export function getHeatAmmoExplosionTN(heatLevel: number): number | null {
  if (heatLevel >= HEAT_AUTO_EXPLOSION_THRESHOLD) return Infinity;
  if (heatLevel >= HEAT_EXPLOSION_TN8_THRESHOLD) return HEAT_EXPLOSION_TN_HIGH;
  if (heatLevel >= HEAT_EXPLOSION_TN6_THRESHOLD)
    return HEAT_EXPLOSION_TN_MEDIUM;
  if (heatLevel >= HEAT_EXPLOSION_TN4_THRESHOLD) return HEAT_EXPLOSION_TN_LOW;
  return null;
}

/**
 * Check if a heat-induced ammo explosion occurs for a specific bin.
 */
export function checkHeatAmmoExplosion(
  heatLevel: number,
  diceRoller: () => number,
): boolean {
  const tn = getHeatAmmoExplosionTN(heatLevel);
  if (tn === null) return false;
  if (tn === Infinity) return true;

  const d1 = diceRoller();
  const d2 = diceRoller();
  const total = d1 + d2;
  return total < tn;
}
