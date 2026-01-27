/**
 * Faction Standing Market Integration Stubs
 *
 * These functions provide market modifiers based on faction standing.
 * Currently return neutral defaults (0 or 1.0) until the faction standing
 * system is fully implemented in Plan 5.
 *
 * @module campaign/markets/marketStandingIntegration
 */

import type { ICampaign } from '@/types/campaign/Campaign';

/**
 * Returns a rarity modifier for unit market availability based on faction standing.
 *
 * Positive values increase rarity (fewer units available).
 * Negative values decrease rarity (more units available).
 *
 * @param _campaign - The campaign (unused until Plan 5)
 * @returns Rarity modifier (0 = no modifier until Plan 5)
 *
 * @example
 * const modifier = getUnitMarketRarityModifier(campaign);
 * // Returns 0 until faction standing system is built
 */
export function getUnitMarketRarityModifier(_campaign: ICampaign): number {
  return 0;
}

/**
 * Returns the number of recruitment tickets available based on faction standing.
 *
 * Recruitment tickets are used to recruit personnel from the market.
 * Higher standing increases available tickets.
 *
 * @param _campaign - The campaign (unused until Plan 5)
 * @returns Number of recruitment tickets (5 = default until Plan 5)
 *
 * @example
 * const tickets = getRecruitmentTickets(campaign);
 * // Returns 5 until faction standing system is built
 */
export function getRecruitmentTickets(_campaign: ICampaign): number {
  return 5;
}

/**
 * Returns a modifier for recruitment rolls based on faction standing.
 *
 * Positive values improve recruitment chances.
 * Negative values worsen recruitment chances.
 *
 * @param _campaign - The campaign (unused until Plan 5)
 * @returns Recruitment roll modifier (0 = no modifier until Plan 5)
 *
 * @example
 * const modifier = getRecruitmentRollsModifier(campaign);
 * // Returns 0 until faction standing system is built
 */
export function getRecruitmentRollsModifier(_campaign: ICampaign): number {
  return 0;
}

/**
 * Returns a multiplier for contract payment based on faction standing.
 *
 * Values > 1.0 increase contract payments.
 * Values < 1.0 decrease contract payments.
 *
 * @param _campaign - The campaign (unused until Plan 5)
 * @returns Contract pay multiplier (1.0 = no multiplier until Plan 5)
 *
 * @example
 * const multiplier = getContractPayMultiplier(campaign);
 * // Returns 1.0 until faction standing system is built
 */
export function getContractPayMultiplier(_campaign: ICampaign): number {
  return 1.0;
}

/**
 * Returns a modifier for contract negotiation rolls based on faction standing.
 *
 * Positive values improve negotiation chances.
 * Negative values worsen negotiation chances.
 *
 * @param _campaign - The campaign (unused until Plan 5)
 * @returns Contract negotiation modifier (0 = no modifier until Plan 5)
 *
 * @example
 * const modifier = getContractNegotiationModifier(campaign);
 * // Returns 0 until faction standing system is built
 */
export function getContractNegotiationModifier(_campaign: ICampaign): number {
  return 0;
}
