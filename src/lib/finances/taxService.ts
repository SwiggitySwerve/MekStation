/**
 * Tax Service - Tax calculation and monthly overhead costs
 *
 * Provides tax and overhead calculation functions:
 * - calculateTaxes: Calculate taxes on profits (0 if negative/zero profit or useTaxes=false)
 * - calculateProfits: Calculate profits = currentBalance - startingCapital
 * - calculateMonthlyOverhead: Calculate overhead = 5% of total salary
 * - calculateFoodAndHousing: Calculate food/housing costs per person (3 tiers: officer, enlisted, prisoner/dependent)
 *
 * Tax formula:
 *   taxes = profits × (taxRate / 100) if profits > 0 and useTaxes=true, else 0
 *
 * Overhead formula:
 *   overhead = totalSalary × (overheadPercent / 100)
 *
 * Food/Housing tiers:
 *   - Officer (commander or second-in-command): 1,260 C-bills/month
 *   - Enlisted: 552 C-bills/month
 *   - Prisoner/Dependent (POW status): 348 C-bills/month
 *
 * @module lib/finances/taxService
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';

import { PersonnelStatus, CampaignPersonnelRole } from '@/types/campaign/enums';
import { Money } from '@/types/campaign/Money';

import { calculateTotalMonthlySalary } from './salaryService';

// =============================================================================
// Food and Housing Costs
// =============================================================================

/**
 * Food and housing cost tiers per person per month
 */
export const FOOD_AND_HOUSING_COSTS = {
  /** Officer (commander or second-in-command): 1,260 C-bills/month */
  officer: 1260,
  /** Enlisted personnel: 552 C-bills/month */
  enlisted: 552,
  /** Prisoner/Dependent (POW status): 348 C-bills/month */
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
 * Checks if a person is an officer for food/housing cost purposes.
 * Officers are those with ADMIN_COMMAND role (commander/second-in-command).
 *
 * @param person - The person to check
 * @returns True if person is an officer
 */
function isOfficer(person: IPerson): boolean {
  return OFFICER_ROLES.has(person.primaryRole);
}

/**
 * Checks if a person is a prisoner/dependent for food/housing cost purposes.
 * Prisoners are those with POW status.
 *
 * @param person - The person to check
 * @returns True if person is a prisoner/dependent
 */
function isPrisoner(person: IPerson): boolean {
  return person.status === PersonnelStatus.POW;
}

/**
 * Checks if a person is alive (eligible for food/housing costs).
 * Excludes dead, retired, deserted, and other non-alive statuses.
 *
 * @param person - The person to check
 * @returns True if person is alive
 */
function isAlive(person: IPerson): boolean {
  const deadStatuses = new Set<PersonnelStatus>([
    PersonnelStatus.KIA,
    PersonnelStatus.RETIRED,
    PersonnelStatus.DESERTED,
    PersonnelStatus.ACCIDENTAL_DEATH,
    PersonnelStatus.DISEASE,
    PersonnelStatus.NATURAL_CAUSES,
    PersonnelStatus.MURDER,
    PersonnelStatus.WOUNDS,
    PersonnelStatus.MIA_PRESUMED_DEAD,
    PersonnelStatus.OLD_AGE,
    PersonnelStatus.PREGNANCY_COMPLICATIONS,
    PersonnelStatus.UNDETERMINED,
    PersonnelStatus.MEDICAL_COMPLICATIONS,
    PersonnelStatus.SUICIDE,
    PersonnelStatus.EXECUTION,
    PersonnelStatus.MISSING_PRESUMED_DEAD,
  ]);

  return !deadStatuses.has(person.status);
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
 * Overhead is 5% of total monthly salary.
 *
 * Formula: totalSalary × (overheadPercent / 100)
 *
 * @param campaign - The campaign to calculate overhead for
 * @returns Overhead amount as Money
 *
 * @example
 * // Campaign with 100,000 total salary at 5% overhead
 * calculateMonthlyOverhead(campaign) // => Money(5000)
 */
export function calculateMonthlyOverhead(campaign: ICampaign): Money {
  const salaryBreakdown = calculateTotalMonthlySalary(campaign);
  return salaryBreakdown.total.multiply(campaign.options.overheadPercent / 100);
}

/**
 * Calculates the monthly food and housing costs for all campaign personnel.
 *
 * Costs are tiered by role/status:
 * - Officer (ADMIN_COMMAND role): 1,260 C-bills/month
 * - Enlisted: 552 C-bills/month
 * - Prisoner/Dependent (POW status): 348 C-bills/month
 *
 * Only counts alive personnel (skips KIA, RETIRED, DESERTED, etc.).
 *
 * @param campaign - The campaign to calculate food/housing for
 * @returns Total food and housing cost as Money
 *
 * @example
 * // Campaign with 1 officer, 5 enlisted, 1 prisoner
 * calculateFoodAndHousing(campaign)
 * // => Money(1260 + 5*552 + 1*348) = Money(4128)
 */
export function calculateFoodAndHousing(campaign: ICampaign): Money {
  let total = 0;

  const personArray = Array.from(campaign.personnel.values());
  for (const person of personArray) {
    // Skip non-alive personnel
    if (!isAlive(person)) {
      continue;
    }

    // Determine cost tier
    if (isPrisoner(person)) {
      total += FOOD_AND_HOUSING_COSTS.prisoner;
    } else if (isOfficer(person)) {
      total += FOOD_AND_HOUSING_COSTS.officer;
    } else {
      total += FOOD_AND_HOUSING_COSTS.enlisted;
    }
  }

  return new Money(total);
}
