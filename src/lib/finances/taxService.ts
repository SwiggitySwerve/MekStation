/**
 * Tax Service - Tax calculation and monthly overhead costs
 *
 * Provides tax and overhead calculation functions:
 * - calculateTaxes: Calculate taxes on profits (0 if negative/zero profit or useTaxes=false)
 * - calculateProfits: Calculate profits = currentBalance - startingCapital
 * - calculateMonthlyOverhead: Calculate overhead = 5% of total salary
 * - calculateFoodAndHousing: Calculate food/housing costs per roster entry (2 tiers: officer, enlisted)
 *
 * Tax formula:
 *   taxes = profits × (taxRate / 100) if profits > 0 and useTaxes=true, else 0
 *
 * Overhead formula:
 *   overhead = totalSalary × (overheadPercent / 100)
 *
 * Food/Housing tiers:
 *   - Officer (ADMIN_COMMAND role): 1,260 C-bills/month
 *   - Enlisted: 552 C-bills/month
 *
 * Note: The prisoner tier (348 C-bills/month) is not active because
 * CampaignPilotStatus has no POW value (only Active/Wounded/Critical/MIA/KIA).
 * The constant is retained for when the status enum is extended.
 *
 * NPC domain matrix (finance = PROCESS): NPC roster entries (statblockData present)
 * still incur food/housing costs — all living entries consume resources.
 *
 * @module lib/finances/taxService
 */

import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';

import { calculateTotalMonthlySalary } from './salaryService';

// =============================================================================
// Food and Housing Costs
// =============================================================================

/**
 * Food and housing cost tiers per person per month
 */
export const FOOD_AND_HOUSING_COSTS = {
  /** Officer (ADMIN_COMMAND role): 1,260 C-bills/month */
  officer: 1260,
  /** Enlisted personnel: 552 C-bills/month */
  enlisted: 552,
  /**
   * Prisoner/Dependent (POW status): 348 C-bills/month.
   * Reserved for when CampaignPilotStatus gains a POW value.
   */
  prisoner: 348,
} as const;

// =============================================================================
// Officer Role Detection
// =============================================================================

/**
 * Roles that qualify as officers for food/housing cost purposes
 */
const OFFICER_ROLES = new Set<CampaignPersonnelRole>([
  CampaignPersonnelRole.ADMIN_COMMAND,
]);

/**
 * Checks if a roster entry is an officer for food/housing cost purposes.
 * Officers are those with ADMIN_COMMAND role (commander/second-in-command).
 *
 * @param entry - The roster entry to check
 * @returns True if entry is an officer
 */
function isOfficer(entry: ICampaignRosterEntry): boolean {
  return OFFICER_ROLES.has(entry.primaryRole);
}

/**
 * Checks if a roster entry is alive (eligible for food/housing costs).
 * Only excludes KIA — CampaignPilotStatus has 5 values and lacks the
 * extended dead/retired/deserted variants that IPerson.status had.
 * All other statuses (Active, Wounded, Critical, MIA) incur food/housing costs.
 *
 * @param entry - The roster entry to check
 * @returns True if entry is alive
 */
function isAlive(entry: ICampaignRosterEntry): boolean {
  return entry.status !== CampaignPilotStatus.KIA;
}

// =============================================================================
// Tax Calculation
// =============================================================================

/**
 * Calculates the monthly tax on campaign profits.
 *
 * Returns Money.ZERO if:
 * - campaign.options.useTaxes is false
 * - profits are negative or zero
 *
 * Otherwise returns: profits × (taxRate / 100)
 *
 * @param campaign - The campaign to calculate taxes for
 * @returns Tax amount as Money
 *
 * @example
 * // Campaign with 10,000 profit at 10% tax rate
 * calculateTaxes(campaign) // => Money(1000)
 *
 * // Campaign with taxes disabled
 * calculateTaxes(campaignNoTax) // => Money.ZERO
 *
 * // Campaign with negative profit
 * calculateTaxes(campaignLoss) // => Money.ZERO
 */
export function calculateTaxes(campaign: ICampaign): Money {
  // Return zero if taxes are disabled
  if (!campaign.options.useTaxes) {
    return Money.ZERO;
  }

  // Calculate profits
  const profits = calculateProfits(campaign);

  // Return zero if profits are not positive
  if (!profits.isPositive()) {
    return Money.ZERO;
  }

  // Apply tax rate
  return profits.multiply(campaign.options.taxRate / 100);
}

/**
 * Calculates the monthly profit for a campaign.
 *
 * Formula: currentBalance - startingCapital
 *
 * @param campaign - The campaign to calculate profits for
 * @returns Profit amount as Money (can be negative)
 *
 * @example
 * // Campaign with 50,000 balance and 40,000 starting funds
 * calculateProfits(campaign) // => Money(10000)
 *
 * // Campaign with 30,000 balance and 40,000 starting funds
 * calculateProfits(campaign) // => Money(-10000)
 */
export function calculateProfits(campaign: ICampaign): Money {
  const startingCapital = new Money(campaign.options.startingFunds);
  return campaign.finances.balance.subtract(startingCapital);
}

/**
 * Calculates the monthly overhead costs for a campaign.
 *
 * Overhead is a percentage of total monthly salary. Pre-join pattern:
 * callers build the pilot lookup once via `buildPilotLookup(vault)` and
 * pass it here alongside roster entries.
 *
 * Formula: totalSalary × (overheadPercent / 100)
 *
 * @param rosterEntries - The campaign roster entries
 * @param pilots - Pre-joined vault pilot map (pilotId → IPilot)
 * @param options - Campaign options
 * @returns Overhead amount as Money
 *
 * @example
 * // Campaign with 100,000 total salary at 5% overhead
 * calculateMonthlyOverhead(entries, pilotsMap, options) // => Money(5000)
 */
export function calculateMonthlyOverhead(
  rosterEntries: readonly ICampaignRosterEntry[],
  pilots: ReadonlyMap<string, IPilot>,
  options: ICampaignOptions,
): Money {
  const salaryBreakdown = calculateTotalMonthlySalary(
    rosterEntries,
    pilots,
    options,
  );
  return salaryBreakdown.total.multiply(options.overheadPercent / 100);
}

/**
 * Calculates the monthly food and housing costs for all campaign roster entries.
 *
 * Costs are tiered by role/status:
 * - Officer (ADMIN_COMMAND role): 1,260 C-bills/month
 * - Enlisted (all other roles): 552 C-bills/month
 *
 * Only counts alive entries (skips KIA). All other CampaignPilotStatus values
 * (Active, Wounded, Critical, MIA) incur food/housing costs.
 *
 * NPC domain matrix (finance = PROCESS): NPC entries (pilot === null) still
 * incur food/housing costs at the enlisted tier unless they hold ADMIN_COMMAND.
 *
 * @param rosterEntries - The campaign roster entries
 * @returns Total food and housing cost as Money
 *
 * @example
 * // 1 officer + 5 enlisted
 * calculateFoodAndHousing(entries) // => Money(1260 + 5*552) = Money(4020)
 */
export function calculateFoodAndHousing(
  rosterEntries: readonly ICampaignRosterEntry[],
): Money {
  let total = 0;

  for (const entry of rosterEntries) {
    // Skip KIA entries
    if (!isAlive(entry)) {
      continue;
    }

    // Determine cost tier: officer or enlisted (no prisoner tier — no POW status)
    if (isOfficer(entry)) {
      total += FOOD_AND_HOUSING_COSTS.officer;
    } else {
      total += FOOD_AND_HOUSING_COSTS.enlisted;
    }
  }

  return new Money(total);
}
