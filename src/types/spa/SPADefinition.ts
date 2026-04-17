/**
 * Unified Special Pilot Ability (SPA) type definitions.
 *
 * Merges the two prior SPA systems (campaign acquisition + combat
 * modifiers) into a single shape so there's one source of truth that
 * covers every field either system needs:
 *
 *  - acquisition: xpCost, isFlaw, isOriginOnly
 *  - combat:      category, pipelines, combatEffect, requiresDesignation
 *  - general:     id, displayName, description, source rulebook
 *
 * Canonical IDs use snake_case to match MegaMek's OptionsConstants
 * (`weapon_specialist`, `iron_man`, etc.). The existing systems use
 * mixed forms — adapters in `@/lib/spa` resolve those to canonical ids.
 */

// =============================================================================
// Categories / pipelines
// =============================================================================

/**
 * Functional grouping used by the pilot UI and record sheet.
 * Extends the original gunnery / piloting / etc. taxonomy to cover MegaMek's
 * full roster, including the Manei Domini bioware set and Edge triggers.
 */
export type SPACategory =
  | 'gunnery'
  | 'piloting'
  | 'defensive'
  | 'toughness'
  | 'tactical'
  | 'infantry'
  | 'bioware'
  | 'edge'
  | 'miscellaneous';

/**
 * Combat resolution pipeline(s) an SPA touches. The combat layer uses this
 * to dispatch modifier calculations.
 */
export type SPAPipeline =
  | 'to-hit'
  | 'damage'
  | 'psr'
  | 'heat'
  | 'initiative'
  | 'consciousness'
  | 'movement'
  | 'critical-hit'
  | 'sensors'
  | 'special';

/**
 * Rulebook / supplement the SPA was introduced in. Used by the UI so players
 * can filter to abilities legal in their campaign.
 */
export type SPASource =
  | 'CamOps'
  | 'MaxTech'
  | 'ATOW'
  | 'ManeiDomini'
  | 'Unofficial'
  | 'Legacy';

/**
 * What kind of designation the SPA asks for at selection time (e.g. Weapon
 * Specialist designates a weapon type; Range Master designates a range band).
 */
export type SPADesignationType =
  | 'weapon_type'
  | 'weapon_category'
  | 'target'
  | 'range_bracket'
  | 'skill'
  | 'terrain';

// =============================================================================
// Unified SPA definition
// =============================================================================

/**
 * Canonical definition of a single SPA. Every field is nullable/optional
 * where it isn't universally applicable — Manei Domini implants don't have
 * an XP cost, Edge triggers don't have a `combatEffect` string, etc.
 */
export interface ISPADefinition {
  /** Canonical snake_case id matching MegaMek OptionsConstants. */
  readonly id: string;
  /** Human-readable name shown in the pilot UI. */
  readonly displayName: string;
  /** One-line summary of the ability. */
  readonly description: string;
  /** Functional grouping for UI + filters. */
  readonly category: SPACategory;
  /** Which rulebook introduced it. */
  readonly source: SPASource;

  // ---- Acquisition-layer fields -----------------------------------------

  /** XP cost to purchase (negative for flaws that grant XP). `null` when
   *  the ability is not purchasable via normal advancement (e.g. bioware,
   *  edge triggers, origin-only abilities with no XP price). */
  readonly xpCost: number | null;
  /** Marks flaws — abilities the player takes for negative effects in
   *  exchange for XP. Excluded from positive-trait random rolls. */
  readonly isFlaw: boolean;
  /** Abilities only acquirable at character creation (Natural Aptitude etc). */
  readonly isOriginOnly: boolean;

  // ---- Combat-layer fields ----------------------------------------------

  /** Which combat pipelines this SPA affects. Empty for abilities with
   *  no in-combat effect (e.g. campaign-only flaws). */
  readonly pipelines: readonly SPAPipeline[];
  /** Short human description of the combat effect (for tooltips). */
  readonly combatEffect?: string;
  /** Whether this SPA asks the player to designate a weapon / target / etc. */
  readonly requiresDesignation: boolean;
  /** What kind of designation is needed, when `requiresDesignation` is true. */
  readonly designationType?: SPADesignationType;
}

/**
 * Alias entry: legacy id (from System A or System B) → canonical id.
 * Used by the loader so old consumers keep working during the migration.
 */
export interface ISPAIdAlias {
  readonly legacyId: string;
  readonly canonicalId: string;
  readonly source: 'systemA' | 'systemB' | 'megamek-legacy';
}

// =============================================================================
// Helper predicates
// =============================================================================

/** Narrowing helper — true iff the ability is purchasable. */
export function isPurchasableSPA(spa: ISPADefinition): boolean {
  return spa.xpCost !== null;
}

/** Narrowing helper — true iff the ability has any combat effect. */
export function isCombatActiveSPA(spa: ISPADefinition): boolean {
  return spa.pipelines.length > 0;
}
