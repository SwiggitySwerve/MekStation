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
  switch (category) {
    case AutoAwardCategory.KILL:
      return checkKillAwards(entry, pilot, awards);
    case AutoAwardCategory.SCENARIO:
      return checkScenarioAwards(entry, pilot, awards);
    case AutoAwardCategory.TIME:
      return checkTimeAwards(entry, pilot, awards, context);
    case AutoAwardCategory.SKILL:
      return checkSkillAwards(entry, pilot, awards);
    case AutoAwardCategory.RANK:
      return checkRankAwards(entry, pilot, awards);
    case AutoAwardCategory.INJURY:
      return checkInjuryAwards(entry, pilot, awards);
    case AutoAwardCategory.CONTRACT:
      return checkContractAwards(entry, pilot, awards);
    case AutoAwardCategory.FACTION_HUNTER:
      return checkFactionHunterAwards(entry, pilot, awards);
    case AutoAwardCategory.THEATRE_OF_WAR:
      return checkTheatreOfWarAwards(entry, pilot, awards);
    case AutoAwardCategory.TRAINING:
      return checkTrainingAwards(entry, pilot, awards);
    case AutoAwardCategory.SCENARIO_KILL:
      return checkScenarioKillAwards(entry, pilot, awards);
    case AutoAwardCategory.MISC:
      return checkMiscAwards(entry, pilot, awards);
    case AutoAwardCategory.COMBAT:
      return checkCombatAwards(entry, pilot, awards);
    case AutoAwardCategory.SURVIVAL:
      return checkSurvivalAwards(entry, pilot, awards);
    case AutoAwardCategory.SERVICE:
      return checkServiceAwards(entry, pilot, awards);
    case AutoAwardCategory.CAMPAIGN:
      return checkCampaignAwards(entry, pilot, awards);
    case AutoAwardCategory.SPECIAL:
      return checkSpecialAwards(entry, pilot, awards);
    default:
      return [];
  }
}
