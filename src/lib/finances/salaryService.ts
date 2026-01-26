/**
 * Salary Service - Role-based salary calculation for campaign personnel
 *
 * Provides salary lookup tables and calculation functions:
 * - BASE_MONTHLY_SALARY: Monthly base salary by role (10 canonical roles)
 * - XP_SALARY_MULTIPLIER: Salary multiplier by experience level
 * - SPECIAL_MULTIPLIERS: Special case multipliers
 * - calculatePersonSalary: Calculate individual person's monthly salary
 * - calculateTotalMonthlySalary: Calculate total monthly salary for all campaign personnel
 *
 * Salary formula:
 *   salary = baseSalary × xpMultiplier × salaryMultiplier
 *   if (secondaryRole && payForSecondaryRole):
 *     salary += secondaryRoleBaseSalary × 0.5
 *
 * @module lib/finances/salaryService
 */

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Experience Level Types
// =============================================================================

/**
 * Experience level categories for salary calculation.
 * Based on BattleTech experience tiers.
 */
export type ExperienceLevel =
  | 'ultra_green'
  | 'green'
  | 'regular'
  | 'veteran'
  | 'elite'
  | 'legendary';

// =============================================================================
// Salary Lookup Tables
// =============================================================================

/**
 * Base monthly salary in C-bills for each canonical campaign role.
 *
 * Maps the 10 core CampaignPersonnelRole values used in salary calculation.
 * Roles not in this table (e.g., LAM_PILOT, VESSEL_CREW) are mapped
 * to their closest canonical role via ROLE_SALARY_MAPPING.
 */
export const BASE_MONTHLY_SALARY: Record<string, number> = {
  [CampaignPersonnelRole.PILOT]: 1500,
  [CampaignPersonnelRole.AEROSPACE_PILOT]: 1800,
  [CampaignPersonnelRole.VEHICLE_DRIVER]: 1200,
  [CampaignPersonnelRole.TECH]: 1000,
  [CampaignPersonnelRole.DOCTOR]: 2000,
  [CampaignPersonnelRole.ADMIN]: 800,
  [CampaignPersonnelRole.MEDIC]: 900,
  [CampaignPersonnelRole.SUPPORT]: 600,
  [CampaignPersonnelRole.SOLDIER]: 1000,
  [CampaignPersonnelRole.UNASSIGNED]: 400,
};

/**
 * Maps all CampaignPersonnelRole values to one of the 10 canonical salary roles.
 * Roles already in BASE_MONTHLY_SALARY map to themselves.
 */
