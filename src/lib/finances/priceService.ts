/**
 * Price Service - Tech base and condition price multipliers
 *
 * Provides price calculation functions for units and parts:
 * - TECH_PRICE_MULTIPLIER: Lookup table for tech base multipliers (common, innerSphere, clan, mixed)
 * - CONDITION_MULTIPLIER: Lookup table for condition multipliers (new, used, damaged, unrepairable, cancelledOrder)
 * - calculateUnitPrice: Apply multipliers to unit price
 * - calculatePartPrice: Apply multipliers to part price
 *
 * Tech base multipliers:
 *   - common: 1.0× (unit and part)
 *   - innerSphere: 1.0× (unit and part)
 *   - clan: 2.0× (unit and part)
 *   - mixed: 1.5× (unit and part)
 *
 * Condition multipliers:
 *   - new: 1.0×
 *   - used: 0.5×
 *   - damaged: 0.33×
 *   - unrepairable: 0.1×
 *   - cancelledOrder: 0.5×
 *
 * @module lib/finances/priceService
 */

import { Money } from '@/types/campaign/Money';

// =============================================================================
// Tech Base Multipliers
// =============================================================================

/**
 * Tech base price multipliers for units and parts
 */
export const TECH_PRICE_MULTIPLIER = {
  common: { unit: 1.0, part: 1.0 },
  innerSphere: { unit: 1.0, part: 1.0 },
  clan: { unit: 2.0, part: 2.0 },
  mixed: { unit: 1.5, part: 1.5 },
} as const;

// =============================================================================
// Condition Multipliers
// =============================================================================

/**
 * Condition-based price multipliers
 */
export const CONDITION_MULTIPLIER = {
  new: 1.0,
  used: 0.5,
  damaged: 0.33,
  unrepairable: 0.1,
  cancelledOrder: 0.5,
} as const;

// =============================================================================
// Price Calculation
// =============================================================================

/**
 * Calculates the price of a unit with tech base and condition multipliers.
 *
 * Formula: basePrice × techMultiplier × conditionMultiplier
 *
 * @param basePrice - Base unit price
 * @param techBase - Tech base (common, innerSphere, clan, mixed)
 * @param condition - Unit condition (new, used, damaged, unrepairable, cancelledOrder)
 * @returns Calculated unit price as Money
 *
 * @example
 * // Clan unit at 100,000 C-bills, new condition
 * calculateUnitPrice(new Money(100000), 'clan', 'new')
 * // => Money(200000) [100000 × 2.0 × 1.0]
 *
 * // Inner Sphere unit at 100,000 C-bills, damaged condition
 * calculateUnitPrice(new Money(100000), 'innerSphere', 'damaged')
 * // => Money(33000) [100000 × 1.0 × 0.33]
 */
export function calculateUnitPrice(
  basePrice: Money,
  techBase: string,
  condition: string,
): Money {
  const techMultiplier =
    TECH_PRICE_MULTIPLIER[techBase as keyof typeof TECH_PRICE_MULTIPLIER]
      ?.unit ?? 1.0;
  const conditionMultiplier =
    CONDITION_MULTIPLIER[condition as keyof typeof CONDITION_MULTIPLIER] ?? 1.0;

  return basePrice.multiply(techMultiplier).multiply(conditionMultiplier);
}

/**
 * Calculates the price of a part with tech base and condition multipliers.
 *
 * Formula: basePrice × techMultiplier × conditionMultiplier
 *
 * @param basePrice - Base part price
 * @param techBase - Tech base (common, innerSphere, clan, mixed)
 * @param condition - Part condition (new, used, damaged, unrepairable, cancelledOrder)
 * @returns Calculated part price as Money
 *
 * @example
 * // Clan part at 10,000 C-bills, new condition
 * calculatePartPrice(new Money(10000), 'clan', 'new')
 * // => Money(20000) [10000 × 2.0 × 1.0]
 *
 * // Inner Sphere part at 10,000 C-bills, used condition
 * calculatePartPrice(new Money(10000), 'innerSphere', 'used')
 * // => Money(5000) [10000 × 1.0 × 0.5]
 */
export function calculatePartPrice(
  basePrice: Money,
  techBase: string,
  condition: string,
): Money {
  const techMultiplier =
    TECH_PRICE_MULTIPLIER[techBase as keyof typeof TECH_PRICE_MULTIPLIER]
      ?.part ?? 1.0;
  const conditionMultiplier =
    CONDITION_MULTIPLIER[condition as keyof typeof CONDITION_MULTIPLIER] ?? 1.0;

  return basePrice.multiply(techMultiplier).multiply(conditionMultiplier);
}
