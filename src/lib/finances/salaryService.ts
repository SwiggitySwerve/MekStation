/**
 * Salary Service - Role-based salary calculation for campaign personnel
 *
 * Provides salary lookup tables and calculation functions:
 * - BASE_MONTHLY_SALARY: Monthly base salary by role (10 canonical roles)
 * - XP_SALARY_MULTIPLIER: Salary multiplier by experience level
 * - SPECIAL_MULTIPLIERS: Special case multipliers
 * - calculatePersonSalary: Calculate individual salary from roster entry + vault pilot
 * - calculateTotalMonthlySalary: Calculate total monthly salary for all campaign personnel
 *
 * Salary formula:
 *   salary = baseSalary × xpMultiplier × salaryMultiplier
 *   if (secondaryRole && payForSecondaryRole):
 *     salary += secondaryRoleBaseSalary × 0.5
 *
 * NPC domain matrix (finance = PROCESS): NPC roster entries (pilot === null) still
 * incur salary costs — NPCs cost money regardless of vault pilot presence. XP level
 * defaults to 0 for NPCs (no vault XP record available).
 *
 * @module lib/finances/salaryService
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';

import { getRankPayMultiplier } from '../campaign/ranks/rankPay';
import { getDefaultRankSystem } from '../campaign/ranks/rankSystems';

// =============================================================================
// Experience Level Types
// =============================================================================

/**
 * Experience level categories for salary calculation.
 *
 * Local type alias for salary tier calculations with extended range beyond
 * the standard skill progression levels. Includes ultra_green (below green)
 * and legendary (above elite) for specialized salary calculations.
 *
 * @see SkillExperienceLevel for character progression in campaign skills
 * @see MarketExperienceLevel for personnel market hiring
 * @see PilotExperienceLevel for pilot templates
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
export const ROLE_SALARY_MAPPING: Record<
  CampaignPersonnelRole,
  CampaignPersonnelRole
> = {
  // Combat roles → closest canonical
  [CampaignPersonnelRole.PILOT]: CampaignPersonnelRole.PILOT,
  [CampaignPersonnelRole.LAM_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.AEROSPACE_PILOT]:
    CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.VEHICLE_DRIVER]: CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.VEHICLE_CREW_NAVAL]:
    CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.VEHICLE_CREW_VTOL]:
    CampaignPersonnelRole.VEHICLE_DRIVER,
  [CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT]:
    CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.PROTOMEK_PILOT]: CampaignPersonnelRole.PILOT,
  [CampaignPersonnelRole.BATTLE_ARMOUR]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.SOLDIER]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.VESSEL_PILOT]: CampaignPersonnelRole.AEROSPACE_PILOT,
  [CampaignPersonnelRole.VESSEL_GUNNER]: CampaignPersonnelRole.SOLDIER,
  [CampaignPersonnelRole.VESSEL_CREW]: CampaignPersonnelRole.SUPPORT,
  [CampaignPersonnelRole.VESSEL_NAVIGATOR]:
    CampaignPersonnelRole.AEROSPACE_PILOT,

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
export const XP_LEVEL_THRESHOLDS: readonly {
  readonly level: ExperienceLevel;
  readonly minXp: number;
}[] = [
  { level: 'legendary', minXp: 8000 },
  { level: 'elite', minXp: 4000 },
  { level: 'veteran', minXp: 2000 },
  { level: 'regular', minXp: 500 },
  { level: 'green', minXp: 100 },
  { level: 'ultra_green', minXp: 0 },
];

/**
 * Determines the experience level based on total XP earned.
 *
 * PC case: prefers `pilot.career.totalXpEarned` (vault identity owns XP history).
 * NPC case (`pilot === null`): falls back to `entry.campaignXpEarned` so NPCs
 * with accumulated campaign XP are tiered correctly. If neither source has
 * XP, defaults to ultra_green tier (NPC domain matrix: salary/finance = PROCESS).
 *
 * @param entry - The roster entry (campaign-scoped XP source for NPCs).
 * @param pilot - The vault pilot, or null for NPC roster entries.
 * @returns The experience level string
 *
 * @example
 * getExperienceLevel(entry, pilotWith500TotalXp) // 'regular'
 * getExperienceLevel(entryWith500CampaignXp, null) // 'regular' (NPC fallback)
 */
