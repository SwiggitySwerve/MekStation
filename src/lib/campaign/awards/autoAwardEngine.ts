import { ICampaign } from '@/types/campaign/Campaign';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { isCivilianRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  AutoAwardCategory,
  AutoAwardTrigger,
  IAutoAwardConfig,
  IAwardGrantEvent,
} from '@/types/campaign/awards/autoAwardTypes';
import { IAward } from '@/types/award/AwardInterfaces';
import { getAutoGrantableAwards } from '@/types/award/AwardCatalog';
import { checkAwardsForCategory, ICheckerContext } from './categoryCheckers';

// Dead statuses for posthumous check
const DEAD_STATUSES = new Set<PersonnelStatus>([
  PersonnelStatus.KIA,
  PersonnelStatus.ACCIDENTAL_DEATH,
  PersonnelStatus.DISEASE,
  PersonnelStatus.NATURAL_CAUSES,
  PersonnelStatus.MURDER,
  PersonnelStatus.WOUNDS,
  PersonnelStatus.MIA_PRESUMED_DEAD,
  PersonnelStatus.OLD_AGE,
  PersonnelStatus.PREGNANCY_COMPLICATIONS,
  PersonnelStatus.UNDETERMINED,
  PersonnelStatus.MEDICAL_COMPLICATIONS,
  PersonnelStatus.SUICIDE,
  PersonnelStatus.EXECUTION,
  PersonnelStatus.MISSING_PRESUMED_DEAD,
]);

function isDead(status: PersonnelStatus): boolean {
  return DEAD_STATUSES.has(status);
}

function personHasAward(person: IPerson, awardId: string): boolean {
  return person.awards?.includes(awardId) ?? false;
}

function getBestAward(awards: IAward[]): IAward | undefined {
  if (awards.length === 0) return undefined;
  return awards.reduce((best, current) => {
    const bestThreshold = best.autoGrantCriteria?.threshold ?? 0;
    const currentThreshold = current.autoGrantCriteria?.threshold ?? 0;
    return currentThreshold > bestThreshold ? current : best;
  });
}

export function getEligiblePersonnel(campaign: ICampaign, config: IAutoAwardConfig): IPerson[] {
  return Array.from(campaign.personnel.values()).filter(p => {
    if (isDead(p.status)) return config.enablePosthumous;
    return p.status === PersonnelStatus.ACTIVE && !isCivilianRole(p.primaryRole);
  });
}

export function processAutoAwards(
  campaign: ICampaign,
  trigger: AutoAwardTrigger,
  _context?: { missionId?: string; scenarioId?: string }
): IAwardGrantEvent[] {
  const config = campaign.options.autoAwardConfig;
  if (!config?.enableAutoAwards) return [];

  const allAwards = getAutoGrantableAwards();
  const events: IAwardGrantEvent[] = [];
  const checkerContext: ICheckerContext = {
    currentDate: campaign.currentDate instanceof Date
      ? campaign.currentDate.toISOString()
      : String(campaign.currentDate),
  };

  for (const person of getEligiblePersonnel(campaign, config)) {
    for (const category of Object.values(AutoAwardCategory)) {
      if (!config.enabledCategories[category]) continue;

      const categoryAwards = allAwards.filter(
        a => a.autoGrantCriteria?.category === category
      );

      const qualifying = checkAwardsForCategory(
        category,
        person,
        categoryAwards,
        checkerContext
      );

      // Filter out already-earned non-stackable awards
      const newAwards = qualifying.filter(award =>
        award.autoGrantCriteria?.stackable || !personHasAward(person, award.id)
      );

      if (newAwards.length === 0) continue;

      // Best award only: keep highest threshold per category
      const toGrant = config.bestAwardOnly
        ? [getBestAward(newAwards)].filter(Boolean) as IAward[]
        : newAwards;

      for (const award of toGrant) {
        events.push({
          personId: person.id,
          awardId: award.id,
          awardName: award.name,
          category,
          trigger,
          timestamp: checkerContext.currentDate,
        });
      }
    }
  }

  return events;
}
