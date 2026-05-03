import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { Money } from '@/types/campaign/Money';

import type { TurnoverModifierResult } from './modifiers/types';

import {
  getBaseTargetModifier,
  getFounderModifier,
  getRecentPromotionModifier,
  getAgeModifier,
  getInjuryModifier,
  getOfficerModifier,
  getServiceContractModifier,
  getSkillDesirabilityModifier,
  getMissionStatusModifier,
  getFatigueModifier,
  getHRStrainModifier,
  getManagementSkillModifier,
  getSharesModifier,
  getUnitRatingModifier,
  getHostileTerritoryModifier,
  getLoyaltyModifier,
  getFactionCampaignModifier,
  getFactionOriginModifier,
  getFamilyModifier,
} from './modifiers';

export type RandomFn = () => number;

const DEFAULT_PAYOUT_MULTIPLIER = 12;
const DEFAULT_MONTHLY_SALARY = 1000;
const DESERTION_THRESHOLD = 4;

export interface TurnoverCheckResult {
  readonly personId: string;
  readonly personName: string;
  readonly roll: number;
  readonly targetNumber: number;
  readonly modifiers: readonly TurnoverModifierResult[];
  readonly passed: boolean;
  readonly departureType: 'retired' | 'deserted' | null;
  readonly payout: Money;
}

export interface TurnoverReport {
  readonly results: readonly TurnoverCheckResult[];
  readonly totalChecked: number;
  readonly totalDepartures: number;
  readonly totalPayout: Money;
}

export function roll2d6(random: RandomFn): number {
  return Math.floor(random() * 6) + 1 + Math.floor(random() * 6) + 1;
}

/**
 * Returns the flat monthly salary for a roster entry.
 *
 * @stub Replace with Plan 4's salaryService when built.
 *
 * NPC behavior: PROCESS — salary is roster-entry-scoped; NPCs and PCs follow
 * the same default when no override is set.
 */
export function getPersonMonthlySalary(
  _entry: ICampaignRosterEntry,
  _options: ICampaignOptions,
): Money {
  return new Money(DEFAULT_MONTHLY_SALARY);
}

/**
 * Determines whether a roster entry is eligible for a turnover check.
 *
 * Only `Active` entries are checked. Wounded/Critical/MIA/KIA entries are
 * skipped. The commander-immunity option bypasses the check for unit
 * commanders.
 *
 * NPC behavior: PROCESS — departure rolls apply to NPCs and PCs alike.
 */
function isEligibleForCheck(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  campaign: ICampaign,
): boolean {
  // Only active entries receive a turnover check
  if (entry.status !== CampaignPilotStatus.Active) return false;

  // Commander immunity: skip the check for the unit commander when the option
  // is enabled; `isCommander` lives on the roster entry.
  if (entry.isCommander && campaign.options.turnoverCommanderImmune)
    return false;

  return true;
}

function buildModifier(
  modifierId: string,
  displayName: string,
  value: number,
  isStub: boolean,
): TurnoverModifierResult {
  return { modifierId, displayName, value, isStub };
}

/**
 * Assembles all turnover modifier contributions for a single roster entry.
 *
 * NPC behavior: individual modifiers define their own NPC handling (see each
 * modifier's JSDoc). Aggregate behaviour: all modifiers whose domain is
 * PROCESS fire; officer-status modifier early-returns 0 for NPCs.
 */
function calculateModifiers(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  campaign: ICampaign,
): TurnoverModifierResult[] {
  return [
    buildModifier(
      'baseTarget',
      'Base Target',
      getBaseTargetModifier(campaign),
      false,
    ),
    buildModifier(
      'founder',
      'Founder',
      getFounderModifier(entry, pilot),
      false,
    ),
    buildModifier(
      'serviceContract',
      'Service Contract',
      getServiceContractModifier(entry, pilot),
      false,
    ),
    buildModifier(
      'skillDesirability',
      'Skill Desirability',
      getSkillDesirabilityModifier(entry, pilot, campaign),
      false,
    ),
    buildModifier(
      'recentPromotion',
      'Recent Promotion',
      getRecentPromotionModifier(entry, pilot, campaign),
      false,
    ),
    buildModifier('fatigue', 'Fatigue', getFatigueModifier(entry, pilot), true),
    buildModifier('hrStrain', 'HR Strain', getHRStrainModifier(campaign), true),
    buildModifier(
      'managementSkill',
      'Management Skill',
      getManagementSkillModifier(campaign),
      true,
    ),
    buildModifier(
      'shares',
      'Shares',
      getSharesModifier(entry, pilot, campaign),
      true,
    ),
    buildModifier(
      'unitRating',
      'Unit Rating',
      getUnitRatingModifier(campaign),
      true,
    ),
    buildModifier(
      'hostileTerritory',
      'Hostile Territory',
      getHostileTerritoryModifier(campaign),
      true,
    ),
    buildModifier(
      'missionStatus',
      'Mission Status',
      getMissionStatusModifier(campaign),
      false,
    ),
    buildModifier('loyalty', 'Loyalty', getLoyaltyModifier(entry, pilot), true),
    buildModifier(
      'factionCampaign',
      'Faction (Campaign)',
      getFactionCampaignModifier(campaign),
      true,
    ),
    buildModifier(
      'factionOrigin',
      'Faction (Origin)',
      getFactionOriginModifier(entry, pilot),
      true,
    ),
    buildModifier('age', 'Age', getAgeModifier(entry, pilot, campaign), false),
    buildModifier(
      'family',
      'Family',
      getFamilyModifier(entry, pilot, campaign),
      true,
    ),
    buildModifier(
      'injuries',
      'Injuries',
      getInjuryModifier(entry, pilot),
      false,
    ),
    buildModifier(
      'officer',
      'Officer Status',
      getOfficerModifier(entry, pilot),
      false,
    ),
  ];
}

