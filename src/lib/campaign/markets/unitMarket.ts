/**
 * Unit Market - Generates monthly unit offers for campaign system
 *
 * Provides unit market generation with rarity-based item counts,
 * price modifiers, quality grades, and offer management.
 *
 * Based on MekHQ AtBMonthlyUnitMarket.java, simplified for MVP.
 *
 * @module lib/campaign/markets/unitMarket
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IUnitMarketOffer } from '@/types/campaign/markets/marketTypes';
import {
  UnitMarketRarity,
  UnitMarketType,
  RARITY_VALUES,
  MARKET_TYPE_QUALITY,
} from '@/types/campaign/markets/marketTypes';

// =============================================================================
// Types
// =============================================================================

/** Random number generator function type. Returns a number in [0, 1). */
export type RandomFn = () => number;

// =============================================================================
// Constants
// =============================================================================

/** Price modifier lookup table: 2d6 roll -> modifier value. */
const PRICE_MODIFIER_TABLE: ReadonlyArray<{ maxRoll: number; modifier: number }> = [
  { maxRoll: 2, modifier: 3 },
  { maxRoll: 3, modifier: 2 },
  { maxRoll: 5, modifier: 1 },
  { maxRoll: 8, modifier: 0 },
  { maxRoll: 10, modifier: -1 },
  { maxRoll: 11, modifier: -2 },
  { maxRoll: 12, modifier: -3 },
];

/** Percentage step per modifier point. */
const PRICE_MODIFIER_STEP = 5;

/** Base price percentage (100% = no markup/discount). */
const BASE_PRICE_PERCENT = 100;

/** Sample units for simplified market generation. */
const SAMPLE_UNITS: ReadonlyArray<{ id: string; name: string; baseCost: number }> = [
  { id: 'unit-atlas-as7d', name: 'Atlas AS7-D', baseCost: 9626000 },
  { id: 'unit-marauder-mad3r', name: 'Marauder MAD-3R', baseCost: 5576000 },
  { id: 'unit-warhammer-whm6r', name: 'Warhammer WHM-6R', baseCost: 5364000 },
  { id: 'unit-wolverine-wvr6r', name: 'Wolverine WVR-6R', baseCost: 4040000 },
  { id: 'unit-griffin-grf1n', name: 'Griffin GRF-1N', baseCost: 3746000 },
  { id: 'unit-shadow-hawk-shd2h', name: 'Shadow Hawk SHD-2H', baseCost: 3570000 },
  { id: 'unit-locust-lct1v', name: 'Locust LCT-1V', baseCost: 1512000 },
  { id: 'unit-commando-com2d', name: 'Commando COM-2D', baseCost: 1770000 },
  { id: 'unit-hunchback-hbk4g', name: 'Hunchback HBK-4G', baseCost: 3118000 },
  { id: 'unit-centurion-cn9a', name: 'Centurion CN9-A', baseCost: 3518000 },
];

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate the number of items available for a given rarity.
 *
 * Formula: max(0, d6roll + RARITY_VALUES[rarity] - 3)
 * where d6roll = floor(random() * 6) + 1
 */
export function calculateItemCount(rarity: UnitMarketRarity, random: RandomFn): number {
  const d6roll = Math.floor(random() * 6) + 1;
  return Math.max(0, d6roll + RARITY_VALUES[rarity] - 3);
}

/**
 * Calculate price as a percentage of base cost using 2d6 roll.
 *
 * Roll mapping: <=2 -> +3, 3 -> +2, 4-5 -> +1, 6-8 -> 0, 9-10 -> -1, 11 -> -2, 12 -> -3.
 * Returns 100 + (modifier * 5), so range is 85-115.
 */
export function calculatePricePercent(random: RandomFn): number {
  const d1 = Math.floor(random() * 6) + 1;
  const d2 = Math.floor(random() * 6) + 1;
  const roll = d1 + d2;

  let modifier = 0;
  for (const entry of PRICE_MODIFIER_TABLE) {
    if (roll <= entry.maxRoll) {
      modifier = entry.modifier;
      break;
    }
  }

  return BASE_PRICE_PERCENT + modifier * PRICE_MODIFIER_STEP;
}

/**
 * Get the quality grade for a market type.
 *
 * BLACK_MARKET has a 50/50 chance of 'A' or 'F'. All others use the constant.
 */
export function getMarketTypeQuality(marketType: UnitMarketType, random: RandomFn): string {
  if (marketType === UnitMarketType.BLACK_MARKET) {
    return random() < 0.5 ? 'A' : 'F';
  }
  return MARKET_TYPE_QUALITY[marketType];
}

/**
 * Get the ISO date string for the last day of the month containing the given date.
 */
export function getEndOfMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return lastDay.toISOString().split('T')[0];
}

/**
 * Generate a unique offer ID.
 */
function generateOfferId(): string {
  return `umo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(array: readonly T[], random: RandomFn): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

/**
 * Generate unit market offers for a campaign.
 *
 * Iterates over all (marketType, rarity) pairs. For each pair, calculates
 * item count and generates that many offers with random unit selection,
 * price calculation, and quality grade.
 */
export function generateUnitOffers(campaign: ICampaign, random: RandomFn): IUnitMarketOffer[] {
  const offers: IUnitMarketOffer[] = [];
  const expirationDate = getEndOfMonth(campaign.currentDate);
  const marketTypes = Object.values(UnitMarketType);
  const rarities = Object.values(UnitMarketRarity);

  for (const marketType of marketTypes) {
    for (const rarity of rarities) {
      const count = calculateItemCount(rarity, random);

      for (let i = 0; i < count; i++) {
        const unit = pickRandom(SAMPLE_UNITS, random);
        const pricePercent = calculatePricePercent(random);
        const quality = getMarketTypeQuality(marketType, random);

        offers.push({
          id: generateOfferId(),
          unitId: unit.id,
          unitName: unit.name,
          rarity,
          marketType,
          quality,
          pricePercent,
          baseCost: unit.baseCost,
          expirationDate,
        });
      }
    }
  }

  return offers;
}

/**
 * Attempt to purchase a unit from the market.
 *
 * Validates that the offer exists in the provided offers list.
 */
export function purchaseUnit(
  _campaign: ICampaign,
  offerId: string,
  unitMarketOffers: readonly IUnitMarketOffer[]
): { success: boolean; reason?: string } {
  const offer = unitMarketOffers.find((o) => o.id === offerId);
  if (!offer) {
    return { success: false, reason: 'Offer not found' };
  }
  return { success: true };
}
