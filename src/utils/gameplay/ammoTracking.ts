/**
 * Ammo Tracking Module
 * Implements BattleTech ammunition tracking, consumption, explosion,
 * and CASE/CASE II protection systems.
 *
 * Pure function module — no side effects, injectable DiceRoller.
 *
 * @spec openspec/changes/full-combat-parity/specs/ammo-tracking/spec.md
 * @spec openspec/changes/full-combat-parity/specs/ammo-explosion-system/spec.md
 */

import { CombatLocation, CriticalEffectType } from '@/types/gameplay';
import {
  IAmmoSlotState,
  IAmmoConsumedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { D6Roller } from './hitLocation';

// =============================================================================
// Types
// =============================================================================

/**
 * CASE protection level for a location.
 */
export type CASEProtectionLevel = 'none' | 'case' | 'case_ii';

/**
 * Unit CASE configuration: maps locations to their CASE protection level.
 */
export type UnitCASEConfig = Partial<Record<string, CASEProtectionLevel>>;

/**
 * Construction data for initializing ammo bins at game start.
 */
export interface IAmmoConstructionData {
  /** Unique bin identifier */
  readonly binId: string;
  /** Weapon type this ammo feeds (e.g., 'AC/10', 'SRM 6', 'LRM 20') */
  readonly weaponType: string;
  /** Location of the ammo bin */
  readonly location: string;
  /** Maximum rounds per bin */
  readonly maxRounds: number;
  /** Damage per round for explosion calculation */
  readonly damagePerRound: number;
  /** Whether this ammo is explosive */
  readonly isExplosive: boolean;
}

/**
 * Result of consuming ammo.
 */
export interface IAmmoConsumeResult {
  /** Updated ammo state (immutable) */
  readonly updatedAmmoState: Record<string, IAmmoSlotState>;
  /** The event payload to emit */
  readonly event: IAmmoConsumedPayload;
  /** Whether ammo was successfully consumed */
  readonly success: boolean;
}

/**
 * Result of an ammo explosion.
 */
export interface IAmmoExplosionResult {
  /** Total explosion damage */
  readonly totalDamage: number;
  /** Location where explosion occurs */
  readonly location: string;
  /** CASE protection level at location */
  readonly caseProtection: CASEProtectionLevel;
  /** Damage that transfers to adjacent locations */
  readonly transferDamage: number;
  /** Whether pilot takes damage */
  readonly pilotDamage: number;
  /** Whether the bin was destroyed */
  readonly binDestroyed: boolean;
  /** Updated ammo state with bin marked as destroyed */
  readonly updatedAmmoState: Record<string, IAmmoSlotState>;
  /** The bin that exploded */
  readonly binId: string;
  /** Weapon type of exploded ammo */
  readonly weaponType: string;
}

/**
 * Result of a Gauss rifle explosion.
 */
export interface IGaussExplosionResult {
  /** Always 20 damage */
  readonly totalDamage: number;
  /** Location of the Gauss rifle */
  readonly location: string;
  /** Whether CASE limits the explosion */
  readonly caseProtection: CASEProtectionLevel;
  /** Damage transferred */
  readonly transferDamage: number;
  /** Pilot damage */
  readonly pilotDamage: number;
}

// =============================================================================
// Task 6.3: Initialize Ammo Bin State from Construction Data
// =============================================================================

/**
 * Initialize ammo bin state from unit construction data at game start.
 * Each ton of ammo becomes a separate bin.
 *
 * @param constructionData - Ammo bin definitions from unit data
 * @returns Record of ammo bin states keyed by binId
 */
export function initializeAmmoState(
  constructionData: readonly IAmmoConstructionData[],
): Record<string, IAmmoSlotState> {
  const ammoState: Record<string, IAmmoSlotState> = {};

  for (const data of constructionData) {
    ammoState[data.binId] = {
      binId: data.binId,
      weaponType: data.weaponType,
      location: data.location,
      remainingRounds: data.maxRounds,
      maxRounds: data.maxRounds,
      isExplosive: data.isExplosive,
    };
  }

  return ammoState;
}

// =============================================================================
// Task 6.4: Consume Ammo with AmmoConsumed Events
// =============================================================================

/**
 * Consume ammunition for a weapon firing.
 * Finds the first non-empty, non-destroyed bin matching the weapon type.
 *
 * @param ammoState - Current ammo state
 * @param unitId - Unit firing the weapon
 * @param weaponType - The weapon type requiring ammo
 * @param rounds - Number of rounds to consume (default: 1)
 * @returns Consume result with updated state and event, or null if no ammo
 */
export function consumeAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  unitId: string,
  weaponType: string,
  rounds: number = 1,
): IAmmoConsumeResult | null {
  // Find first non-empty matching bin
  const bin = findAvailableAmmoBin(ammoState, weaponType);
  if (!bin) return null;

  const newRemainingRounds = Math.max(0, bin.remainingRounds - rounds);

  const updatedAmmoState: Record<string, IAmmoSlotState> = {
    ...ammoState,
    [bin.binId]: {
      ...bin,
      remainingRounds: newRemainingRounds,
    },
  };

  const event: IAmmoConsumedPayload = {
    unitId,
    binId: bin.binId,
    weaponType,
    roundsConsumed: rounds,
    roundsRemaining: newRemainingRounds,
  };

  return {
    updatedAmmoState,
    event,
    success: true,
  };
}

