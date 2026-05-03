/**
 * SPA Acquisition System
 *
 * Implements special ability (SPA) acquisition through:
 * - Veterancy rolls (once per person, 1/40 chance of flaw)
 * - Coming-of-age rolls (stub)
 * - Purchase system (XP deduction via delta-return)
 *
 * All mutating functions use (entry: ICampaignRosterEntry, pilot: IPilot | null)
 * and return delta objects rather than mutated entities.
 * NPC rule: if pilot === null, return null / failure delta.
 *
 * @module campaign/progression/spaAcquisition
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ISpaPurchaseDelta } from '@/types/campaign/progression/progressionTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a special ability that can be acquired by personnel.
 */
export interface ISpecialAbility {
  /** Unique identifier for this SPA */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Description of the ability */
  readonly description: string;

  /** XP cost to purchase (negative for flaws that grant XP) */
  readonly xpCost: number;

  /** Whether this is a flaw (negative effect) */
  readonly isFlaw: boolean;

  /** Whether this SPA can only be acquired at character origin */
  readonly isOriginOnly: boolean;
}

/**
 * Injectable random function for deterministic testing.
 * Returns a value between 0 and 1.
 */
export type RandomFn = () => number;

// =============================================================================
// SPA Catalog
// =============================================================================

/**
 * Catalog of all available special abilities.
 * Contains ~10 representative SPAs covering benefits, origin-only, and flaws.
 */
export const SPA_CATALOG: Record<string, ISpecialAbility> = {
  // Benefits
  fast_learner: {
    id: 'fast_learner',
    name: 'Fast Learner',
    description: '-20% XP cost',
    xpCost: 30,
    isFlaw: false,
    isOriginOnly: false,
  },
  toughness: {
    id: 'toughness',
    name: 'Toughness',
    description: 'Absorb 1 additional hit',
    xpCost: 25,
    isFlaw: false,
    isOriginOnly: false,
  },
  pain_resistance: {
    id: 'pain_resistance',
    name: 'Pain Resistance',
    description: 'Ignore wound penalties',
    xpCost: 20,
    isFlaw: false,
    isOriginOnly: false,
  },
  weapon_specialist: {
    id: 'weapon_specialist',
    name: 'Weapon Specialist',
    description: '-1 TN with chosen weapon',
    xpCost: 15,
    isFlaw: false,
    isOriginOnly: false,
  },
  tactical_genius: {
    id: 'tactical_genius',
    name: 'Tactical Genius',
    description: '+1 initiative',
    xpCost: 35,
    isFlaw: false,
    isOriginOnly: false,
  },
  iron_man: {
    id: 'iron_man',
    name: 'Iron Man',
    description: 'No consciousness roll',
    xpCost: 40,
    isFlaw: false,
    isOriginOnly: false,
  },

  // Origin-only
  natural_aptitude: {
    id: 'natural_aptitude',
    name: 'Natural Aptitude',
    description: '-1 TN for chosen skill',
    xpCost: 25,
    isFlaw: false,
    isOriginOnly: true,
  },

  // Flaws
  slow_learner: {
    id: 'slow_learner',
    name: 'Slow Learner',
    description: '+20% XP cost',
    xpCost: -10,
    isFlaw: true,
    isOriginOnly: false,
  },
  glass_jaw: {
    id: 'glass_jaw',
    name: 'Glass Jaw',
    description: '-1 consciousness threshold',
    xpCost: -10,
    isFlaw: true,
    isOriginOnly: false,
  },
  gremlins: {
    id: 'gremlins',
    name: 'Gremlins',
    description: '+10% tech skill XP cost',
    xpCost: -5,
    isFlaw: true,
    isOriginOnly: false,
  },
};

// =============================================================================
// Veterancy SPA Roll
// =============================================================================

/**
 * Rolls for a veterancy SPA (once per person).
 *
 * NPC rule: if pilot === null, return null.
 *
 * Logic:
 * - Returns null if entry already has veterancy SPA (hasGainedVeterancySPA flag)
 * - Filters eligible SPAs: not origin-only, not flaw, not already held
 * - 1/40 chance of flaw instead: Math.floor(random() * 40) === 0
 * - If flaw, selects from flaw pool; else from eligible pool
 * - Random selection: Math.floor(random() * pool.length)
 *
 * @param entry - The roster entry rolling for veterancy SPA
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param random - Injectable random function (0-1)
 * @returns Selected SPA or null if not eligible / NPC
 *
 * @example
 * const spa = rollVeterancySPA(entry, pilot, Math.random);
 * if (spa) {
 *   // apply SPA via purchaseSPA or equivalent
 * }
 */