/**
 * Builds a skipped (passed) result for an ineligible entry.
 *
 * Uses `entry.pilotId` and `entry.pilotName` rather than synthesizing IPerson.
 */
function createSkippedResult(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): TurnoverCheckResult {
  return {
    personId: entry.pilotId,
    personName: entry.pilotName,
    roll: 0,
    targetNumber: 0,
    modifiers: [],
    passed: true,
    departureType: null,
    payout: Money.ZERO,
  };
}

/**
 * Runs a single turnover check for a roster entry.
 *
 * Skipped entries (ineligible status, commander immunity) return a passed
 * result with empty modifiers. Eligible entries roll 2d6 against the sum of
 * all applicable modifiers; failing entries receive a departure type (retired
 * or deserted) and — for retirements — a severance payout.
 *
 * NPC behavior: PROCESS — departure rolls apply to NPCs and PCs alike. The
 * individual modifiers handle domain-level NPC skipping (e.g., officer status).
 *
 * @param entry - The roster entry to check.
 * @param pilot - Resolved vault pilot for the entry, or null for NPCs.
 * @param campaign - Current campaign state (for options + modifiers).
 * @param random - PRNG function (injectable for deterministic testing).
 */
export function checkTurnover(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  campaign: ICampaign,
  random: RandomFn,
): TurnoverCheckResult {
  if (!isEligibleForCheck(entry, pilot, campaign)) {
    return createSkippedResult(entry, pilot);
  }

  const modifiers = calculateModifiers(entry, pilot, campaign);
  const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);
  const diceRoll = roll2d6(random);
  const passed = diceRoll >= targetNumber;

  if (passed) {
    return {
      personId: entry.pilotId,
      personName: entry.pilotName,
      roll: diceRoll,
      targetNumber,
      modifiers,
      passed: true,
      departureType: null,
      payout: Money.ZERO,
    };
  }

  const isDesertion = diceRoll < targetNumber - DESERTION_THRESHOLD;
  const departureType = isDesertion
    ? ('deserted' as const)
    : ('retired' as const);

  const payoutMultiplier =
    campaign.options.turnoverPayoutMultiplier ?? DEFAULT_PAYOUT_MULTIPLIER;
  const salary = getPersonMonthlySalary(entry, campaign.options);
  const payout = isDesertion ? Money.ZERO : salary.multiply(payoutMultiplier);

  return {
    personId: entry.pilotId,
    personName: entry.pilotName,
    roll: diceRoll,
    targetNumber,
    modifiers,
    passed: false,
    departureType,
    payout,
  };
}

/**
 * Runs turnover checks for all roster entries in a campaign.
 *
 * Accepts pre-joined pilot data (`pilotsByPilotId`) built once by the
 * caller via `buildPilotLookup(vault)` — avoids O(N²) vault scans per entry.
 * NPC entries (whose `pilotId` has no vault counterpart) resolve to null.
 *
 * NPC behavior: PROCESS — departure rolls apply to NPCs and PCs alike.
 *
 * @param entries - Roster entries to process (typically `rosterStore.pilots`).
 * @param pilotsByPilotId - Pre-built vault lookup (pilot.id → IPilot).
 * @param campaign - Current campaign state.
 * @param random - PRNG function (injectable for deterministic testing).
 */
export function runTurnoverChecks(
  entries: readonly ICampaignRosterEntry[],
  pilotsByPilotId: ReadonlyMap<string, IPilot>,
  campaign: ICampaign,
  random: RandomFn,
): TurnoverReport {
  const results: TurnoverCheckResult[] = [];

  for (const entry of entries) {
    const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;
    results.push(checkTurnover(entry, pilot, campaign, random));
  }

  const departures = results.filter((r) => !r.passed);
  const totalPayout = departures.reduce(
    (sum, r) => sum.add(r.payout),
    Money.ZERO,
  );

  return {
    results,
    totalChecked: results.filter((r) => r.modifiers.length > 0).length,
    totalDepartures: departures.length,
    totalPayout,
  };
}
