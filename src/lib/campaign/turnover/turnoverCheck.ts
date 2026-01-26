import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign, ICampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
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

const SKIPPED_STATUSES = new Set<PersonnelStatus>([
  PersonnelStatus.POW,
  PersonnelStatus.MIA,
  PersonnelStatus.STUDENT,
  PersonnelStatus.KIA,
  PersonnelStatus.RETIRED,
  PersonnelStatus.DESERTED,
  PersonnelStatus.MISSING,
  PersonnelStatus.AWOL,
]);

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

/** @stub Returns flat monthly salary. Replace with Plan 4's salaryService when built. */
export function getPersonMonthlySalary(_person: IPerson, _options: ICampaignOptions): Money {
  return new Money(DEFAULT_MONTHLY_SALARY);
}

function isEligibleForCheck(person: IPerson, campaign: ICampaign): boolean {
  if (person.status !== PersonnelStatus.ACTIVE) return false;
  if (SKIPPED_STATUSES.has(person.status)) return false;

  if (person.isCommander && campaign.options.turnoverCommanderImmune) return false;

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

function calculateModifiers(person: IPerson, campaign: ICampaign): TurnoverModifierResult[] {
  return [
    buildModifier('baseTarget', 'Base Target', getBaseTargetModifier(campaign), false),
    buildModifier('founder', 'Founder', getFounderModifier(person), false),
    buildModifier('serviceContract', 'Service Contract', getServiceContractModifier(person), false),
    buildModifier('skillDesirability', 'Skill Desirability', getSkillDesirabilityModifier(person, campaign), false),
    buildModifier('recentPromotion', 'Recent Promotion', getRecentPromotionModifier(person, campaign), false),
    buildModifier('fatigue', 'Fatigue', getFatigueModifier(person), true),
    buildModifier('hrStrain', 'HR Strain', getHRStrainModifier(campaign), true),
    buildModifier('managementSkill', 'Management Skill', getManagementSkillModifier(campaign), true),
    buildModifier('shares', 'Shares', getSharesModifier(person, campaign), true),
    buildModifier('unitRating', 'Unit Rating', getUnitRatingModifier(campaign), true),
    buildModifier('hostileTerritory', 'Hostile Territory', getHostileTerritoryModifier(campaign), true),
    buildModifier('missionStatus', 'Mission Status', getMissionStatusModifier(campaign), false),
    buildModifier('loyalty', 'Loyalty', getLoyaltyModifier(person), true),
    buildModifier('factionCampaign', 'Faction (Campaign)', getFactionCampaignModifier(campaign), true),
    buildModifier('factionOrigin', 'Faction (Origin)', getFactionOriginModifier(person), true),
    buildModifier('age', 'Age', getAgeModifier(person, campaign), false),
    buildModifier('family', 'Family', getFamilyModifier(person, campaign), true),
    buildModifier('injuries', 'Injuries', getInjuryModifier(person), false),
    buildModifier('officer', 'Officer Status', getOfficerModifier(person), false),
  ];
}

function createSkippedResult(person: IPerson): TurnoverCheckResult {
  return {
    personId: person.id,
    personName: person.name,
    roll: 0,
    targetNumber: 0,
    modifiers: [],
    passed: true,
    departureType: null,
    payout: Money.ZERO,
  };
}

export function checkTurnover(
  person: IPerson,
  campaign: ICampaign,
  random: RandomFn,
): TurnoverCheckResult {
  if (!isEligibleForCheck(person, campaign)) {
    return createSkippedResult(person);
  }

  const modifiers = calculateModifiers(person, campaign);
  const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);
  const diceRoll = roll2d6(random);
  const passed = diceRoll >= targetNumber;

  if (passed) {
    return {
      personId: person.id,
      personName: person.name,
      roll: diceRoll,
      targetNumber,
      modifiers,
      passed: true,
      departureType: null,
      payout: Money.ZERO,
    };
  }

  const isDesertion = diceRoll < targetNumber - DESERTION_THRESHOLD;
  const departureType = isDesertion ? 'deserted' as const : 'retired' as const;

  const payoutMultiplier = campaign.options.turnoverPayoutMultiplier ?? DEFAULT_PAYOUT_MULTIPLIER;
  const salary = getPersonMonthlySalary(person, campaign.options);
  const payout = isDesertion ? Money.ZERO : salary.multiply(payoutMultiplier);

  return {
    personId: person.id,
    personName: person.name,
    roll: diceRoll,
    targetNumber,
    modifiers,
    passed: false,
    departureType,
    payout,
  };
}

export function runTurnoverChecks(
  campaign: ICampaign,
  random: RandomFn,
): TurnoverReport {
  const results: TurnoverCheckResult[] = [];

  const personnel = Array.from(campaign.personnel.values());
  for (const person of personnel) {
    results.push(checkTurnover(person, campaign, random));
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
