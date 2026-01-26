import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';

/** @stub Needs fatigue system */
export function getFatigueModifier(_person: IPerson): number {
  return 0;
}

/** @stub Needs admin skill tracking */
export function getHRStrainModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Needs leadership skill */
export function getManagementSkillModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Needs shares system */
export function getSharesModifier(
  _person: IPerson,
  _campaign: ICampaign,
): number {
  return 0;
}

/** @stub Needs Dragoon rating */
export function getUnitRatingModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Needs territory tracking */
export function getHostileTerritoryModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Needs loyalty system */
export function getLoyaltyModifier(_person: IPerson): number {
  return 0;
}

/** @stub Needs faction standing */
export function getFactionCampaignModifier(_campaign: ICampaign): number {
  return 0;
}

/** @stub Needs faction data */
export function getFactionOriginModifier(_person: IPerson): number {
  return 0;
}

/** @stub Needs family system */
export function getFamilyModifier(
  _person: IPerson,
  _campaign: ICampaign,
): number {
  return 0;
}
