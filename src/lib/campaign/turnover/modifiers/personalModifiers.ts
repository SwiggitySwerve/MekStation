import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

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

/**
 * Returns -2 if the roster entry is a founder, 0 otherwise.
 *
 * NPC behavior: PROCESS — departure rolls apply to everyone; founder flag
 * lives on the roster entry so NPCs with `isFounder` set are treated
 * identically to PCs.
 */
export function getFounderModifier(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  return entry.isFounder ? FOUNDER_MODIFIER : 0;
}

/**
 * Returns -1 if the entry was promoted within the last 6 months, 0 otherwise.
 *
 * NPC behavior: PROCESS — `lastPromotionDate` lives on the roster entry so
 * this modifier fires for NPCs and PCs alike.
 */
export function getRecentPromotionModifier(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  campaign: ICampaign,
): number {
  if (!entry.lastPromotionDate) return 0;

  const now = campaign.currentDate;
  const promotionDate = entry.lastPromotionDate;

  const monthsDiff =
    (now.getFullYear() - promotionDate.getFullYear()) * 12 +
    (now.getMonth() - promotionDate.getMonth());

  return monthsDiff < MONTHS_FOR_RECENT_PROMOTION
    ? RECENT_PROMOTION_MODIFIER
    : 0;
}

/**
 * Derives approximate age using `entry.hireDate` as a birth-date proxy.
 *
 * A proper `dateOfBirth` field on `ICampaignRosterEntry` or the vault
 * pilot is the long-term fix; deferred until pilot identity data is
 * fuller.
 */
function getPersonAge(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  campaign: ICampaign,
): number {
  const now = campaign.currentDate;
  // Use hireDate as birth-date proxy.
  const birth = entry.hireDate;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Returns an age-based modifier per MekHQ bracket thresholds.
 *
 * NPC behavior: PROCESS — `hireDate` is always present on roster entries
 * (required field per PR2 cluster J) so age can be derived for both
 * NPCs and PCs.
 */
export function getAgeModifier(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  campaign: ICampaign,
): number {
  const age = getPersonAge(entry, pilot, campaign);

  if (age < AGE_THRESHOLD_YOUNG) return AGE_MOD_YOUNG;
  if (age >= AGE_THRESHOLD_65) return AGE_MOD_65;
  if (age >= AGE_THRESHOLD_60) return AGE_MOD_60;
  if (age >= AGE_THRESHOLD_55) return AGE_MOD_55;
  if (age >= AGE_THRESHOLD_50) return AGE_MOD_50;

  return 0;
}

/**
 * Returns the number of permanent injuries the entry carries.
 *
 * NPC behavior: PROCESS — injuries live on the roster entry so NPCs and PCs
 * are treated identically.
 */
export function getInjuryModifier(
  entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  return (entry.injuries ?? []).filter((injury) => injury.permanent).length;
}

/**
 * Returns -1 if the entry is an officer (commander flag set), 0 otherwise.
 *
 * NPC behavior: SKIP — NPCs do not hold officer rank; early-returns 0 when
 * `pilot` is null. PC officer status is read from `entry.isCommander`.
 *
 * Note: `isSecondInCommand` is not yet on `ICampaignRosterEntry`; the
 * transitional bridge effectively only propagates `isCommander`. Full
 * two-flag support lands when `isSecondInCommand` is added to the roster
 * entry schema. For now NPCs with `pilot === null` return 0, and the
 * commander flag on the entry is the sole officer discriminator.
 *
 * `rankService.isOfficer` migrated in commit 2.6 and now accepts the two-arg
 * `(entry, pilot, rankSystem)` signature. A follow-up can replace
 * `entry.isCommander` here with `isOfficerByIndex(entry.rankIndex, rankSystem)`
 * once `rankSystem` is threaded into the turnover modifier pipeline.
 */
export function getOfficerModifier(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
): number {
  // Officer status is vault-only — skip for NPCs
  if (pilot === null) return 0;

  // Use commander flag on entry as officer discriminator (transitional).
  // `isSecondInCommand` is not yet on ICampaignRosterEntry; entry.isCommander
  // is the only available officer flag until commit 2.6.
  return entry.isCommander ? OFFICER_MODIFIER : 0;
}

/**
 * Service contract modifier — currently a no-op.
 *
 * Deferred(person-contract-tracking): MekHQ applies a turnover modifier when a
 * personnel contract is approaching expiry (typically `-1` if < 6 months
 * left, `+2` once expired). Implementing this requires `ICampaignRosterEntry`
 * to grow `serviceContractEnd: Date`. When that field lands, switch this
 * body to compare `campaign.currentDate` against `entry.serviceContractEnd`
 * and return the corresponding modifier per MekHQ's
 * `Personnel#getServiceContractModifier`.
 *
 * NPC behavior: PROCESS — once contract tracking lands, NPCs and PCs follow
 * the same modifier logic (both carry roster-entry-level service contracts).
 */
export function getServiceContractModifier(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
): number {
  return 0;
}

/**
 * Returns a skill-desirability modifier based on the pilot's average gunnery/piloting.
 *
 * NPC behavior: PROCESS — statblock gunnery/piloting values are used for NPCs
 * (`pilot === null`); defaults to 4/5 (regular baseline) when neither vault
 * pilot nor statblock carries skill data.
 */
export function getSkillDesirabilityModifier(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _campaign: ICampaign,
): number {
  // Prefer vault skills for PCs; fall back to statblock for NPCs; then default
  const gunnery = pilot?.skills.gunnery ?? entry.statblockData?.gunnery ?? 4;
  const piloting = pilot?.skills.piloting ?? entry.statblockData?.piloting ?? 5;
  const avgSkill = (gunnery + piloting) / 2;

  // Lower skill values = better pilot = harder to lose (negative modifier)
  // MekHQ: elite (<=2) = -2, veteran (<=3) = -1, regular (4) = 0, green (>=5) = +1, ultra-green (>=7) = +2
  if (avgSkill <= 2) return -2;
  if (avgSkill <= 3) return -1;
  if (avgSkill <= 4) return 0;
  if (avgSkill <= 6) return 1;
  return 2;
}
