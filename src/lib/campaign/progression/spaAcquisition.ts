/**
 * SPA Acquisition System
 *
 * Implements special ability (SPA) acquisition through:
 * - Veterancy rolls (once per person, 1/40 chance of flaw)
 * - Coming-of-age rolls (stub)
 * - Purchase system (XP deduction)
 *
 * @module campaign/progression/spaAcquisition
 */

import type { IPerson } from '@/types/campaign/Person';

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
 * Result of attempting to purchase an SPA.
 */
export interface IPurchaseSPAResult {
  /** Updated person with SPA added (if successful) */
  readonly updatedPerson: IPerson;

  /** Whether the purchase succeeded */
  readonly success: boolean;

  /** Reason for failure (if unsuccessful) */
  readonly reason?: string;
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
 * Logic:
 * - Returns null if person already has veterancy SPA (hasGainedVeterancySPA flag)
 * - Filters eligible SPAs: not origin-only, not flaw, not already held
 * - 1/40 chance of flaw instead: Math.floor(random() * 40) === 0
 * - If flaw, selects from flaw pool; else from eligible pool
 * - Random selection: Math.floor(random() * pool.length)
 *
 * @param person - The person rolling for veterancy SPA
 * @param random - Injectable random function (0-1)
 * @returns Selected SPA or null if not eligible
 *
 * @example
 * const spa = rollVeterancySPA(person, Math.random);
 * if (spa) {
 *   person.traits.hasGainedVeterancySPA = true;
 *   person.specialAbilities.push(spa.id);
 * }
 */
export function rollVeterancySPA(
  person: IPerson,
  random: RandomFn,
): ISpecialAbility | null {
  // Check if already rolled
  if (person.traits?.hasGainedVeterancySPA) {
    return null;
  }

  // Filter eligible SPAs: not origin-only, not flaw, not already held
  const eligible = Object.values(SPA_CATALOG).filter(
    (spa) => !spa.isOriginOnly && !spa.isFlaw && !personHasSPA(person, spa.id),
  );

  if (eligible.length === 0) {
    return null;
  }

  // 1/40 chance of flaw instead
  const isFlaw = Math.floor(random() * 40) === 0;

  // Select pool based on flaw roll
  const pool = isFlaw
    ? Object.values(SPA_CATALOG).filter(
        (spa) => spa.isFlaw && !personHasSPA(person, spa.id),
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
 * @param person - The person rolling for coming-of-age SPA
 * @param random - Injectable random function (0-1)
 * @returns null (stub)
 */
export function rollComingOfAgeSPA(
  _person: IPerson,
  _random: RandomFn,
): ISpecialAbility | null {
  // @stub - Coming-of-age SPA system not implemented
  return null;
}

// =============================================================================
// Purchase SPA
// =============================================================================

/**
 * Purchases an SPA for a person, deducting XP.
 *
 * Logic:
 * - Check if person has sufficient XP
 * - Check if SPA exists in catalog
 * - Check if person already has SPA
 * - Deduct XP: person.xp - spa.xpCost
 * - Add to specialAbilities array
 * - Return { updatedPerson, success, reason? }
 *
 * @param person - The person purchasing the SPA
 * @param spaId - ID of the SPA to purchase
 * @returns Result with updated person or failure reason
 *
 * @example
 * const result = purchaseSPA(person, 'fast_learner');
 * if (result.success) {
 *   person = result.updatedPerson;
 * } else {
 *   logger.error(result.reason);
 * }
 */
export function purchaseSPA(
  person: IPerson,
  spaId: string,
): IPurchaseSPAResult {
  // Check if SPA exists
  const spa = SPA_CATALOG[spaId];
  if (!spa) {
    return {
      updatedPerson: person,
      success: false,
      reason: `SPA '${spaId}' not found in catalog`,
    };
  }

  // Check if person already has SPA
  if (personHasSPA(person, spaId)) {
    return {
      updatedPerson: person,
      success: false,
      reason: `Person already has SPA '${spaId}'`,
    };
  }

  // Check if sufficient XP
  const newXp = person.xp - spa.xpCost;
  if (newXp < 0) {
    return {
      updatedPerson: person,
      success: false,
      reason: `Insufficient XP: need ${spa.xpCost}, have ${person.xp}`,
    };
  }

  // Update person immutably
  const updatedPerson: IPerson = {
    ...person,
    xp: newXp,
    specialAbilities: [...(person.specialAbilities ?? []), spaId],
  };

  return {
    updatedPerson,
    success: true,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a person has a specific SPA.
 *
 * @param person - The person to check
 * @param spaId - ID of the SPA to check for
 * @returns true if person has the SPA
 *
 * @example
 * if (personHasSPA(person, 'fast_learner')) {
 *   // Apply Fast Learner XP cost reduction
 * }
 */
export function personHasSPA(person: IPerson, spaId: string): boolean {
  return person.specialAbilities?.includes(spaId) ?? false;
}
