/**
 * Personnel Progression Types
 *
 * Defines types for XP awards, aging milestones, special abilities, and trait flags.
 * These types support the personnel progression system with 8 XP sources, aging effects,
 * and special ability acquisition.
 *
 * @module campaign/progression/progressionTypes
 */

// =============================================================================
// XP Source Type
// =============================================================================

/**
 * Union type for all XP award sources.
 *
 * - scenario: Participation in a scenario/battle
 * - kill: Enemy unit destroyed
 * - task: Completed task/objective
 * - vocational: Vocational training (monthly roll)
 * - admin: Administrative duties (periodic award)
 * - mission: Mission completion (success/failure/outstanding)
 * - education: Education/academy training (future)
 * - award: Special award or bonus
 */
export type XPSource =
  | 'scenario'
  | 'kill'
  | 'task'
  | 'vocational'
  | 'admin'
  | 'mission'
  | 'education'
  | 'award';

// =============================================================================
// XP Award Event
// =============================================================================

/**
 * Represents a single XP award event.
 *
 * Immutable record of XP awarded to a person from a specific source.
 * Used for tracking XP history and audit trails.
 *
 * @example
 * const event: IXPAwardEvent = {
 *   personId: 'person-001',
 *   source: 'scenario',
 *   amount: 1,
 *   description: 'Scenario participation - Raid on Hesperus II'
 * };
 */
export interface IXPAwardEvent {
  /** ID of the person receiving XP */
  readonly personId: string;

  /** Source of the XP award */
  readonly source: XPSource;

  /** Amount of XP awarded */
  readonly amount: number;

  /** Description of why XP was awarded */
  readonly description: string;
}

// =============================================================================
// Aging Milestone
// =============================================================================

/**
 * Represents an aging milestone with attribute modifiers.
 *
 * Milestones define age brackets and the attribute modifiers that apply
 * when a person enters that bracket. Modifiers are cumulative across milestones.
 *
 * At age 61+, Glass Jaw and Slow Learner traits may be automatically applied
 * (unless the person already has Toughness or Fast Learner respectively).
 *
 * @example
 * const milestone: IAgingMilestone = {
 *   minAge: 61,
 *   maxAge: 70,
 *   label: '61-70',
 *   attributeModifiers: {
 *     STR: -1.0,
 *     BOD: -1.0,
 *     DEX: -1.0,
 *     REF: 0,
 *     INT: 0.5,
 *     WIL: 0,
 *     CHA: -0.5
 *   },
 *   appliesSlowLearner: true,
 *   appliesGlassJaw: true
 * };
 */
export interface IAgingMilestone {
  /** Minimum age (inclusive) for this milestone */
  readonly minAge: number;

  /** Maximum age (inclusive) for this milestone */
  readonly maxAge: number;

  /** Human-readable label for this age bracket */
  readonly label: string;

  /** Attribute modifiers (attribute name → modifier value) */
  readonly attributeModifiers: Record<string, number>;

  /** Whether to apply Slow Learner trait at this milestone (if not already present) */
  readonly appliesSlowLearner: boolean;

  /** Whether to apply Glass Jaw trait at this milestone (if not already present) */
  readonly appliesGlassJaw: boolean;
}

// =============================================================================
// Special Ability (SPA)
// =============================================================================

/**
 * Represents a special ability that a person can acquire.
 *
 * SPAs can be:
 * - Positive abilities (Fast Learner, Toughness, etc.)
 * - Flaws (Slow Learner, Glass Jaw, Gremlins)
 * - Origin-only (only available at character creation)
 * - Purchasable with XP
 *
 * @example
 * const spa: ISpecialAbility = {
 *   id: 'fast_learner',
 *   name: 'Fast Learner',
 *   description: '-20% XP cost for skill improvement',
 *   xpCost: 30,
 *   isFlaw: false,
 *   isOriginOnly: false,
 *   prerequisites: []
 * };
 */
export interface ISpecialAbility {
  /** Unique identifier for this ability */
  readonly id: string;

  /** Display name */
  readonly name: string;

  /** Description of the ability's effects */
  readonly description: string;

  /** XP cost to purchase directly (negative for flaws that grant XP) */
  readonly xpCost: number;

  /** Whether this is a flaw (negative ability) */
  readonly isFlaw: boolean;

  /** Whether this ability is only available at character creation */
  readonly isOriginOnly: boolean;

  /** Optional list of prerequisite skill IDs required to acquire this ability */
  readonly prerequisites?: readonly string[];
}

// =============================================================================
// Person Traits
// =============================================================================

/**
 * Trait flags for personnel.
 *
 * These are optional boolean flags that modify skill costs, aging effects,
 * and other progression mechanics. Traits can be acquired through:
 * - Character creation (origin-only traits)
 * - Aging milestones (Glass Jaw, Slow Learner at age 61+)
 * - SPA acquisition (veterancy roll, purchase)
 *
 * @example
 * const traits: IPersonTraits = {
 *   fastLearner: true,
 *   slowLearner: false,
 *   gremlins: false,
 *   techEmpathy: true,
 *   toughness: false,
 *   glassJaw: false,
 *   hasGainedVeterancySPA: false,
 *   vocationalXPTimer: 15
 * };
 */
export interface IPersonTraits {
  /** Fast Learner: -20% XP cost for skill improvement */
  readonly fastLearner?: boolean;

  /** Slow Learner: +20% XP cost for skill improvement */
  readonly slowLearner?: boolean;

  /** Gremlins: +10% XP cost for tech skills */
  readonly gremlins?: boolean;

  /** Tech Empathy: -10% XP cost for tech skills */
  readonly techEmpathy?: boolean;

  /** Toughness: Absorb additional damage (prevents Glass Jaw application at age 61+) */
  readonly toughness?: boolean;

  /** Glass Jaw: Reduced consciousness threshold (applied at age 61+ unless has Toughness) */
  readonly glassJaw?: boolean;

  /** Flag indicating person has already gained a veterancy SPA (prevents duplicate rolls) */
  readonly hasGainedVeterancySPA?: boolean;

  /** Days since last vocational training check (used for monthly vocational XP rolls) */
  readonly vocationalXPTimer?: number;
}
