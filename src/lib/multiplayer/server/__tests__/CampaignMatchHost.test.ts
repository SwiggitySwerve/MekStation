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

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type {
  IAuthoritativeContractOffer,
  IAuthoritativePersonnelOffer,
  ICampaignIntentContext,
} from '@/lib/multiplayer/server/CampaignMatchHostIntent';
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

/** The market's record of one recruit, as the authoritative source holds it. */
const AUTHORITATIVE_OFFER: IAuthoritativePersonnelOffer = {
  offerId: 'offer-1',
  name: 'Pilot One',
  hireCost: 75_000,
  expirationDate: '3025-01-10',
  campaignDate: '3025-01-03',
};

/** The market's record of one contract, as the authoritative source holds it. */
const AUTHORITATIVE_CONTRACT: IAuthoritativeContractOffer = {
  contractId: 'contract-1',
  name: 'Garrison Duty',
  employerFactionId: 'davion',
  declined: false,
  endDate: '3025-06-30',
  campaignDate: '3025-01-03',
};

/** A host market holding exactly `contracts`. */
function contractMarket(
  ...contracts: IAuthoritativeContractOffer[]
): ICampaignIntentContext {
  return {
    contractOffer: (contractId) =>
      contracts.find((one) => one.contractId === contractId) ?? null,
  };
}

/**
 * An AcceptContract whose payload describes a DIFFERENT contract than the
 * market holds, so anything derived from the payload is visible.
 */
function acceptContract(contractId: string) {
  return {
    kind: 'AcceptContract' as const,
    campaignId: CAMPAIGN_ID,
    intentId: `intent-accept-${contractId}`,
    payload: {
      contract: {
        contractId,
        name: 'CALLER SUPPLIED NAME',
        employerFactionId: 'caller-supplied-employer',
      },
    },
  };
}

function hireOffer(offerId: string) {
  return {
    kind: 'HireOffer' as const,
    campaignId: CAMPAIGN_ID,
    intentId: `intent-hire-${offerId}`,
    payload: { offerId },
  };
}

