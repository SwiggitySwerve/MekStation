import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';

const MONTHS_FOR_RECENT_PROMOTION = 6;

const AGE_THRESHOLD_YOUNG = 20;
const AGE_THRESHOLD_50 = 50;
const AGE_THRESHOLD_55 = 55;
const AGE_THRESHOLD_60 = 60;
const AGE_THRESHOLD_65 = 65;

const AGE_MOD_YOUNG = -1;
const AGE_MOD_50 = 3;
const AGE_MOD_55 = 5;
const AGE_MOD_60 = 6;
const AGE_MOD_65 = 8;

const FOUNDER_MODIFIER = -2;
const OFFICER_MODIFIER = -1;
const RECENT_PROMOTION_MODIFIER = -1;

export function getFounderModifier(person: IPerson): number {
  return person.isFounder ? FOUNDER_MODIFIER : 0;
}

export function getRecentPromotionModifier(
  person: IPerson,
  campaign: ICampaign,
): number {
  if (!person.lastRankChangeDate) return 0;

  const now = campaign.currentDate;
  const promotionDate = person.lastRankChangeDate;

  const monthsDiff =
    (now.getFullYear() - promotionDate.getFullYear()) * 12 +
    (now.getMonth() - promotionDate.getMonth());

  return monthsDiff < MONTHS_FOR_RECENT_PROMOTION
    ? RECENT_PROMOTION_MODIFIER
    : 0;
}

// Uses recruitmentDate as birth date proxy until IPerson gains a birthDate field
function getPersonAge(person: IPerson, campaign: ICampaign): number {
  const now = campaign.currentDate;
  const birth = person.recruitmentDate;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function getAgeModifier(person: IPerson, campaign: ICampaign): number {
  const age = getPersonAge(person, campaign);

  if (age < AGE_THRESHOLD_YOUNG) return AGE_MOD_YOUNG;
  if (age >= AGE_THRESHOLD_65) return AGE_MOD_65;
  if (age >= AGE_THRESHOLD_60) return AGE_MOD_60;
  if (age >= AGE_THRESHOLD_55) return AGE_MOD_55;
  if (age >= AGE_THRESHOLD_50) return AGE_MOD_50;

  return 0;
}

export function getInjuryModifier(person: IPerson): number {
  return person.injuries.filter((injury) => injury.permanent).length;
}

export function getOfficerModifier(person: IPerson): number {
  return person.isCommander || person.isSecondInCommand
    ? OFFICER_MODIFIER
    : 0;
}

// TODO: Needs per-person contract term tracking to implement properly
export function getServiceContractModifier(_person: IPerson): number {
  return 0;
}

export function getSkillDesirabilityModifier(
  person: IPerson,
  _campaign: ICampaign,
): number {
  const gunnery = person.pilotSkills.gunnery;
  const piloting = person.pilotSkills.piloting;
  const avgSkill = (gunnery + piloting) / 2;

  // Lower skill values = better pilot = harder to lose (negative modifier)
  // MekHQ: elite (<=2) = -2, veteran (<=3) = -1, regular (4) = 0, green (>=5) = +1, ultra-green (>=7) = +2
  if (avgSkill <= 2) return -2;
  if (avgSkill <= 3) return -1;
  if (avgSkill <= 4) return 0;
  if (avgSkill <= 6) return 1;
  return 2;
}