export const ROLE_SALARY_MAPPING: Record<CampaignPersonnelRole, CampaignPersonnelRole> = {
  // Combat roles → closest canonical
  [CampaignPersonnelRole.PILOT]: CampaignPersonnelRole.PILOT,
  [CampaignPersonnelRole.LAM_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.AEROSPACE_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.VEHICLE_DRIVER]: CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.VEHICLE_CREW_NAVAL]: CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.VEHICLE_CREW_VTOL]: CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.PROTOMEK_PILOT]: CampaignPersonnelRole.PILOT,
  [CampaignPersonnelRole.BATTLE_ARMOUR]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.SOLDIER]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.VESSEL_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.VESSEL_GUNNER]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.VESSEL_CREW]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.VESSEL_NAVIGATOR]: CampaignPersonnelRole.AEROSPACE_PILOT,

  // Support roles → closest canonical
  [CampaignPersonnelRole.TECH]: CampaignPersonnelRole.TECH,
  [CampaignPersonnelRole.MEK_TECH]: CampaignPersonnelRole.TECH,
  [CampaignPersonnelRole.MECHANIC]: CampaignPersonnelRole.TECH,
  [CampaignPersonnelRole.AERO_TEK]: CampaignPersonnelRole.TECH,
  [CampaignPersonnelRole.BA_TECH]: CampaignPersonnelRole.TECH,
  [CampaignPersonnelRole.ASTECH]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.DOCTOR]: CampaignPersonnelRole.DOCTOR,
  [CampaignPersonnelRole.MEDIC]: CampaignPersonnelRole.MEDIC,
  [CampaignPersonnelRole.ADMIN_COMMAND]: CampaignPersonnelRole.ADMIN,
  [CampaignPersonnelRole.ADMIN_LOGISTICS]: CampaignPersonnelRole.ADMIN,
  [CampaignPersonnelRole.ADMIN_TRANSPORT]: CampaignPersonnelRole.ADMIN,
  [CampaignPersonnelRole.ADMIN_HR]: CampaignPersonnelRole.ADMIN,

  // Civilian roles → SUPPORT or UNASSIGNED
  [CampaignPersonnelRole.DEPENDENT]: CampaignPersonnelRole.UNASSIGNED,
  [CampaignPersonnelRole.CIVILIAN_OTHER]: CampaignPersonnelRole.UNASSIGNED,
  [CampaignPersonnelRole.MERCHANT]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.TEACHER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.LAWYER]: CampaignPersonnelRole.ADMIN,
  [CampaignPersonnelRole.MUSICIAN]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.CHEF]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.BARTENDER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.FIREFIGHTER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.FARMER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.MINER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.FACTORY_WORKER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.COURIER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.GAMBLER]: CampaignPersonnelRole.UNASSIGNED,
  [CampaignPersonnelRole.HISTORIAN]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.PAINTER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.RELIGIOUS_LEADER]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.PSYCHOLOGIST]: CampaignPersonnelRole.DOCTOR,
  [CampaignPersonnelRole.NOBLE]: CampaignPersonnelRole.ADMIN,

  // Legacy roles
  [CampaignPersonnelRole.ADMIN]: CampaignPersonnelRole.ADMIN,
  [CampaignPersonnelRole.SUPPORT]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.UNASSIGNED]: CampaignPersonnelRole.UNASSIGNED,
};

/**
 * Salary multiplier by experience level.
 * Higher experience = higher pay.
 */
export const XP_SALARY_MULTIPLIER: Record<ExperienceLevel, number> = {
  ultra_green: 0.6,
  green: 0.8,
  regular: 1.0,
  veteran: 1.2,
  elite: 1.5,
  legendary: 2.0,
};

/**
 * Special multipliers for specific unit types or conditions.
 */
export const SPECIAL_MULTIPLIERS = {
  /** Anti-Mech infantry salary multiplier */
  antiMek: 1.5,
  /** Specialist infantry salary multiplier */
  specialistInfantry: 1.28,
  /** Secondary role pays 50% of its base salary */
  secondaryRoleRatio: 0.5,
} as const;

// =============================================================================
// Experience Level Helper
// =============================================================================

/**
 * XP thresholds for experience levels.
 * Based on total XP earned by the person.
 */
export const XP_LEVEL_THRESHOLDS: readonly { readonly level: ExperienceLevel; readonly minXp: number }[] = [
  { level: 'legendary', minXp: 8000 },
  { level: 'elite', minXp: 4000 },
  { level: 'veteran', minXp: 2000 },
  { level: 'regular', minXp: 500 },
  { level: 'green', minXp: 100 },
  { level: 'ultra_green', minXp: 0 },
];

/**
 * Determines the experience level of a person based on their total XP earned.
 *
 * @param person - The person to evaluate
 * @returns The experience level string
 *
 * @example
 * getExperienceLevel(personWith500XP) // 'regular'
 * getExperienceLevel(personWith4000XP) // 'elite'
 */
export function getExperienceLevel(person: IPerson): ExperienceLevel {
  const totalXp = person.totalXpEarned;

  for (const threshold of XP_LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.minXp) {
      return threshold.level;
    }
  }

  return 'ultra_green';
}

// =============================================================================
// Salary Options
// =============================================================================

