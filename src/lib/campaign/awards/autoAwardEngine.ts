import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
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
import { IPilot } from '@/types/pilot/PilotInterfaces';

import { checkAwardsForCategory, ICheckerContext } from './categoryCheckers';

// Dead statuses for posthumous check — mirrors CampaignPilotStatus dead variants
const DEAD_STATUSES = new Set<CampaignPilotStatus>([CampaignPilotStatus.KIA]);

function isDead(status: CampaignPilotStatus): boolean {
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

/**
 * Return roster entries eligible for auto-award evaluation.
 *
 * Reads directly from the roster store (PR3 task 5.5). pilotsByPilotId
 * is pre-joined once by the caller; NPCs whose pilotId has no vault
 * counterpart resolve to null (SKIP per Council #2 NPC matrix).
 *
 * Eligibility: active non-civilians + posthumous (KIA) if config enables it.
 *
 * @param entries - Roster entries from useCampaignRosterStore
 * @param pilotsByPilotId - Pre-joined vault lookup from buildPilotLookup
 * @param config - Auto-award configuration from campaign options
 */
export function getEligiblePersonnel(
  entries: ReadonlyArray<ICampaignRosterEntry>,
  pilotsByPilotId: ReadonlyMap<string, IPilot>,
  config: IAutoAwardConfig,
): ReadonlyArray<{ entry: ICampaignRosterEntry; pilot: IPilot | null }> {
  const pairs: Array<{ entry: ICampaignRosterEntry; pilot: IPilot | null }> =
    [];

  for (const entry of entries) {
    // Eligibility: active non-civilians + posthumous if enabled
    if (isDead(entry.status)) {
      if (!config.enablePosthumous) continue;
    } else {
      if (
        entry.status !== CampaignPilotStatus.Active ||
        isCivilianRole(entry.primaryRole)
      )
        continue;
    }

    const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;
    pairs.push({ entry, pilot });
  }

  return pairs;
}

/**
 * Process auto-awards for all eligible personnel.
 *
 * Reads entries from useCampaignRosterStore and vault from usePilotStore
 * (PR3 task 5.5). Builds the pilotsByPilotId lookup once to avoid O(N²).
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

  // Pre-join vault once per processor run (O(N) map build, O(1) lookups).
  // Per PR4 of `wire-iperson-hard-cutover`: roster store is the canonical
  // entry source — no personnel-Map fallback.
  const rosterEntries: readonly ICampaignRosterEntry[] =
    useCampaignRosterStore.getState().pilots;
  const vault = usePilotStore.getState().pilots;
  const pilotsByPilotId = buildPilotLookup(vault);

  const allAwards = getAutoGrantableAwards();
  const events: IAwardGrantEvent[] = [];
  const checkerContext: ICheckerContext = {
    currentDate:
      campaign.currentDate instanceof Date
        ? campaign.currentDate.toISOString()
        : String(campaign.currentDate),
  };

  for (const { entry, pilot } of getEligiblePersonnel(
    rosterEntries,
    pilotsByPilotId,
    config,
  )) {
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
