/**
 * Market Types - Types and enums for campaign market systems
 *
 * Defines the three market systems:
 * - Unit Market: Monthly refresh with 7 rarity levels and 6 market types
 * - Personnel Market: Daily refresh with 4 styles and experience-based expiration
 * - Contract Market: Monthly refresh with negotiation (extends contractMarket.ts)
 *
 * Based on MekHQ's UnitMarketRarity, UnitMarketType, PersonnelMarketStyle,
 * and AtBMonthlyUnitMarket.
 *
 * @module campaign/markets/marketTypes
 */

import type { CampaignPersonnelRole } from '../enums/CampaignPersonnelRole';

// =============================================================================
// Unit Market Enums
// =============================================================================

/**
 * Rarity levels for unit market offers.
 *
 * Values map to numeric modifiers used in the item count formula:
 *   itemCount = d6 + rarityValue - 3
 *
 * Based on MekHQ UnitMarketRarity.java.
 */
export enum UnitMarketRarity {
  MYTHIC = 'mythic',
  VERY_RARE = 'very_rare',
  RARE = 'rare',
  UNCOMMON = 'uncommon',
  COMMON = 'common',
  VERY_COMMON = 'very_common',
  UBIQUITOUS = 'ubiquitous',
}

/**
 * Numeric values for each rarity level.
 * Used in: itemCount = d6 + RARITY_VALUES[rarity] - 3
 */
export const RARITY_VALUES: Record<UnitMarketRarity, number> = {
  [UnitMarketRarity.MYTHIC]: -1,
  [UnitMarketRarity.VERY_RARE]: 0,
  [UnitMarketRarity.RARE]: 1,
  [UnitMarketRarity.UNCOMMON]: 2,
  [UnitMarketRarity.COMMON]: 3,
  [UnitMarketRarity.VERY_COMMON]: 4,
  [UnitMarketRarity.UBIQUITOUS]: 10,
};

/**
 * Market types for unit offers.
 *
 * Each type has a default quality grade and different availability characteristics.
 * Based on MekHQ UnitMarketType.java.
 */
export enum UnitMarketType {
  OPEN = 'open',
  EMPLOYER = 'employer',
  MERCENARY = 'mercenary',
  FACTORY = 'factory',
  BLACK_MARKET = 'black_market',
  CIVILIAN = 'civilian',
}

/**
 * Default quality grade for each market type.
 * BLACK_MARKET is special: 50/50 chance of 'A' or 'F' (handled in generation logic).
 * The value here represents the non-random default.
 */
export const MARKET_TYPE_QUALITY: Record<UnitMarketType, string> = {
  [UnitMarketType.OPEN]: 'C',
  [UnitMarketType.EMPLOYER]: 'B',
  [UnitMarketType.MERCENARY]: 'C',
  [UnitMarketType.FACTORY]: 'F',
  [UnitMarketType.BLACK_MARKET]: 'A',
  [UnitMarketType.CIVILIAN]: 'F',
};

// =============================================================================
// Personnel Market Enums
// =============================================================================

/**
 * Personnel market generation styles.
 *
 * Based on MekHQ PersonnelMarketStyle.java.
 * Only MEKHQ style is implemented initially; others are stubs.
 */
export enum PersonnelMarketStyle {
  DISABLED = 'disabled',
  MEKHQ = 'mekhq',
  CAM_OPS_REVISED = 'cam_ops_revised',
  CAM_OPS_STRICT = 'cam_ops_strict',
}

/**
 * Experience levels for personnel.
 *
 * Maps to BattleTech experience categories with associated skill ranges.
 */
export enum MarketExperienceLevel {
  GREEN = 'green',
  REGULAR = 'regular',
  VETERAN = 'veteran',
  ELITE = 'elite',
}

// =============================================================================
// Unit Market Offer Interface
// =============================================================================

/**
 * A unit available for purchase on the unit market.
 *
 * Generated monthly. Expires at end of the month.
 * Price is a percentage of base cost (e.g., 105 = 5% markup).
 */
export interface IUnitMarketOffer {
  /** Unique offer identifier */
  readonly id: string;

  /** Reference to canonical unit (MekStation unit ID) */
  readonly unitId: string;

  /** Display name of the unit */
  readonly unitName: string;

  /** Rarity classification of this offer */
  readonly rarity: UnitMarketRarity;

  /** Market type this offer was generated from */
  readonly marketType: UnitMarketType;

  /** Quality grade (A-F) */
  readonly quality: string;

  /** Price as percentage of base cost (e.g., 105 = 5% markup) */
  readonly pricePercent: number;

  /** Base C-bill cost of the unit */
  readonly baseCost: number;

  /** ISO date string when this offer expires */
  readonly expirationDate: string;
}

// =============================================================================
// Personnel Market Offer Interface
// =============================================================================

/**
 * A person available for hire on the personnel market.
 *
 * Generated daily. Better-experienced personnel expire faster
 * (elite = 3 days, green = 30 days).
 */
export interface IPersonnelMarketOffer {
  /** Unique offer identifier */
  readonly id: string;

  /** Display name of the recruit */
  readonly name: string;

  /** Primary role this person fills */
  readonly role: CampaignPersonnelRole;

  /** Experience level classification */
  readonly experienceLevel: MarketExperienceLevel;

  /** Skill levels by skill ID */
  readonly skills: Record<string, number>;

  /** C-bill cost to hire this person */
  readonly hireCost: number;

  /** ISO date string when this offer expires */
  readonly expirationDate: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for UnitMarketRarity values.
 */
export function isUnitMarketRarity(value: unknown): value is UnitMarketRarity {
  return (
    typeof value === 'string' &&
    Object.values(UnitMarketRarity).includes(value as UnitMarketRarity)
  );
}

/**
 * Type guard for UnitMarketType values.
 */
export function isUnitMarketType(value: unknown): value is UnitMarketType {
  return (
    typeof value === 'string' &&
    Object.values(UnitMarketType).includes(value as UnitMarketType)
  );
}

/**
 * Type guard for PersonnelMarketStyle values.
 */
export function isPersonnelMarketStyle(
  value: unknown,
): value is PersonnelMarketStyle {
  return (
    typeof value === 'string' &&
    Object.values(PersonnelMarketStyle).includes(value as PersonnelMarketStyle)
  );
}

/**
 * Type guard for MarketExperienceLevel values.
 */
export function isMarketExperienceLevel(
  value: unknown,
): value is MarketExperienceLevel {
  return (
    typeof value === 'string' &&
    Object.values(MarketExperienceLevel).includes(
      value as MarketExperienceLevel,
    )
  );
}
