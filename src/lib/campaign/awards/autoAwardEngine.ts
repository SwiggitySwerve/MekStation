import { getAutoGrantableAwards } from '@/types/award/AwardCatalog';
import { IAward } from '@/types/award/AwardInterfaces';
import {
  AutoAwardCategory,
  AutoAwardTrigger,
  IAutoAwardConfig,
  IAwardGrantEvent,
} from '@/types/campaign/awards/autoAwardTypes';
import { ICampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import {
  CampaignPersonnelRole,
  isCivilianRole,
} from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { IPerson } from '@/types/campaign/Person';
import { IPilot } from '@/types/pilot/PilotInterfaces';

import { checkAwardsForCategory, ICheckerContext } from './categoryCheckers';

// Dead statuses for posthumous check — mirrors PersonnelStatus dead variants
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

/**
 * Check whether a pilot already has the given award.
 *
 * NPC behavior: SKIP — pilot===null means NPC with no vault identity;
 * treated as never having earned any award (vault-only per Council #2).
 *
 * @param pilot - vault pilot (PC) or null (NPC)
 * @param awardId - award definition ID to check
 */
function pilotHasAward(pilot: IPilot | null, awardId: string): boolean {
  if (pilot === null) return false; // NPCs never have vault awards
  // IPilot.awards is IPilotAward[] with awardId property (not a string[])
  return pilot.awards?.some((a) => a.awardId === awardId) ?? false;
}

function getBestAward(awards: IAward[]): IAward | undefined {
  if (awards.length === 0) return undefined;
  return awards.reduce((best, current) => {
    const bestThreshold = best.autoGrantCriteria?.threshold ?? 0;
    const currentThreshold = current.autoGrantCriteria?.threshold ?? 0;
    return currentThreshold > bestThreshold ? current : best;
  });
}

// ---------------------------------------------------------------------------
// Transitional bridge for PR2: synthesize a minimal ICampaignRosterEntry from
// an IPerson so the migrated award engine can be called against the legacy
// `campaign.personnel: Map<string, IPerson>` data source. PR3 repoints
// dayAdvancement to read entries directly from useCampaignRosterStore; PR4
// deletes the IPerson map entirely. Copied from financialProcessor.ts pattern.
// ---------------------------------------------------------------------------
function personToMinimalEntry(person: IPerson): ICampaignRosterEntry {
  return {
    pilotId: person.id,
    pilotName: person.name,
    status:
      person.status === PersonnelStatus.KIA
        ? CampaignPilotStatus.KIA
        : person.status === PersonnelStatus.WOUNDED
          ? CampaignPilotStatus.Wounded
          : person.status === PersonnelStatus.MIA
            ? CampaignPilotStatus.MIA
            : CampaignPilotStatus.Active,
    wounds: person.hits ?? 0,
    recoveryTime: person.daysToWaitForHealing ?? 0,
    xp: person.xp ?? 0,
    campaignXpEarned: person.totalXpEarned ?? 0,
    campaignKills: person.totalKills ?? 0,
    campaignMissions: person.missionsCompleted ?? 0,
    hireDate: person.recruitmentDate ?? new Date(0),
    primaryRole:
      (person.primaryRole as CampaignPersonnelRole) ??
      CampaignPersonnelRole.PILOT,
    rankIndex: person.rankIndex ?? 0,
    isFounder: person.isFounder,
    isCommander: person.isCommander,
  };
}

/**
 * Return roster entries eligible for auto-award evaluation.
 *
 * NPC behavior: SKIP — pilot is always null for entries synthesized from
 * legacy IPerson; checkAwardsForCategory short-circuits on pilot===null.
 * In PR3 when the roster store is live, NPC entries will also yield
 * pilot===null (no vault join), preserving the same skip behavior.
 *
 * @returns Joined pairs of entry + pilot (pilot is null in PR2 transitional state)
 */
export function getEligiblePersonnel(
  campaign: ICampaign,
  config: IAutoAwardConfig,
): ReadonlyArray<{ entry: ICampaignRosterEntry; pilot: IPilot | null }> {
  const pairs: Array<{ entry: ICampaignRosterEntry; pilot: IPilot | null }> =
    [];

  for (const person of Array.from(campaign.personnel.values())) {
    // Eligibility mirror: active non-civilians + posthumous if enabled
    if (isDead(person.status)) {
      if (!config.enablePosthumous) continue;
    } else {
      if (
        person.status !== PersonnelStatus.ACTIVE ||
        isCivilianRole(person.primaryRole)
      )
        continue;
    }

    const entry = personToMinimalEntry(person);
    // PR2 transitional: no vault join yet — pilots resolve to null.
    // PR3 will inject the pilotsByPilotId map from usePilotVaultStore.
    const pilot: IPilot | null = null;
    pairs.push({ entry, pilot });
  }

  return pairs;
}

/**
 * Process auto-awards for all eligible personnel.
 *
 * NPC behavior: SKIP — each category checker short-circuits when pilot===null.
 */
export function processAutoAwards(
  campaign: ICampaign,
  trigger: AutoAwardTrigger,
  _context?: { missionId?: string; scenarioId?: string },
): IAwardGrantEvent[] {
  const config = campaign.options.autoAwardConfig;
  if (!config?.enableAutoAwards) return [];

  const allAwards = getAutoGrantableAwards();
  const events: IAwardGrantEvent[] = [];
  const checkerContext: ICheckerContext = {
    currentDate:
      campaign.currentDate instanceof Date
        ? campaign.currentDate.toISOString()
        : String(campaign.currentDate),
  };

  for (const { entry, pilot } of getEligiblePersonnel(campaign, config)) {
    for (const category of Object.values(AutoAwardCategory)) {
      if (!config.enabledCategories[category]) continue;

      const categoryAwards = allAwards.filter(
        (a) => a.autoGrantCriteria?.category === category,
      );

      const qualifying = checkAwardsForCategory(
        category,
        entry,
        pilot,
        categoryAwards,
        checkerContext,
      );

      // Filter out already-earned non-stackable awards via vault pilot
      const newAwards = qualifying.filter(
        (award) =>
          award.autoGrantCriteria?.stackable || !pilotHasAward(pilot, award.id),
      );

      if (newAwards.length === 0) continue;

      // Best award only: keep highest threshold per category
      const toGrant = config.bestAwardOnly
        ? ([getBestAward(newAwards)].filter(Boolean) as IAward[])
        : newAwards;

      for (const award of toGrant) {
        events.push({
          personId: entry.pilotId,
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
