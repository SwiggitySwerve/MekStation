import { usePilotStore } from '@/stores/usePilotStore';
import { IPilotAward } from '@/types/award/AwardInterfaces';
import { IAwardGrantEvent } from '@/types/campaign/awards/autoAwardTypes';
import { ICampaign } from '@/types/campaign/Campaign';

import { processAutoAwards } from '../awards/autoAwardEngine';
import {
  IDayProcessor,
  IDayProcessorResult,
  IDayEvent,
  DayPhase,
  isFirstOfMonth,
} from '../dayPipeline';

/**
 * Apply auto-award grants to the canonical vault `IPilot.awards`.
 *
 * Council #2 ruling: vault is the single source of truth for awards. We
 * write directly to `usePilotStore` via `setState` (mirrors the pattern
 * used by `useCampaignRosterStore.applyPilotPatches`) so the change is
 * observable synchronously by selectors and tests; we then fire the REST
 * `updatePilot` action to persist the new awards to SQLite. The REST call
 * is fire-and-forget — the in-memory state is already correct, so a
 * transient network failure will not regress the day-tick UI banner.
 *
 * Idempotency: `processAutoAwards` already filters out non-stackable
 * awards a pilot already owns via `pilotHasAward(pilot, awardId)`, so a
 * second tick on the same date produces zero events for grants persisted
 * here.
 *
 * NPC behavior: vault-only persistence means roster-only NPCs (no vault
 * IPilot) silently skip — `processAutoAwards` already filters them out
 * (pilot===null path returns no qualifying awards), so `grantEvents` only
 * carries personIds that resolve to a vault entry. The `if (!pilot)
 * continue` guard below is defence-in-depth.
 *
 * Roster awards cache (per spec follow-up): NOT in scope. The vault is
 * canonical; ICampaignRosterEntry has no `awards` field today and adding
 * one would duplicate state.
 */
function applyAwardGrants(
  campaign: ICampaign,
  grantEvents: IAwardGrantEvent[],
): ICampaign {
  if (grantEvents.length === 0) return campaign;

  // Group new awards by personId so a pilot earning multiple awards in
  // one tick gets a single concatenated update (rather than N PUTs).
  const grantsByPilotId = new Map<string, IPilotAward[]>();
  for (const event of grantEvents) {
    const award: IPilotAward = {
      awardId: event.awardId,
      earnedAt: event.timestamp,
      context: { campaignId: campaign.id },
      timesEarned: 1,
    };
    const existing = grantsByPilotId.get(event.personId);
    if (existing) {
      existing.push(award);
    } else {
      grantsByPilotId.set(event.personId, [award]);
    }
  }

  // Synchronous in-memory write — observable immediately by selectors and
  // by the test suite. Pilots not present in the vault (NPC roster-only
  // entries) are skipped silently; the engine should have filtered these
  // out already.
  const now = new Date().toISOString();
  usePilotStore.setState((state) => ({
    pilots: state.pilots.map((p) => {
      const newAwards = grantsByPilotId.get(p.id);
      if (!newAwards) return p;
      return {
        ...p,
        awards: [...(p.awards ?? []), ...newAwards],
        updatedAt: now,
      };
    }),
  }));

  // Async fire-and-forget REST persistence. Snapshots the post-setState
  // state so the PUT body carries the merged awards array. We deliberately
  // do not await — the day pipeline is sync, and a SQLite hiccup must not
  // block the day tick.
  const pilotStore = usePilotStore.getState();
  grantsByPilotId.forEach((_newAwards, pilotId) => {
    const pilot = pilotStore.pilots.find((p) => p.id === pilotId);
    if (!pilot) return;
    void pilotStore.updatePilot(pilotId, { awards: pilot.awards });
  });

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