/**
 * Options that affect salary calculation.
 * Extracted from ICampaignOptions plus salary-specific options.
 */
export interface SalaryOptions {
  /** Global salary multiplier (from ICampaignOptions.salaryMultiplier) */
  readonly salaryMultiplier: number;
  /** Whether to pay for secondary roles */
  readonly payForSecondaryRole: boolean;
}

/**
 * Creates SalaryOptions from ICampaignOptions with defaults for
 * salary-specific fields not yet in ICampaignOptions.
 */
export function createSalaryOptions(campaignOptions: ICampaignOptions): SalaryOptions {
  return {
    salaryMultiplier: campaignOptions.salaryMultiplier,
    // Default to true — secondary roles are paid by default
    payForSecondaryRole: true,
  };
}

// =============================================================================
// Salary Calculation
// =============================================================================

/**
 * Gets the base monthly salary for a role, mapping through ROLE_SALARY_MAPPING.
 *
 * @param role - The campaign personnel role
 * @returns Base monthly salary in C-bills
 */
export function getBaseSalaryForRole(role: CampaignPersonnelRole): number {
  const canonicalRole = ROLE_SALARY_MAPPING[role] ?? CampaignPersonnelRole.UNASSIGNED;
  return BASE_MONTHLY_SALARY[canonicalRole] ?? BASE_MONTHLY_SALARY[CampaignPersonnelRole.UNASSIGNED];
}

/**
 * Calculates the monthly salary for a single person.
 *
 * Formula:
 *   salary = baseSalary × xpMultiplier × salaryMultiplier
 *   if (secondaryRole && payForSecondaryRole):
 *     salary += secondaryRoleBaseSalary × secondaryRoleRatio
 *
 * @param person - The person to calculate salary for
 * @param options - Salary calculation options
 * @returns Monthly salary as Money
 *
 * @example
 * // Pilot at regular experience, 1.0 multiplier
 * calculatePersonSalary(regularPilot, { salaryMultiplier: 1.0, payForSecondaryRole: true })
 * // => Money(1500)
 *
 * // Pilot at elite experience, 1.0 multiplier
 * calculatePersonSalary(elitePilot, { salaryMultiplier: 1.0, payForSecondaryRole: true })
 * // => Money(2250)
 */
export function calculatePersonSalary(
  person: IPerson,
  options: SalaryOptions
): Money {
  const baseSalary = getBaseSalaryForRole(person.primaryRole);
  const xpLevel = getExperienceLevel(person);
  const xpMult = XP_SALARY_MULTIPLIER[xpLevel] ?? 1.0;

  let salary = baseSalary * xpMult * options.salaryMultiplier;

  // Add secondary role at 50% if applicable
  if (person.secondaryRole && options.payForSecondaryRole) {
    const secondaryBase = getBaseSalaryForRole(person.secondaryRole);
    salary += secondaryBase * SPECIAL_MULTIPLIERS.secondaryRoleRatio;
  }

  return new Money(salary);
}

// =============================================================================
// Salary Breakdown
// =============================================================================

/**
 * Breakdown of monthly salary costs for a campaign.
 */
export interface SalaryBreakdown {
  /** Total monthly salary for all eligible personnel */
  readonly total: Money;
  /** Salary subtotal for combat roles */
  readonly combatSalaries: Money;
  /** Salary subtotal for support roles */
  readonly supportSalaries: Money;
  /** Salary subtotal for civilian/other roles */
  readonly civilianSalaries: Money;
  /** Number of personnel included in calculation */
  readonly personnelCount: number;
  /** Individual salary entries (person ID → salary) */
  readonly entries: ReadonlyMap<string, Money>;
}

