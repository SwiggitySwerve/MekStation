/**
 * Tests for the shared-campaign sync type set (CO1, task 1.4).
 *
 * Covers the type guards, the empty-state factory, and a serialization
 * round-trip preserving every campaign event payload — every campaign
 * event must survive `JSON.parse(JSON.stringify(event))` without loss
 * so the WebSocket transport and the persisted log round-trip cleanly.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import {
  createEmptyCampaignState,
  isCampaignEvent,
  isCampaignEventType,
  type ICampaignEvent,
  type ICampaignAuthoritativeState,
} from '@/types/campaign/CampaignSync';
import { parseCampaignIntent } from '@/types/campaign/campaignSyncSchemas';

const CAMPAIGN_ID = 'campaign-co1';

function sampleState(): ICampaignAuthoritativeState {
  return {
    campaignId: CAMPAIGN_ID,
    day: 7,
    balance: 1_250_000,
    rosterUnits: {
      'unit-1': {
        unitId: 'unit-1',
        designation: 'Atlas AS7-D',
        status: 'operational',
      },
    },
    pilots: {
      'pilot-1': { pilotId: 'pilot-1', name: 'Natasha Kerensky' },
    },
    contracts: {
      'contract-1': {
        contractId: 'contract-1',
        name: 'Raid on Hesperus',
        employerFactionId: 'steiner',
      },
    },
    factionStanding: { steiner: 3 },
    salvagePool: 400_000,
  };
}

/** One representative event per `CampaignEventType`. */
function allEventTypes(): ICampaignEvent[] {
  const base = { campaignId: CAMPAIGN_ID, ts: '3025-01-08T00:00:00.000Z' };
  return [
    {
      ...base,
      type: 'CampaignDayAdvanced',
      sequence: 0,
      authorPlayerId: 'host',
      payload: { newDay: 8 },
    },
    {
      ...base,
      type: 'FundsChanged',
      sequence: 1,
      authorPlayerId: 'host',
      payload: { delta: -100_000, reason: 'Repairs', balance: 1_150_000 },
    },
    {
      ...base,
      type: 'PilotHired',
      sequence: 2,
      authorPlayerId: 'guest:campaign-co1',
      payload: {
        pilot: { pilotId: 'pilot-2', name: 'Jaime Wolf' },
        cost: 50_000,
      },
    },
    {
      ...base,
      type: 'ContractAccepted',
      sequence: 3,
      authorPlayerId: 'host',
      payload: {
        contract: {
          contractId: 'contract-2',
          name: 'Garrison Duty',
          employerFactionId: 'davion',
        },
      },
    },
    {
      ...base,
      type: 'RosterUnitChanged',
      sequence: 4,
      authorPlayerId: 'host',
      payload: {
        change: 'repaired',
        unit: {
          unitId: 'unit-1',
          designation: 'Atlas AS7-D',
          status: 'operational',
        },
      },
    },
    {
      ...base,
      type: 'SalvageAllocated',
      sequence: 5,
      authorPlayerId: 'host',
      payload: { value: 100_000, poolRemaining: 300_000 },
    },
    {
      ...base,
      type: 'CampaignSnapshotPublished',
      sequence: 6,
      authorPlayerId: 'host',
      payload: { state: sampleState() },
    },
  ];
}

describe('CampaignSync type guards', () => {
  it('isCampaignEventType accepts every event type and rejects others', () => {
    for (const event of allEventTypes()) {
      expect(isCampaignEventType(event.type)).toBe(true);
    }
    expect(isCampaignEventType('NotAnEvent')).toBe(false);
    expect(isCampaignEventType('')).toBe(false);
  });

  it('isCampaignEvent accepts a well-formed event', () => {
    for (const event of allEventTypes()) {
      expect(isCampaignEvent(event)).toBe(true);
    }
  });

  it('isCampaignEvent rejects malformed candidates', () => {
    expect(isCampaignEvent(null)).toBe(false);
    expect(isCampaignEvent({})).toBe(false);
    expect(isCampaignEvent({ type: 'FundsChanged' })).toBe(false);
    expect(
      isCampaignEvent({
        type: 'FundsChanged',
        sequence: -1,
        campaignId: 'c',
        ts: 't',
        authorPlayerId: 'a',
        payload: {},
      }),
    ).toBe(false);
    expect(
      isCampaignEvent({
        type: 'Unknown',
        sequence: 0,
        campaignId: 'c',
        ts: 't',
        authorPlayerId: 'a',
        payload: {},
      }),
    ).toBe(false);
  });
});