function makeHost(
  initialState: ICampaignAuthoritativeState,
  intentContext?: ICampaignIntentContext,
): {
  host: CampaignMatchHost;
  received: ICampaignEvent[];
} {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState,
    ...(intentContext === undefined ? {} : { intentContext }),
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

describe('CampaignMatchHost — guest-authored RemoveParticipant (9.3)', () => {
  it('rejects a guest-authored removal as host-only, appending nothing', async () => {
    // handleIntent is the GUEST-facing path - the transport-layer
    // AUTH_REJECTED guard never runs here, so this row is the one that
    // proves the VALIDATOR refuses a removal authored by anyone but the
    // host. Without it the validator guard is unreachable by any test:
    // the reviewer's guard-removal mutant survived until this row.
    const { host, received } = makeHost(stateWith({}));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'RemoveParticipant',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-remove-guest',
      payload: { participantId: 'pid_other', reason: 'guest tries' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('host-only');
    }
    expect(received).toHaveLength(0);
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

  it('a hire commits FundsChanged + PilotHired in order, derived from the authoritative offer', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }), {
      personnelOffer: (offerId) =>
        offerId === 'offer-1' ? AUTHORITATIVE_OFFER : null,
    });
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'HireOffer',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-hire',
      payload: { offerId: 'offer-1' },
    });

    expect(result.ok).toBe(true);
    expect(received.map((e) => e.type)).toEqual(['FundsChanged', 'PilotHired']);
    // Consecutive gap-free sequences.
    expect(received[1].sequence - received[0].sequence).toBe(1);
    expect(received[1].payload).toStrictEqual({
      pilot: { pilotId: 'hired-offer-1', name: 'Pilot One' },
      cost: 75_000,
    });
    expect(host.getState().balance).toBe(525_000);
    expect(host.getState().pilots['hired-offer-1']).toBeDefined();
  });

  // K14b: the guest used to invent the recruit and its cost. A HirePilot
  // names both, so it is refused on every path, never trusted.
  it('refuses a HirePilot outright, committing nothing', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }), {
      personnelOffer: () => AUTHORITATIVE_OFFER,
    });
    await host.open();
    received.length = 0;

    const result = await host.handleIntent({
      kind: 'HirePilot',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-forged-hire',
      payload: { pilot: { pilotId: 'p1', name: 'Forged' }, cost: 0 },
    });

    expect(result).toStrictEqual({
      ok: false,
      code: 'INVALID_CAMPAIGN_INTENT',
      reason: 'hire-requires-market-offer',
    });
    expect(received).toHaveLength(0);
    expect(host.getState().balance).toBe(600_000);
  });

  it('refuses a HireOffer when the host has no authoritative market to read', async () => {
    const { host, received } = makeHost(stateWith({ balance: 600_000 }));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent(hireOffer('offer-1'));

    expect(result).toMatchObject({
      ok: false,
      reason: 'offer-source-unavailable',
    });
    expect(received).toHaveLength(0);
  });

  it.each([
    ['an unknown offer', 'offer-404', 600_000, 'offer-not-found'],
    ['an expired offer', 'offer-expired', 600_000, 'offer-expired'],
    ['an unaffordable offer', 'offer-1', 74_999, 'insufficient-funds'],
  ])(
    'refuses %s, committing nothing',
    async (_label, offerId, balance, reason) => {
      const { host, received } = makeHost(stateWith({ balance }), {
        personnelOffer: (id) =>
          id === 'offer-1'
            ? AUTHORITATIVE_OFFER
            : id === 'offer-expired'
              ? {
                  ...AUTHORITATIVE_OFFER,
                  offerId: id,
                  expirationDate: '3025-01-02',
                }
              : null,
      });
      await host.open();
      received.length = 0;

      const result = await host.handleIntent(hireOffer(offerId));

      expect(result).toMatchObject({ ok: false, reason });
      expect(received).toHaveLength(0);
      expect(host.getState().balance).toBe(balance);
    },
  );

  it('hires an offer on its last day', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }), {
      personnelOffer: () => ({
        ...AUTHORITATIVE_OFFER,
        expirationDate: '3025-01-03',
      }),
    });
    await host.open();

    expect((await host.handleIntent(hireOffer('offer-1'))).ok).toBe(true);
  });

  it('refuses a second hire of a consumed offer', async () => {
    const { host } = makeHost(stateWith({ balance: 600_000 }), {
      personnelOffer: () => AUTHORITATIVE_OFFER,
    });
    await host.open();
    expect((await host.handleIntent(hireOffer('offer-1'))).ok).toBe(true);

    const second = await host.handleIntent({
      ...hireOffer('offer-1'),
      intentId: 'intent-hire-again',
    });

    expect(second).toMatchObject({ ok: false, reason: 'offer-consumed' });
    expect(host.getState().balance).toBe(525_000);
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

describe('CampaignMatchHost — stable client intent identity', () => {
  it('replays an applyHostIntent retry without appending, applying, or broadcasting again', async () => {
    const { host, received } = makeHost(stateWith({ day: 3 }));
    await host.open();
    received.length = 0;
    const intent = {
      kind: 'AdvanceDay' as const,
      campaignId: CAMPAIGN_ID,
      intentId: 'host-advance-day-once',
      payload: {},
    };

    const first = await host.applyHostIntent(intent);
    const retry = await host.applyHostIntent(intent);

    expect(first).toEqual(retry);
    expect(first.ok).toBe(true);
    expect(host.getState().day).toBe(4);
    expect(received.map((event) => event.type)).toEqual([
      'CampaignDayAdvanced',
    ]);
    expect(await host.getEventLog().getCampaignEvents()).toHaveLength(2);
  });

  it('replays a guest handleIntent retry without appending, applying, or broadcasting again', async () => {
    const { host, received } = makeHost(stateWith({ day: 3 }));
    await host.open();
    received.length = 0;
    const intent = {
      kind: 'AdvanceDay' as const,
      campaignId: CAMPAIGN_ID,
      intentId: 'guest-advance-day-once',
      payload: {},
    };

    const first = await host.handleIntent(intent);
    const retry = await host.handleIntent(intent);

    expect(first).toEqual(retry);
    expect(first.ok).toBe(true);
    expect(host.getState().day).toBe(4);
    expect(received.map((event) => event.type)).toEqual([
      'CampaignDayAdvanced',
    ]);
    expect(await host.getEventLog().getCampaignEvents()).toHaveLength(2);
  });

  it('does not apply or broadcast when the store reports a duplicate command', async () => {
    const baseStore = new InMemoryCampaignEventStore();
    const store: ICampaignEventStore = {
      appendEvent: baseStore.appendEvent,
      appendCommandBatch: baseStore.appendCommandBatch,
      getEvents: baseStore.getEvents,
      highestSequence: baseStore.highestSequence,
    };
    const host = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: HOST_ID,
      eventStore: store,
      initialState: stateWith({ day: 3 }),
    });
    const received: ICampaignEvent[] = [];
    host.subscribe((event) => received.push(event));
    await host.open();
    received.length = 0;
    const intent = {
      kind: 'AdvanceDay' as const,
      campaignId: CAMPAIGN_ID,
      intentId: 'duplicate-answer-without-preflight',
      payload: {},
    };

    const first = await host.applyHostIntent(intent);
    const retry = await host.applyHostIntent(intent);

    expect(retry).toEqual(first);
    expect(host.getState().day).toBe(4);
    expect(received.map((event) => event.type)).toEqual([
      'CampaignDayAdvanced',
    ]);
    expect(await host.getEventLog().getCampaignEvents()).toHaveLength(2);
  });

  it('rejects different work under an accepted intentId without appending', async () => {
    const { host, received } = makeHost(stateWith({ day: 3 }));
    await host.open();
    received.length = 0;

    await host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'reused-intent-id',
      payload: { days: 1 },
    });
    const conflict = await host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'reused-intent-id',
      payload: { days: 2 },
    });

    expect(conflict).toMatchObject({
      ok: false,
      code: 'INVALID_CAMPAIGN_INTENT',
      reason: 'intent-identity-conflict',
    });
    expect(host.getState().day).toBe(4);
    expect(received).toHaveLength(1);
    expect(await host.getEventLog().getCampaignEvents()).toHaveLength(2);
  });

  it('keeps two no-intentId host sends as two independent commits', async () => {
    const { host, received } = makeHost(stateWith({ day: 3 }));
    await host.open();
    received.length = 0;
    const intent = {
      kind: 'AdvanceDay' as const,
      campaignId: CAMPAIGN_ID,
      payload: {},
    };

    await host.applyHostIntent(intent as never);
    await host.applyHostIntent(intent as never);

    expect(host.getState().day).toBe(5);
    expect(received.map((event) => event.type)).toEqual([
      'CampaignDayAdvanced',
      'CampaignDayAdvanced',
    ]);
    expect(await host.getEventLog().getCampaignEvents()).toHaveLength(3);
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
    // The standing gate judges the employer the MARKET stored. The payload
    // names a caller-supplied employer with no standing record at all.
    const { host } = makeHost(
      stateWith({ factionStanding: { kurita: -5 } }),
      contractMarket({
        ...AUTHORITATIVE_CONTRACT,
        employerFactionId: 'kurita',
      }),
    );
    await host.open();
    const result = await host.handleIntent(acceptContract('contract-1'));
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

// K14b PR3: the match host took the contract a guest described - id,
// name and employer - and committed it after a GM approval. Every fact now
// comes from the host's contract market.
describe('CampaignMatchHost - contract acceptance from the market', () => {
  it('commits the contract the market holds, not the one the intent describes', async () => {
    const { host, received } = makeHost(
      stateWith({}),
      contractMarket(AUTHORITATIVE_CONTRACT),
    );
    await host.open();
    received.length = 0;

    const result = await host.handleIntent(acceptContract('contract-1'));

    expect(result.ok).toBe(true);
    expect(received.map((event) => event.payload)).toStrictEqual([
      {
        contract: {
          contractId: 'contract-1',
          name: 'Garrison Duty',
          employerFactionId: 'davion',
        },
      },
    ]);
  });

  it('refuses an acceptance when the host has no contract market to read', async () => {
    const { host, received } = makeHost(stateWith({}));
    await host.open();
    received.length = 0;

    const result = await host.handleIntent(acceptContract('contract-1'));

    expect(result).toMatchObject({
      ok: false,
      reason: 'offer-source-unavailable',
    });
    expect(received).toHaveLength(0);
  });

  it.each([
    ['an unknown contract', 'contract-404', 'offer-not-found'],
    ['a declined contract', 'contract-declined', 'offer-declined'],
    ['an ended contract', 'contract-ended', 'offer-expired'],
  ])('refuses %s, committing nothing', async (_label, contractId, reason) => {
    const { host, received } = makeHost(
      stateWith({}),
      contractMarket(
        AUTHORITATIVE_CONTRACT,
        {
          ...AUTHORITATIVE_CONTRACT,
          contractId: 'contract-declined',
          declined: true,
        },
        {
          ...AUTHORITATIVE_CONTRACT,
          contractId: 'contract-ended',
          endDate: '3025-01-02',
        },
      ),
    );
    await host.open();
    received.length = 0;

    const result = await host.handleIntent(acceptContract(contractId));

    expect(result).toMatchObject({ ok: false, reason });
    expect(received).toHaveLength(0);
  });

  it('accepts a contract on its end date and one with no end date', async () => {
    const { host } = makeHost(
      stateWith({}),
      contractMarket(
        { ...AUTHORITATIVE_CONTRACT, endDate: '3025-01-03' },
        {
          ...AUTHORITATIVE_CONTRACT,
          contractId: 'contract-open',
          endDate: undefined,
        },
      ),
    );
    await host.open();

    expect((await host.handleIntent(acceptContract('contract-1'))).ok).toBe(
      true,
    );
    expect((await host.handleIntent(acceptContract('contract-open'))).ok).toBe(
      true,
    );
  });

  it('refuses a second acceptance of the same contract', async () => {
    const { host } = makeHost(
      stateWith({}),
      contractMarket(AUTHORITATIVE_CONTRACT),
    );
    await host.open();
    expect((await host.handleIntent(acceptContract('contract-1'))).ok).toBe(
      true,
    );

    const second = await host.handleIntent({
      ...acceptContract('contract-1'),
      intentId: 'intent-accept-again',
    });

    expect(second).toMatchObject({ ok: false, reason: 'offer-consumed' });
  });
});