/** Personnel statuses excluded from salary calculation */
const EXCLUDED_STATUSES = new Set<PersonnelStatus>([
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

/**
 * Checks if a person is eligible for salary payment.
 * Excludes dead, retired, and deserted personnel.
 */
export function isEligibleForSalary(person: IPerson): boolean {
  return !EXCLUDED_STATUSES.has(person.status);
}

/** Combat role set for categorization */
const COMBAT_ROLES = new Set<CampaignPersonnelRole>([
  CampaignPersonnelRole.PILOT,
  CampaignPersonnelRole.LAM_PILOT,
  CampaignPersonnelRole.AEROSPACE_PILOT,
  CampaignPersonnelRole.VEHICLE_DRIVER,
  CampaignPersonnelRole.VEHICLE_CREW_NAVAL,
  CampaignPersonnelRole.VEHICLE_CREW_VTOL,
  CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT,
  CampaignPersonnelRole.PROTOMEK_PILOT,
  CampaignPersonnelRole.BATTLE_ARMOUR,
  CampaignPersonnelRole.SOLDIER,
  CampaignPersonnelRole.VESSEL_PILOT,
  CampaignPersonnelRole.VESSEL_GUNNER,
  CampaignPersonnelRole.VESSEL_CREW,
  CampaignPersonnelRole.VESSEL_NAVIGATOR,
]);

/** Support role set for categorization */
const SUPPORT_ROLES = new Set<CampaignPersonnelRole>([
  CampaignPersonnelRole.TECH,
  CampaignPersonnelRole.MEK_TECH,
  CampaignPersonnelRole.MECHANIC,
  CampaignPersonnelRole.AERO_TEK,
  CampaignPersonnelRole.BA_TECH,
  CampaignPersonnelRole.ASTECH,
  CampaignPersonnelRole.DOCTOR,
  CampaignPersonnelRole.MEDIC,
  CampaignPersonnelRole.ADMIN_COMMAND,
  CampaignPersonnelRole.ADMIN_LOGISTICS,
  CampaignPersonnelRole.ADMIN_TRANSPORT,
  CampaignPersonnelRole.ADMIN_HR,
]);

/**
 * Calculates the total monthly salary for all eligible campaign personnel.
 *
 * Sums individual salaries and provides a breakdown by role category
 * (combat, support, civilian).
 *
 * @param campaign - The campaign to calculate salaries for
 * @returns SalaryBreakdown with totals and per-person entries
 *
 * @example
 * const breakdown = calculateTotalMonthlySalary(campaign);
 * console.log(`Total: ${breakdown.total.format()}`);
 * console.log(`Combat: ${breakdown.combatSalaries.format()}`);
 */
export function calculateTotalMonthlySalary(campaign: ICampaign): SalaryBreakdown {
  const salaryOptions = createSalaryOptions(campaign.options);
  const entries = new Map<string, Money>();

  let total = Money.ZERO;
  let combatSalaries = Money.ZERO;
  let supportSalaries = Money.ZERO;
  let civilianSalaries = Money.ZERO;
  let personnelCount = 0;

  // Skip salary calculation entirely if salaries are disabled
  if (!campaign.options.payForSalaries) {
    return {
      total: Money.ZERO,
      combatSalaries: Money.ZERO,
      supportSalaries: Money.ZERO,
      civilianSalaries: Money.ZERO,
      personnelCount: 0,
      entries,
    };
  }

  for (const [id, person] of Array.from(campaign.personnel.entries())) {
    if (!isEligibleForSalary(person)) {
      continue;
    }

    const salary = calculatePersonSalary(person, salaryOptions);
    entries.set(id, salary);
    total = total.add(salary);
    personnelCount++;

    // Categorize by role
    if (COMBAT_ROLES.has(person.primaryRole)) {
      combatSalaries = combatSalaries.add(salary);
    } else if (SUPPORT_ROLES.has(person.primaryRole)) {
      supportSalaries = supportSalaries.add(salary);
    } else {
      civilianSalaries = civilianSalaries.add(salary);
    }
  }

  return {
    total,
    combatSalaries,
    supportSalaries,
    civilianSalaries,
    personnelCount,
    entries,
  };
}