// =============================================================================
// Task 6.5: Weapon Firing Restrictions
// =============================================================================

/**
 * Check if a weapon has ammo available to fire.
 * Energy weapons always return true (no ammo required).
 *
 * @param ammoState - Current ammo state
 * @param weaponType - The weapon type to check
 * @param isEnergyWeapon - Whether this is an energy weapon (no ammo needed)
 * @returns true if weapon can fire
 */
export function hasAmmoForWeapon(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
  isEnergyWeapon: boolean = false,
): boolean {
  // Energy weapons don't need ammo
  if (isEnergyWeapon) return true;

  return findAvailableAmmoBin(ammoState, weaponType) !== null;
}

/**
 * Get all weapons that can currently fire (have ammo or are energy weapons).
 *
 * @param ammoState - Current ammo state
 * @param weapons - Array of weapon definitions
 * @returns Array of weapon IDs that can fire
 */
export function getFireableWeapons(
  ammoState: Record<string, IAmmoSlotState>,
  weapons: readonly {
    weaponId: string;
    weaponType: string;
    isEnergy: boolean;
  }[],
): readonly string[] {
  return weapons
    .filter((w) => hasAmmoForWeapon(ammoState, w.weaponType, w.isEnergy))
    .map((w) => w.weaponId);
}

// =============================================================================
// Task 6.6: Ammo Explosion from Critical Hit
// =============================================================================

/**
 * Resolve an ammo bin explosion from a critical hit.
 * Damage = remainingRounds × damagePerRound, applied to IS at bin location.
 *
 * @param ammoState - Current ammo state
 * @param binId - The bin that was critically hit
 * @param damagePerRound - Damage per round for this ammo type
 * @param caseProtection - CASE protection level at the bin's location
 * @returns Explosion result, or null if bin is empty/doesn't exist
 */
