/**
 * Tests for `CampaignMatchHost` — validate / commit / broadcast (CO1,
 * task 3.5).
 *
 * Covers: a valid intent commits an event and broadcasts it; an
 * over-balance spend is rejected and mutates nothing; a rejected intent
 * leaves the session open for retry; a stale-mirror intent is validated
 * against host state.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-host';
const HOST_ID = 'host-player';

function stateWith(
  patch: Partial<ICampaignAuthoritativeState>,
): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), ...patch };
}

function makeHost(initialState: ICampaignAuthoritativeState): {
  host: CampaignMatchHost;
  received: ICampaignEvent[];
} {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState,
  });
  const received: ICampaignEvent[] = [];
  host.subscribe((event) => received.push(event));
  return { host, received };
}

describe('CampaignMatchHost — open', () => {
  it('commits a CampaignSnapshotPublished baseline as sequence 0', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('CampaignSnapshotPublished');
    expect(received[0].sequence).toBe(0);
  });

  it('open is idempotent', async () => {
    const { host, received } = makeHost(stateWith({}));
    await host.open();
    await host.open();
    expect(received).toHaveLength(1);
  });
});

describe('CampaignMatchHost — valid intent', () => {
  it('commits a FundsChanged event and broadcasts it', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-1',
      payload: { amount: 100_000, reason: 'Ammo' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('FundsChanged');
    }
    // Broadcast — the subscriber saw the event.
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('FundsChanged');
    // Authoritative state advanced.
    expect(host.getState().balance).toBe(500_000);
  });

  it('a hire commits FundsChanged + PilotHired in order', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'HirePilot',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-hire',
      payload: {
        pilot: { pilotId: 'p1', name: 'Pilot One' },
        cost: 75_000,
      },
    });

    expect(result.ok).toBe(true);
    expect(received.map((e) => e.type)).toEqual(['FundsChanged', 'PilotHired']);
    // Consecutive gap-free sequences.
    expect(received[1].sequence - received[0].sequence).toBe(1);
    expect(host.getState().balance).toBe(525_000);
    expect(host.getState().pilots.p1).toBeDefined();
  });

  it('AdvanceDay commits a CampaignDayAdvanced event', async () => {
    const { host } = makeHost(stateWith({ day: 3 }));
    await host.open();
    const result = await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-day',
      payload: {},
    });
    expect(result.ok).toBe(true);
    expect(host.getState().day).toBe(4);
  });
});

describe('CampaignMatchHost — rejected intent', () => {
  it('an over-balance spend is rejected and mutates nothing', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-over',
      payload: { amount: 700_000, reason: 'Too much' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_CAMPAIGN_INTENT');
      expect(result.reason).toBe('insufficient-funds');
    }
    // No event committed, balance unchanged.
    expect(received).toHaveLength(0);
    expect(host.getState().balance).toBe(600_000);
  });

  it('a malformed intent is rejected with malformed-intent', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    const result = await host.handleIntent({ kind: 'NotAKind' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('malformed-intent');
    }
  });

  it('a contract intent is rejected when standing is below the minimum', async () => {
    const { host } = makeHost(stateWith({ factionStanding: { kurita: -5 } }));
    await host.open();
    const result = await host.handleIntent({
      kind: 'AcceptContract',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-contract',
      payload: {
        contract: {
          contractId: 'c1',
          name: 'Hostile contract',
          employerFactionId: 'kurita',
        },
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient-standing');
    }
  });

  it('an over-pool salvage allocation is rejected', async () => {
    const { host } = makeHost(stateWith({ salvagePool: 100_000 }));
    await host.open();
    const result = await host.handleIntent({
      kind: 'AllocateSalvage',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-salvage',
      payload: { value: 250_000 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient-salvage');
    }
  });

  it('a rejected intent leaves the session open for retry', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();

    const rejected = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-over',
      payload: { amount: 700_000, reason: 'Too much' },
    });
    expect(rejected.ok).toBe(false);
    expect(host.isClosed()).toBe(false);

    // The guest corrects and retries with an in-balance amount.
    const retried = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-corrected',
      payload: { amount: 100_000, reason: 'Corrected' },
    });
    expect(retried.ok).toBe(true);
    expect(host.getState().balance).toBe(500_000);
  });

  it('an intent is rejected against the host state, not a stale-mirror balance', async () => {
    // Host starts at 600k; a prior spend takes it to 100k.
    const { host } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-first',
      payload: { amount: 500_000, reason: 'Big purchase' },
    });
    expect(host.getState().balance).toBe(100_000);

    // The guest's mirror still shows 600k; it sends a 300k spend that
    // fits the stale view but not the current authoritative balance.
    const staleIntent = await host.handleIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-stale',
      payload: { amount: 300_000, reason: 'Stale-mirror spend' },
    });
    expect(staleIntent.ok).toBe(false);
    if (!staleIntent.ok) {
      expect(staleIntent.reason).toBe('insufficient-funds');
    }
    expect(host.getState().balance).toBe(100_000);
  });

  it('a closed host rejects every intent with session-closed', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    host.close();
    const result = await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-after-close',
      payload: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('session-closed');
    }
  });

  it('toIntentError stamps the originating intentId on a rejection', () => {
    const error = CampaignMatchHost.toIntentError('intent-x', {
      ok: false,
      code: 'INVALID_CAMPAIGN_INTENT',
      reason: 'insufficient-funds',
    });
    expect(error.intentId).toBe('intent-x');
    expect(error.reason).toBe('insufficient-funds');
  });
});

describe('CampaignMatchHost — campaign mismatch', () => {
  it('rejects an intent targeting a different campaign', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    const result = await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: 'some-other-campaign',
      intentId: 'intent-mismatch',
      payload: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('campaign-mismatch');
    }
  });
});
