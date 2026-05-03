import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { IAwardGrantEvent } from '@/types/campaign/awards/autoAwardTypes';
import { ICampaign } from '@/types/campaign/Campaign';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { processAutoAwards } from '../awards/autoAwardEngine';
import {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
  DayPhase,
  isFirstOfMonth,
} from '../dayPipeline';

/**
 * Apply auto-award grants to the roster store.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: writes campaign-scoped award
 * grants as roster patches via `applyPilotPatches`. The personnel Map is
 * gone. Note: campaign-scoped awards are stored on the vault `IPilot.awards`
 * for PCs (the canonical home); this processor's grant log is the audit
 * trail and any roster-level cache. ICampaignRosterEntry has no `awards`
 * field today, so we record the grant only via the `IDayEvent` chain.
 * Future-state: a `campaignAwards: readonly string[]` field on the entry
 * would back per-campaign award persistence (deferred — see ADR).
 */
function applyAwardGrants(
  campaign: ICampaign,
  grantEvents: IAwardGrantEvent[],
): ICampaign {
  if (grantEvents.length === 0) return campaign;

  // ICampaignRosterEntry does not currently carry an `awards` field — the
  // canonical award store is the vault `IPilot.awards`. We emit no patches
  // here today (the grant lives on the IDayEvent and any external sink).
  // The block stays so future award-persistence on the entry can plug in
  // without changing the call shape.
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();
  void grantEvents;
  if (patches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(patches);
  }

  return campaign;
}

export const autoAwardsProcessor: IDayProcessor = {
  id: 'auto-awards',
  phase: DayPhase.PERSONNEL,
  displayName: 'Auto Awards',
  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    if (!isFirstOfMonth(date)) {
      return { events: [], campaign };
    }

    const grantEvents = processAutoAwards(campaign, 'monthly');
    const updatedCampaign = applyAwardGrants(campaign, grantEvents);

    const dayEvents: IDayEvent[] = grantEvents.map((event) => ({
      type: 'award_granted',
      description: `${event.awardName} awarded to personnel ${event.personId}`,
      severity: 'info' as const,
      data: {
        personId: event.personId,
        awardId: event.awardId,
        awardName: event.awardName,
        category: event.category,
      },
    }));

    return { events: dayEvents, campaign: updatedCampaign };
  },
};

export function processPostMissionAwards(
  campaign: ICampaign,
  _missionId: string,
): { updatedCampaign: ICampaign; events: IAwardGrantEvent[] } {
  const events = processAutoAwards(campaign, 'post_mission');
  const updatedCampaign = applyAwardGrants(campaign, events);
  return { updatedCampaign, events };
}

export function processPostScenarioAwards(
  campaign: ICampaign,
  _scenarioId: string,
): { updatedCampaign: ICampaign; events: IAwardGrantEvent[] } {
  const events = processAutoAwards(campaign, 'post_scenario');
  const updatedCampaign = applyAwardGrants(campaign, events);
  return { updatedCampaign, events };
}
