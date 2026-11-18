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
 * Apply auto-award grants to the canonical vault `IPilot.awards`, in memory
 * only. Returns the ids of the vault pilots that gained awards; the caller
 * persists them with `persistPilotAwards` once the grants stand.
 *
 * Council #2 ruling: vault is the single source of truth for awards. We
 * write directly to `usePilotStore` via `setState` (mirrors the pattern
 * used by `useCampaignRosterStore.applyPilotPatches`) so the change is
 * observable synchronously by selectors and tests.
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
function writeAwardGrants(
  campaign: ICampaign,
  grantEvents: IAwardGrantEvent[],
): readonly string[] {
  if (grantEvents.length === 0) return [];

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

  return [...grantsByPilotId.keys()];
}

/**
 * Persist the vault awards of `pilotIds` through the REST `updatePilot`
 * action (SQLite). Fire-and-forget: the in-memory vault is already right,
 * so a transient network failure does not regress the UI. Each PUT carries
 * the pilot's whole current awards array, so a repeat converges.
 *
 * Never call this from inside the day pipeline: a day that fails after it
 * would be rolled back in memory while the server kept the award, and the
 * PUT's reload would bring it back. The store calls `persistDayAwardGrants`
 * once the day stands.
 */
function persistPilotAwards(pilotIds: Iterable<string>): void {
  const pilotStore = usePilotStore.getState();
  for (const pilotId of new Set(pilotIds)) {
    const pilot = pilotStore.pilots.find((p) => p.id === pilotId);
    if (!pilot) continue;
    void pilotStore.updatePilot(pilotId, { awards: pilot.awards });
  }
}

/**
 * Persist the awards a day granted (its `award_granted` events). Called by
 * the store after the day's save, never by the pipeline.
 */
export function persistDayAwardGrants(events: readonly IDayEvent[]): void {
  const pilotIds: string[] = [];
  for (const event of events) {
    if (event.type !== 'award_granted') continue;
    const personId = event.data?.personId;
    if (typeof personId === 'string') pilotIds.push(personId);
  }
  persistPilotAwards(pilotIds);
}

/** Grant outside the day pipeline: write the vault, then persist at once. */
function applyAwardGrants(
  campaign: ICampaign,
  grantEvents: IAwardGrantEvent[],
): ICampaign {
  persistPilotAwards(writeAwardGrants(campaign, grantEvents));
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

    // In memory only: the store persists the grants (persistDayAwardGrants)
    // once the day is saved, so a failed day leaves nothing on the server.
    const grantEvents = processAutoAwards(campaign, 'monthly');
    writeAwardGrants(campaign, grantEvents);

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

    return { events: dayEvents, campaign };
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