export function getExperienceLevel(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): ExperienceLevel {
  const totalXp = pilot?.career?.totalXpEarned ?? entry.campaignXpEarned ?? 0;

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
export function createSalaryOptions(
  campaignOptions: ICampaignOptions,
): SalaryOptions {
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
  const canonicalRole =
    ROLE_SALARY_MAPPING[role] ?? CampaignPersonnelRole.UNASSIGNED;
  return (
    BASE_MONTHLY_SALARY[canonicalRole] ??
    BASE_MONTHLY_SALARY[CampaignPersonnelRole.UNASSIGNED]
  );
}

/**
 * Calculates the monthly salary for a single roster entry.
 *
 * Formula:
 *   salary = baseSalary × xpMultiplier × salaryMultiplier
 *   (no secondary role: ICampaignRosterEntry has no secondaryRole field)
 *
 * NPC domain matrix (finance = PROCESS): NPC entries (pilot === null) still
 * incur salary costs. XP defaults to 0 when no vault pilot is present.
 *
 * @param entry - The roster entry (provides primaryRole and employment context)
 * @param pilot - The vault pilot for XP lookup, or null for NPC entries
 * @param options - Salary calculation options
 * @returns Monthly salary as Money
 *
 * @example
 * // Pilot at regular experience, 1.0 multiplier
 * calculatePersonSalary(entry, pilot, { salaryMultiplier: 1.0, payForSecondaryRole: true })
 * // => Money(1500)
 *
 * // NPC entry (pilot === null), ultra_green (0 XP), 1.0 multiplier
 * calculatePersonSalary(npcEntry, null, { salaryMultiplier: 1.0, payForSecondaryRole: true })
 * // => Money(900) for PILOT role (1500 × 0.6)
 */
export function calculatePersonSalary(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  options: SalaryOptions,
): Money {
  const baseSalary = getBaseSalaryForRole(entry.primaryRole);
  const xpLevel = getExperienceLevel(entry, pilot);
  const xpMult = XP_SALARY_MULTIPLIER[xpLevel] ?? 1.0;
  const rankMult = getRankPayMultiplier(entry, pilot, getDefaultRankSystem());

  // ICampaignRosterEntry has no secondaryRole field — secondary role bonus is
  // not applicable at this layer. If secondaryRole support is added to the
  // roster entry in a future change, wire it here.
  const salary = baseSalary * xpMult * rankMult * options.salaryMultiplier;

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
  /** Individual salary entries (pilotId → salary) */
  readonly entries: ReadonlyMap<string, Money>;
}

/**
 * Roster entry statuses excluded from salary calculation.
 *
 * Only KIA is excluded — the CampaignPilotStatus enum has 5 values and lacks
 * the PersonnelStatus dead/retired/deserted variants. All other active statuses
 * (Active, Wounded, Critical, MIA) incur salary costs.
 */
const EXCLUDED_STATUSES = new Set<CampaignPilotStatus>([
  CampaignPilotStatus.KIA,
]);

/**
 * Checks if a roster entry is eligible for salary payment.
 * Excludes KIA entries; all other CampaignPilotStatus values are eligible.
 *
 * @param entry - The roster entry to check
 * @returns True if eligible for salary
 */
export function isEligibleForSalary(entry: ICampaignRosterEntry): boolean {
  return !EXCLUDED_STATUSES.has(entry.status);
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
 * (combat, support, civilian). Pre-join pattern: callers build the pilot
 * lookup once per pipeline run via `buildPilotLookup(vault)` and pass here.
 *
 * NPC domain matrix (finance = PROCESS): NPC entries (pilotId absent from
 * pilots map) still contribute to the salary total at ultra_green rate.
 *
 * @param rosterEntries - The campaign roster entries to calculate salaries for
 * @param pilots - Pre-joined vault pilot map (pilotId → IPilot)
 * @param options - Campaign options controlling salary behaviour
 * @returns SalaryBreakdown with totals and per-entry salary amounts
 *
 * @example
 * const pilotMap = buildPilotLookup(usePilotStore.getState().pilots);
 * const breakdown = calculateTotalMonthlySalary(rosterEntries, pilotMap, campaign.options);
 * logger.debug(`Total: ${breakdown.total.format()}`);
 */
export function calculateTotalMonthlySalary(
  rosterEntries: readonly ICampaignRosterEntry[],
  pilots: ReadonlyMap<string, IPilot>,
  options: ICampaignOptions,
): SalaryBreakdown {
  const salaryOptions = createSalaryOptions(options);
  const salaryEntries = new Map<string, Money>();

  let total = Money.ZERO;
  let combatSalaries = Money.ZERO;
  let supportSalaries = Money.ZERO;
  let civilianSalaries = Money.ZERO;
  let personnelCount = 0;

  // Skip salary calculation entirely if salaries are disabled
  if (!options.payForSalaries) {
    return {
      total: Money.ZERO,
      combatSalaries: Money.ZERO,
      supportSalaries: Money.ZERO,
      civilianSalaries: Money.ZERO,
      personnelCount: 0,
      entries: salaryEntries,
    };
  }

  for (const entry of rosterEntries) {
    if (!isEligibleForSalary(entry)) {
      continue;
    }

    // NPC entries resolve to null (no vault counterpart); salary still applies.
    const pilot = pilots.get(entry.pilotId) ?? null;
    const salary = calculatePersonSalary(entry, pilot, salaryOptions);
    salaryEntries.set(entry.pilotId, salary);
    total = total.add(salary);
    personnelCount++;

    // Categorize by role
    if (COMBAT_ROLES.has(entry.primaryRole)) {
      combatSalaries = combatSalaries.add(salary);
    } else if (SUPPORT_ROLES.has(entry.primaryRole)) {
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
    entries: salaryEntries,
  };
}
