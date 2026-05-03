import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

/**
 * @stub Needs fatigue system.
 *
 * NPC behavior: PROCESS — fatigue will be tracked on the roster entry when
 * implemented, so NPCs and PCs will be treated identically.
 */
export function getFatigueModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
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

/**
 * @stub Needs shares system.
 *
 * NPC behavior: PROCESS — shares are campaign-employment-scoped; once
 * implemented this will fire for both NPCs and PCs.
 */
export function getSharesModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
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

/**
 * @stub Needs loyalty system.
 *
 * NPC behavior: PROCESS — loyalty is campaign-employment-scoped; once
 * implemented this will fire for both NPCs and PCs.
 */
export function getLoyaltyModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  return 0;
}

/** @stub Needs faction standing */
export function getFactionCampaignModifier(_campaign: ICampaign): number {
  return 0;
}

/**
 * @stub Needs faction data.
 *
 * NPC behavior: PROCESS — faction origin is per-entry once implemented.
 */
export function getFactionOriginModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  return 0;
}

/**
 * @stub Needs family system.
 *
 * NPC behavior: PROCESS — family connections are per-entry once implemented.
 */
export function getFamilyModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  _campaign: ICampaign,
): number {
  return 0;
}