export function rollVeterancySPA(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  random: RandomFn,
): ISpecialAbility | null {
  // NPC rule: skip
  if (pilot === null) {
    return null;
  }

  // Check if already rolled
  if (entry.traits?.hasGainedVeterancySPA) {
    return null;
  }

  // Filter eligible SPAs: not origin-only, not flaw, not already held
  const eligible = Object.values(SPA_CATALOG).filter(
    (spa) => !spa.isOriginOnly && !spa.isFlaw && !pilotHasSPA(pilot, spa.id),
  );

  if (eligible.length === 0) {
    return null;
  }

  // 1/40 chance of flaw instead
  const isFlaw = Math.floor(random() * 40) === 0;

  // Select pool based on flaw roll
  const pool = isFlaw
    ? Object.values(SPA_CATALOG).filter(
        (spa) => spa.isFlaw && !pilotHasSPA(pilot, spa.id),
      )
    : eligible;

  if (pool.length === 0) {
    return null;
  }

  // Random selection from pool
  const index = Math.floor(random() * pool.length);
  return pool[index];
}

// =============================================================================
// Coming of Age SPA Roll
// =============================================================================

/**
 * Rolls for a coming-of-age SPA.
 *
 * @stub - Not implemented
 *
 * @param entry - The roster entry rolling for coming-of-age SPA
 * @param pilot - The vault pilot (null for NPCs)
 * @param random - Injectable random function (0-1)
 * @returns null (stub)
 */
export function rollComingOfAgeSPA(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  _random: RandomFn,
): ISpecialAbility | null {
  // @stub - Coming-of-age SPA system not implemented
  return null;
}

// =============================================================================
// Purchase SPA
// =============================================================================

/**
 * Purchases an SPA for a pilot, returning a delta for the caller to commit.
 *
 * NPC rule: if pilot === null, returns failure delta.
 *
 * Logic:
 * - Check if SPA exists in catalog
 * - Check if pilot already has SPA (by abilityId)
 * - Check if entry has sufficient XP
 * - Return ISpaPurchaseDelta with vault (new ability ref) + roster (xp deduction)
 *
 * @param entry - The roster entry purchasing the SPA
 * @param pilot - The vault pilot (null for NPCs — returns failure)
 * @param spaId - ID of the SPA to purchase
 * @param acquiredDate - ISO date string for when the SPA was acquired
 * @returns Delta with vault/roster changes or failure reason
 *
 * @example
 * const delta = purchaseSPA(entry, pilot, 'fast_learner', '3025-01-15');
 * if (delta.success) {
 *   // apply delta.vault and delta.roster to store
 * } else {
 *   logger.error(delta.reason);
 * }
 */
export function purchaseSPA(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  spaId: string,
  acquiredDate: string,
): ISpaPurchaseDelta {
  // NPC rule: skip
  if (pilot === null) {
    return {
      vault: null,
      roster: null,
      success: false,
      reason: 'NPC — SPA purchase skipped',
    };
  }

  // Check if SPA exists
  const spa = SPA_CATALOG[spaId];
  if (!spa) {
    return {
      vault: null,
      roster: null,
      success: false,
      reason: `SPA '${spaId}' not found in catalog`,
    };
  }

  // Check if pilot already has SPA
  if (pilotHasSPA(pilot, spaId)) {
    return {
      vault: null,
      roster: null,
      success: false,
      reason: `Pilot already has SPA '${spaId}'`,
    };
  }

  // Check if sufficient XP
  const newXp = entry.xp - spa.xpCost;
  if (newXp < 0) {
    return {
      vault: null,
      roster: null,
      success: false,
      reason: `Insufficient XP: need ${spa.xpCost}, have ${entry.xp}`,
    };
  }

  return {
    vault: {
      pilotId: entry.pilotId,
      newAbility: {
        abilityId: spaId,
        acquiredDate,
        xpSpent: spa.xpCost,
      },
    },
    roster: {
      pilotId: entry.pilotId,
      xpDelta: -spa.xpCost,
    },
    success: true,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a vault pilot has a specific SPA by abilityId.
 *
 * @param pilot - The vault pilot to check
 * @param spaId - ID of the SPA to check for
 * @returns true if pilot has the SPA
 *
 * @example
 * if (pilotHasSPA(pilot, 'fast_learner')) {
 *   // Apply Fast Learner XP cost reduction
 * }
 */
export function pilotHasSPA(pilot: IPilot, spaId: string): boolean {
  return pilot.abilities.some((a) => a.abilityId === spaId);
}

/**
 * Checks if an entry/pilot pair has a specific SPA.
 *
 * NPC rule: if pilot === null, returns false.
 *
 * @param entry - The roster entry (unused — SPA ownership lives in vault)
 * @param pilot - The vault pilot (null for NPCs — returns false)
 * @param spaId - ID of the SPA to check for
 * @returns true if pilot has the SPA
 */
export function personHasSPA(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  spaId: string,
): boolean {
  if (pilot === null) {
    return false;
  }
  return pilotHasSPA(pilot, spaId);
}