export function resolveAmmoExplosion(
  ammoState: Record<string, IAmmoSlotState>,
  binId: string,
  damagePerRound: number,
  caseProtection: CASEProtectionLevel,
): IAmmoExplosionResult | null {
  const bin = ammoState[binId];
  if (!bin) return null;

  // Empty bin — no explosion
  if (bin.remainingRounds <= 0) {
    // Still mark as destroyed
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

  // Calculate transfer damage and pilot damage based on CASE level
  const { transferDamage, pilotDamage } = calculateCASEEffects(
    totalDamage,
    caseProtection,
  );

  // Mark bin as destroyed (0 rounds)
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

// =============================================================================
// Tasks 6.7, 6.8, 6.9: CASE Protection Effects
// =============================================================================

/**
 * Calculate CASE protection effects on explosion damage.
 *
 * - CASE: No transfer damage, no pilot damage. Location may be destroyed.
 * - CASE II: Only 1 point transfers, no pilot damage.
 * - No CASE: Full transfer, pilot takes 1 damage.
 *
 * @param totalDamage - Total explosion damage
 * @param protection - CASE level
 * @returns Transfer damage and pilot damage
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
      // Task 6.7: CASE — limit to location, no transfer, no pilot damage
      return { transferDamage: 0, pilotDamage: 0 };
    case 'case_ii':
      // Task 6.8: CASE II — only 1 point transfers, no pilot damage
      return { transferDamage: 1, pilotDamage: 0 };
    case 'none':
    default:
      // Task 6.9: No CASE — normal transfer, pilot takes 1 damage
      return { transferDamage: totalDamage, pilotDamage: 1 };
  }
}

// =============================================================================
// Task 6.10: Clan Omnimech Default CASE
// =============================================================================

/**
 * Determine CASE protection level for a location, considering
 * Clan OmniMech default CASE in side torsos.
 *
 * @param location - The location to check
 * @param unitCASE - Explicit CASE equipment on the unit
 * @param isClanOmnimech - Whether the unit is a Clan OmniMech
 * @returns CASE protection level
 */
export function getCASEProtection(
  location: string,
  unitCASE: UnitCASEConfig = {},
  isClanOmnimech: boolean = false,
): CASEProtectionLevel {
  // Explicit CASE/CASE II equipment takes priority
  const explicitCASE = unitCASE[location];
  if (explicitCASE) return explicitCASE;

  // Clan OmniMech default CASE in side torsos
  if (isClanOmnimech) {
    if (location === 'left_torso' || location === 'right_torso') {
      return 'case';
    }
  }

  return 'none';
}

// =============================================================================
// Task 6.11: Gauss Rifle Explosion
// =============================================================================

/**
 * Resolve a Gauss rifle explosion on critical hit.
 * Always 20 damage, no ammo dependency.
 *
 * @param location - Location of the Gauss rifle
 * @param caseProtection - CASE protection level at the location
 * @returns Gauss explosion result
 */
export function resolveGaussExplosion(
  location: string,
  caseProtection: CASEProtectionLevel,
): IGaussExplosionResult {
  const totalDamage = 20;
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

// =============================================================================
// Heat-Induced Ammo Explosion (referenced in spec, full impl in Phase 7)
// =============================================================================

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
  if (heatLevel >= 30) return Infinity; // Auto-explode
  if (heatLevel >= 28) return 8;
  if (heatLevel >= 23) return 6;
  if (heatLevel >= 19) return 4;
  return null; // No check needed
}

/**
 * Check if a heat-induced ammo explosion occurs for a specific bin.
 *
 * @param heatLevel - Current heat level
 * @param diceRoller - Injectable dice roller
 * @returns true if explosion occurs (roll FAILED to meet TN)
 */
export function checkHeatAmmoExplosion(
  heatLevel: number,
  diceRoller: D6Roller,
): boolean {
  const tn = getHeatAmmoExplosionTN(heatLevel);
  if (tn === null) return false;
  if (tn === Infinity) return true; // Auto-explode at 30+

  // Roll 2d6 — meet or beat TN to AVOID explosion
  const d1 = diceRoller();
  const d2 = diceRoller();
  const total = d1 + d2;
  return total < tn; // Explosion if BELOW TN
}

/**
 * Select a random non-empty ammo bin for heat-induced explosion.
 *
 * @param ammoState - Current ammo state
 * @param diceRoller - Injectable dice roller
 * @returns The selected bin ID, or null if no non-empty bins
 */
export function selectRandomAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  diceRoller: D6Roller,
): string | null {
  const nonEmptyBins = Object.values(ammoState).filter(
    (bin) => bin.remainingRounds > 0,
  );
  if (nonEmptyBins.length === 0) return null;

  const roll = diceRoller();
  const index = (roll - 1) % nonEmptyBins.length;
  return nonEmptyBins[index].binId;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find the first non-empty ammo bin matching a weapon type.
 */
function findAvailableAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): IAmmoSlotState | null {
  const bins = Object.values(ammoState);

  // Find first non-empty matching bin
  for (const bin of bins) {
    if (bin.weaponType === weaponType && bin.remainingRounds > 0) {
      return bin;
    }
  }

  return null;
}

/**
 * Get total remaining ammo for a weapon type across all bins.
 */
export function getTotalAmmo(
  ammoState: Record<string, IAmmoSlotState>,
  weaponType: string,
): number {
  return Object.values(ammoState)
    .filter((bin) => bin.weaponType === weaponType)
    .reduce((total, bin) => total + bin.remainingRounds, 0);
}

/**
 * Get all ammo bins at a specific location.
 */
export function getAmmoBinsAtLocation(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
): readonly IAmmoSlotState[] {
  return Object.values(ammoState).filter((bin) => bin.location === location);
}

/**
 * Check if a weapon type requires ammo (is not an energy weapon).
 * Common energy weapons: lasers, PPCs, flamers.
 */
export function isEnergyWeapon(weaponName: string): boolean {
  const name = weaponName.toLowerCase();
  return (
    name.includes('laser') ||
    name.includes('ppc') ||
    name.includes('flamer') ||
    name.includes('plasma')
  );
}
