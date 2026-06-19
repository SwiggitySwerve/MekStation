import { IAward } from '@/types/award/AwardInterfaces';
import { AutoAwardCategory } from '@/types/campaign/awards/autoAwardTypes';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { IPilot } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Checker Context
// =============================================================================

export interface ICheckerContext {
  readonly currentDate: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getAwardsForCategory(
  awards: readonly IAward[],
  category: AutoAwardCategory,
): IAward[] {
  return awards.filter((a) => a.autoGrantCriteria?.category === category);
}

// =============================================================================
// Category Checkers
//
// NPC behavior for all checkers: SKIP — pilot===null means no vault identity;
// awards are vault-only per Council #2 NPC domain matrix.
// =============================================================================

/**
 * Check awards gated on total kill count.
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (provides campaignKills)
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 */
export function checkKillAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  return getAwardsForCategory(awards, AutoAwardCategory.KILL).filter(
    (award) => entry.campaignKills >= award.autoGrantCriteria!.threshold,
  );
}

/**
 * Check awards gated on total missions completed.
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (provides campaignMissions)
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 */
export function checkScenarioAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  return getAwardsForCategory(awards, AutoAwardCategory.SCENARIO).filter(
    (award) => entry.campaignMissions >= award.autoGrantCriteria!.threshold,
  );
}

/**
 * Check awards gated on years of service since hire date.
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (provides hireDate)
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 * @param context - checker context with currentDate
 */
export function checkTimeAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
  context: ICheckerContext,
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  const hireDate =
    entry.hireDate instanceof Date ? entry.hireDate : new Date(entry.hireDate);
  const currentDate = new Date(context.currentDate);
  const yearsOfService =
    (currentDate.getTime() - hireDate.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  return getAwardsForCategory(awards, AutoAwardCategory.TIME).filter(
    (award) => yearsOfService >= award.autoGrantCriteria!.threshold,
  );
}

/**
 * Check awards gated on combat skill level (gunnery/piloting).
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (not used for skills; pilot is required)
 * @param pilot - vault pilot providing skills or null for NPCs
 * @param awards - awards pool to evaluate
 */
export function checkSkillAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  return getAwardsForCategory(awards, AutoAwardCategory.SKILL).filter(
    (award) => {
      const criteria = award.autoGrantCriteria!;
      const skillId = criteria.skillId;

      if (skillId === 'gunnery') {
        return pilot.skills.gunnery <= criteria.threshold;
      }
      if (skillId === 'piloting') {
        return pilot.skills.piloting <= criteria.threshold;
      }
      // Generic skill award: use the better of the two combat skills
      return (
        Math.min(pilot.skills.gunnery, pilot.skills.piloting) <=
        criteria.threshold
      );
    },
  );
}

/**
 * Check awards gated on numeric rank index.
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (provides rankIndex)
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 */
export function checkRankAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  return getAwardsForCategory(awards, AutoAwardCategory.RANK).filter(
    (award) => {
      const criteria = award.autoGrantCriteria!;
      const rankLevel = entry.rankIndex ?? 0;
      const mode = criteria.rankMode ?? 'inclusive';

      if (mode === 'promotion') return rankLevel === criteria.threshold;
      if (mode === 'exclusive') return rankLevel > criteria.threshold;
      return rankLevel >= criteria.threshold;
    },
  );
}

/**
 * Check awards gated on accumulated injury count.
 *
 * NPC behavior: SKIP — pilot===null → ineligible (vault-only).
 *
 * @param entry - campaign roster entry (provides injuries array)
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 */
export function checkInjuryAwards(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return []; // NPCs ineligible for vault-awards
  const injuries = entry.injuries ?? [];
  return getAwardsForCategory(awards, AutoAwardCategory.INJURY).filter(
    (award) => injuries.length >= award.autoGrantCriteria!.threshold,
  );
}

// =============================================================================
// Stubbed Categories
//
// NPC behavior: SKIP — pilot===null → ineligible (vault-only).
// All stubs return [] regardless; early-return added for consistency.
// =============================================================================

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkContractAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkFactionHunterAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkTheatreOfWarAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkTrainingAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkScenarioKillAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkMiscAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkCombatAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkSurvivalAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkServiceAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkCampaignAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

/** @param _entry - unused; @param pilot - null for NPCs → SKIP */
export function checkSpecialAwards(
  _entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  _awards: readonly IAward[],
): IAward[] {
  if (pilot === null) return [];
  return [];
}

// =============================================================================
// Master Dispatcher
// =============================================================================

type AwardCategoryChecker = (
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
  context: ICheckerContext,
) => IAward[];

const AWARD_CATEGORY_CHECKERS: Readonly<
  Partial<Record<AutoAwardCategory, AwardCategoryChecker>>
> = {
  [AutoAwardCategory.KILL]: (entry, pilot, awards) =>
    checkKillAwards(entry, pilot, awards),
  [AutoAwardCategory.SCENARIO]: (entry, pilot, awards) =>
    checkScenarioAwards(entry, pilot, awards),
  [AutoAwardCategory.TIME]: checkTimeAwards,
  [AutoAwardCategory.SKILL]: (entry, pilot, awards) =>
    checkSkillAwards(entry, pilot, awards),
  [AutoAwardCategory.RANK]: (entry, pilot, awards) =>
    checkRankAwards(entry, pilot, awards),
  [AutoAwardCategory.INJURY]: (entry, pilot, awards) =>
    checkInjuryAwards(entry, pilot, awards),
  [AutoAwardCategory.CONTRACT]: (entry, pilot, awards) =>
    checkContractAwards(entry, pilot, awards),
  [AutoAwardCategory.FACTION_HUNTER]: (entry, pilot, awards) =>
    checkFactionHunterAwards(entry, pilot, awards),
  [AutoAwardCategory.THEATRE_OF_WAR]: (entry, pilot, awards) =>
    checkTheatreOfWarAwards(entry, pilot, awards),
  [AutoAwardCategory.TRAINING]: (entry, pilot, awards) =>
    checkTrainingAwards(entry, pilot, awards),
  [AutoAwardCategory.SCENARIO_KILL]: (entry, pilot, awards) =>
    checkScenarioKillAwards(entry, pilot, awards),
  [AutoAwardCategory.MISC]: (entry, pilot, awards) =>
    checkMiscAwards(entry, pilot, awards),
  [AutoAwardCategory.COMBAT]: (entry, pilot, awards) =>
    checkCombatAwards(entry, pilot, awards),
  [AutoAwardCategory.SURVIVAL]: (entry, pilot, awards) =>
    checkSurvivalAwards(entry, pilot, awards),
  [AutoAwardCategory.SERVICE]: (entry, pilot, awards) =>
    checkServiceAwards(entry, pilot, awards),
  [AutoAwardCategory.CAMPAIGN]: (entry, pilot, awards) =>
    checkCampaignAwards(entry, pilot, awards),
  [AutoAwardCategory.SPECIAL]: (entry, pilot, awards) =>
    checkSpecialAwards(entry, pilot, awards),
};

/**
 * Route an award category to its checker function.
 *
 * NPC behavior: SKIP — pilot===null causes all checkers to return [].
 *
 * @param category - award category to check
 * @param entry - campaign roster entry
 * @param pilot - vault pilot or null for NPCs
 * @param awards - awards pool to evaluate
 * @param context - checker context with currentDate
 */
export function checkAwardsForCategory(
  category: AutoAwardCategory,
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  awards: readonly IAward[],
  context: ICheckerContext,
): IAward[] {
  return (
    AWARD_CATEGORY_CHECKERS[category]?.(entry, pilot, awards, context) ?? []
  );
}