describe('createEmptyCampaignState', () => {
  it('produces a zeroed ledger bound to the campaign id', () => {
    const state = createEmptyCampaignState(CAMPAIGN_ID);
    expect(state.campaignId).toBe(CAMPAIGN_ID);
    expect(state.day).toBe(0);
    expect(state.balance).toBe(0);
    expect(state.salvagePool).toBe(0);
    expect(Object.keys(state.rosterUnits)).toHaveLength(0);
    expect(Object.keys(state.pilots)).toHaveLength(0);
    expect(Object.keys(state.contracts)).toHaveLength(0);
  });
});

describe('campaign event serialization round-trip', () => {
  it('preserves every campaign event payload through JSON', () => {
    for (const event of allEventTypes()) {
      const roundTripped = JSON.parse(JSON.stringify(event)) as ICampaignEvent;
      expect(roundTripped).toEqual(event);
      expect(isCampaignEvent(roundTripped)).toBe(true);
    }
  });

  it('FundsChanged carries delta, reason, and resulting balance', () => {
    const funds = allEventTypes().find((e) => e.type === 'FundsChanged');
    expect(funds).toBeDefined();
    if (funds && funds.type === 'FundsChanged') {
      expect(funds.payload.delta).toBe(-100_000);
      expect(funds.payload.reason).toBe('Repairs');
      expect(funds.payload.balance).toBe(1_150_000);
    }
  });

  it('CampaignSnapshotPublished carries a whole-campaign baseline', () => {
    const snapshot = allEventTypes().find(
      (e) => e.type === 'CampaignSnapshotPublished',
    );
    expect(snapshot).toBeDefined();
    if (snapshot && snapshot.type === 'CampaignSnapshotPublished') {
      expect(snapshot.payload.state.campaignId).toBe(CAMPAIGN_ID);
      expect(snapshot.payload.state.balance).toBe(1_250_000);
      expect(snapshot.payload.state.day).toBe(7);
    }
  });
});

describe('parseCampaignIntent (zod boundary)', () => {
  it('parses a well-formed SpendFunds intent', () => {
    const intent = parseCampaignIntent({
      kind: 'SpendFunds',
      campaignId: CAMPAIGN_ID,
      intentId: 'intent-1',
      payload: { amount: 100_000, reason: 'Ammo restock' },
    });
    expect(intent).not.toBeNull();
    expect(intent?.kind).toBe('SpendFunds');
  });

  it('parses every intent kind', () => {
    const candidates: unknown[] = [
      {
        kind: 'HirePilot',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: {
          pilot: { pilotId: 'p', name: 'N' },
          cost: 10,
        },
      },
      {
        kind: 'AcceptContract',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: {
          contract: {
            contractId: 'c',
            name: 'N',
            employerFactionId: 'f',
          },
        },
      },
      {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: { amount: 1, reason: 'r' },
      },
      {
        kind: 'AllocateSalvage',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: { value: 1 },
      },
      {
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: {},
      },
    ];
    for (const candidate of candidates) {
      expect(parseCampaignIntent(candidate)).not.toBeNull();
    }
  });

  it('rejects malformed intents', () => {
    expect(parseCampaignIntent(null)).toBeNull();
    expect(parseCampaignIntent({})).toBeNull();
    expect(parseCampaignIntent({ kind: 'Unknown' })).toBeNull();
    // Missing payload field.
    expect(
      parseCampaignIntent({
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: { reason: 'no amount' },
      }),
    ).toBeNull();
    // Negative spend amount.
    expect(
      parseCampaignIntent({
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'i',
        payload: { amount: -5, reason: 'r' },
      }),
    ).toBeNull();
    // Empty campaign id.
    expect(
      parseCampaignIntent({
        kind: 'AdvanceDay',
        campaignId: '',
        intentId: 'i',
        payload: {},
      }),
    ).toBeNull();
  });
});
