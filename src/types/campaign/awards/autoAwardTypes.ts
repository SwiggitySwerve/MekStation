/**
 * Auto-Award System Types
 *
 * Defines the auto-award categories, triggers, configuration, and event types
 * for the automatic award granting engine. Based on MekHQ's 13 award categories
 * plus MekStation's existing 5 award categories.
 *
 * @module campaign/awards/autoAwardTypes
 */

// =============================================================================
// Auto-Award Category Enum
// =============================================================================

/**
 * Award categories for the auto-award engine.
 *
 * Combines MekHQ's 13 auto-award categories with MekStation's existing 5
 * AwardCategory values. Some overlap is intentional — the auto-award engine
 * uses these categories while the existing AwardCategory enum is used for
 * display grouping.
 *
 * 17 total values: 12 from MekHQ + 5 from MekStation existing
 */
export enum AutoAwardCategory {
  // MekHQ categories (12)
  CONTRACT = 'contract',
  FACTION_HUNTER = 'faction_hunter',
  INJURY = 'injury',
  KILL = 'kill',
  SCENARIO_KILL = 'scenario_kill',
  RANK = 'rank',
  SCENARIO = 'scenario',
  SKILL = 'skill',
  THEATRE_OF_WAR = 'theatre_of_war',
  TIME = 'time',
  TRAINING = 'training',
  MISC = 'misc',

  // MekStation existing categories (5)
  COMBAT = 'combat',
  SURVIVAL = 'survival',
  SERVICE = 'service',
  CAMPAIGN = 'campaign',
  SPECIAL = 'special',
}

// =============================================================================
// Auto-Award Trigger Type
// =============================================================================

/**
 * Trigger types that initiate auto-award processing.
 *
 * - monthly: Checked on the 1st of each month via day processor
 * - post_mission: Checked after a mission completes
 * - post_scenario: Checked after a scenario resolves
 * - post_promotion: Checked after a personnel promotion
 * - manual: Triggered manually by the player
 */
export type AutoAwardTrigger =
  | 'monthly'
  | 'post_mission'
  | 'post_scenario'
  | 'post_promotion'
  | 'manual';

/**
 * All valid auto-award trigger values.
 */
export const ALL_AUTO_AWARD_TRIGGERS: readonly AutoAwardTrigger[] = [
  'monthly',
  'post_mission',
  'post_scenario',
  'post_promotion',
  'manual',
] as const;

// =============================================================================
// Auto-Award Configuration
// =============================================================================

/**
 * Configuration for the auto-award system.
 *
 * Stored as part of ICampaignOptions. Controls which categories are
 * enabled, whether posthumous awards are granted, and whether only
 * the best (highest threshold) award per category is granted.
 */
export interface IAutoAwardConfig {
  /** Master toggle for the auto-award system */
  readonly enableAutoAwards: boolean;

  /** If true, only grant the highest qualifying award per category per person */
  readonly bestAwardOnly: boolean;

  /** Per-category enable/disable toggles */
  readonly enabledCategories: Record<AutoAwardCategory, boolean>;

  /** Whether to grant awards to recently deceased personnel */
  readonly enablePosthumous: boolean;
}

// =============================================================================
// Award Grant Event
// =============================================================================

/**
 * Event emitted when an award is automatically granted.
 *
 * These events are collected by the auto-award engine and can be
 * used for day reports, notifications, and logging.
 */
export interface IAwardGrantEvent {
  /** ID of the person receiving the award */
  readonly personId: string;

  /** ID of the award being granted */
  readonly awardId: string;

  /** Display name of the award */
  readonly awardName: string;

  /** Category of the auto-grant criteria */
  readonly category: AutoAwardCategory;

  /** What triggered this auto-award check */
  readonly trigger: AutoAwardTrigger;

  /** ISO 8601 timestamp of when the award was granted */
  readonly timestamp: string;
}

// =============================================================================
// Auto-Grant Criteria (Extension to IAward)
// =============================================================================

/**
 * Auto-grant criteria attached to an IAward.
 *
 * Awards with this criteria can be automatically evaluated by the
 * auto-award engine. The threshold and thresholdType define what
 * personnel stat is checked and what value must be met or exceeded.
 */
export interface IAutoGrantCriteria {
  /** Which auto-award category this criteria belongs to */
  readonly category: AutoAwardCategory;

  /** Numeric threshold value to meet or exceed */
  readonly threshold: number;

  /** What the threshold measures (e.g., 'kills', 'missions', 'years', 'skill_level') */
  readonly thresholdType: string;

  /** Whether this award can be earned multiple times */
  readonly stackable: boolean;

  /** Optional: specific skill ID for skill-based awards */
  readonly skillId?: string;

  /** Optional: rank level for rank-based awards */
  readonly rankLevel?: number;

  /** Optional: rank check mode for rank-based awards */
  readonly rankMode?: 'promotion' | 'inclusive' | 'exclusive';
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a default auto-award configuration with all categories enabled.
 */
export function createDefaultAutoAwardConfig(): IAutoAwardConfig {
  const enabledCategories = {} as Record<AutoAwardCategory, boolean>;
  for (const category of Object.values(AutoAwardCategory)) {
    enabledCategories[category] = true;
  }

  return {
    enableAutoAwards: true,
    bestAwardOnly: false,
    enabledCategories,
    enablePosthumous: true,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for AutoAwardCategory.
 */
export function isAutoAwardCategory(value: unknown): value is AutoAwardCategory {
  return typeof value === 'string' && Object.values(AutoAwardCategory).includes(value as AutoAwardCategory);
}

/**
 * Type guard for AutoAwardTrigger.
 */
export function isAutoAwardTrigger(value: unknown): value is AutoAwardTrigger {
  return typeof value === 'string' && ALL_AUTO_AWARD_TRIGGERS.includes(value as AutoAwardTrigger);
}

/**
 * Type guard for IAutoAwardConfig.
 */
export function isAutoAwardConfig(value: unknown): value is IAutoAwardConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as IAutoAwardConfig;
  return (
    typeof config.enableAutoAwards === 'boolean' &&
    typeof config.bestAwardOnly === 'boolean' &&
    typeof config.enabledCategories === 'object' &&
    config.enabledCategories !== null &&
    typeof config.enablePosthumous === 'boolean'
  );
}

/**
 * Type guard for IAutoGrantCriteria.
 */
export function isAutoGrantCriteria(value: unknown): value is IAutoGrantCriteria {
  if (typeof value !== 'object' || value === null) return false;
  const criteria = value as IAutoGrantCriteria;
  return (
    isAutoAwardCategory(criteria.category) &&
    typeof criteria.threshold === 'number' &&
    typeof criteria.thresholdType === 'string' &&
    typeof criteria.stackable === 'boolean'
  );
}

/**
 * Type guard for IAwardGrantEvent.
 */
export function isAwardGrantEvent(value: unknown): value is IAwardGrantEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as IAwardGrantEvent;
  return (
    typeof event.personId === 'string' &&
    typeof event.awardId === 'string' &&
    typeof event.awardName === 'string' &&
    isAutoAwardCategory(event.category) &&
    isAutoAwardTrigger(event.trigger) &&
    typeof event.timestamp === 'string'
  );
}
