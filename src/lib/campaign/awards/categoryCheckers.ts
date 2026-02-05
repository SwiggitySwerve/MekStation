import { IAward } from '@/types/award/AwardInterfaces';
import { AutoAwardCategory } from '@/types/campaign/awards/autoAwardTypes';
import { IPerson } from '@/types/campaign/Person';

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
// =============================================================================

export function checkKillAwards(
  person: IPerson,
  awards: readonly IAward[],
): IAward[] {
  return getAwardsForCategory(awards, AutoAwardCategory.KILL).filter(
    (award) => person.totalKills >= award.autoGrantCriteria!.threshold,
  );
}

export function checkScenarioAwards(
  person: IPerson,
  awards: readonly IAward[],
): IAward[] {
  return getAwardsForCategory(awards, AutoAwardCategory.SCENARIO).filter(
    (award) => person.missionsCompleted >= award.autoGrantCriteria!.threshold,
  );
}

export function checkTimeAwards(
  person: IPerson,
  awards: readonly IAward[],
  context: ICheckerContext,
): IAward[] {
  const recruitDate =
    person.recruitmentDate instanceof Date
      ? person.recruitmentDate
      : new Date(person.recruitmentDate);
  const currentDate = new Date(context.currentDate);
  const yearsOfService =
    (currentDate.getTime() - recruitDate.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  return getAwardsForCategory(awards, AutoAwardCategory.TIME).filter(
    (award) => yearsOfService >= award.autoGrantCriteria!.threshold,
  );
}

export function checkSkillAwards(
  person: IPerson,
  awards: readonly IAward[],
): IAward[] {
  return getAwardsForCategory(awards, AutoAwardCategory.SKILL).filter(
    (award) => {
      const criteria = award.autoGrantCriteria!;
      const skillId = criteria.skillId;

      if (skillId === 'gunnery') {
        return person.pilotSkills.gunnery <= criteria.threshold;
      }
      if (skillId === 'piloting') {
        return person.pilotSkills.piloting <= criteria.threshold;
      }
      return (
        Math.min(person.pilotSkills.gunnery, person.pilotSkills.piloting) <=
        criteria.threshold
      );
    },
  );
}

export function checkRankAwards(
  person: IPerson,
  awards: readonly IAward[],
): IAward[] {
  return getAwardsForCategory(awards, AutoAwardCategory.RANK).filter(
    (award) => {
      const criteria = award.autoGrantCriteria!;
      const rankLevel = person.rankLevel ?? 0;
      const mode = criteria.rankMode ?? 'inclusive';

      if (mode === 'promotion') return rankLevel === criteria.threshold;
      if (mode === 'exclusive') return rankLevel > criteria.threshold;
      return rankLevel >= criteria.threshold;
    },
  );
}

export function checkInjuryAwards(
  person: IPerson,
  awards: readonly IAward[],
): IAward[] {
  return getAwardsForCategory(awards, AutoAwardCategory.INJURY).filter(
    (award) => person.injuries.length >= award.autoGrantCriteria!.threshold,
  );
}

// =============================================================================
// Stubbed Categories
// =============================================================================

export function checkContractAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkFactionHunterAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkTheatreOfWarAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkTrainingAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkScenarioKillAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkMiscAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkCombatAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkSurvivalAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkServiceAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkCampaignAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

export function checkSpecialAwards(
  _person: IPerson,
  _awards: readonly IAward[],
): IAward[] {
  return [];
}

// =============================================================================
// Master Dispatcher
// =============================================================================

export function checkAwardsForCategory(
  category: AutoAwardCategory,
  person: IPerson,
  awards: readonly IAward[],
  context: ICheckerContext,
): IAward[] {
  switch (category) {
    case AutoAwardCategory.KILL:
      return checkKillAwards(person, awards);
    case AutoAwardCategory.SCENARIO:
      return checkScenarioAwards(person, awards);
    case AutoAwardCategory.TIME:
      return checkTimeAwards(person, awards, context);
    case AutoAwardCategory.SKILL:
      return checkSkillAwards(person, awards);
    case AutoAwardCategory.RANK:
      return checkRankAwards(person, awards);
    case AutoAwardCategory.INJURY:
      return checkInjuryAwards(person, awards);
    case AutoAwardCategory.CONTRACT:
      return checkContractAwards(person, awards);
    case AutoAwardCategory.FACTION_HUNTER:
      return checkFactionHunterAwards(person, awards);
    case AutoAwardCategory.THEATRE_OF_WAR:
      return checkTheatreOfWarAwards(person, awards);
    case AutoAwardCategory.TRAINING:
      return checkTrainingAwards(person, awards);
    case AutoAwardCategory.SCENARIO_KILL:
      return checkScenarioKillAwards(person, awards);
    case AutoAwardCategory.MISC:
      return checkMiscAwards(person, awards);
    case AutoAwardCategory.COMBAT:
      return checkCombatAwards(person, awards);
    case AutoAwardCategory.SURVIVAL:
      return checkSurvivalAwards(person, awards);
    case AutoAwardCategory.SERVICE:
      return checkServiceAwards(person, awards);
    case AutoAwardCategory.CAMPAIGN:
      return checkCampaignAwards(person, awards);
    case AutoAwardCategory.SPECIAL:
      return checkSpecialAwards(person, awards);
    default:
      return [];
  }
}
