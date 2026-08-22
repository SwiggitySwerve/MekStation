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

import * as fs from 'node:fs';
import * as path from 'node:path';

import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { parseCampaignCoopSnapshot } from '@/types/campaign/campaignCoopSnapshot';
import {
  createEmptyCampaignState,
  isCampaignEvent,
  isCampaignEventScope,
  isCampaignEventType,
  isCampaignWireEvent,
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
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
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
    forceUnits: { 'force-alpha': ['unit-1'] },
  };
}

/** One representative event per `CampaignEventType`. */
function allEventTypes(): ICampaignEvent[] {
  const base = {
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-08T00:00:00.000Z',
    scope: 'campaign' as const,
  };
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
        type: 'FundsChanged',
        sequence: 0,
        campaignId: 'c',
        ts: 't',
        authorPlayerId: 'a',
        payload: { delta: 1, reason: 'r', balance: 1 },
      }),
    ).toBe(false);
    expect(
      isCampaignEvent({
        type: 'FundsChanged',
        sequence: 0,
        campaignId: 'c',
        ts: 't',
        authorPlayerId: 'a',
        scope: 'not-a-scope',
        payload: { delta: 1, reason: 'r', balance: 1 },
      }),
    ).toBe(false);
  });

  it('isCampaignWireEvent accepts the sequence -1 snapshot baseline', () => {
    const baseline = {
      type: 'CampaignSnapshotPublished' as const,
      sequence: -1,
      campaignId: CAMPAIGN_ID,
      ts: '3025-01-08T00:00:00.000Z',
      authorPlayerId: 'host',
      scope: 'campaign' as const,
      payload: { state: sampleState() },
    };
    expect(isCampaignEvent(baseline)).toBe(false);
    expect(isCampaignWireEvent(baseline)).toBe(true);
    expect(isCampaignEventScope(baseline.scope)).toBe(true);
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

function parseSnap(overrides: {
  readonly campaignId?: unknown;
  readonly matchId?: unknown;
  readonly revision?: unknown;
  readonly state?: unknown;
}) {
  return parseCampaignCoopSnapshot({
    campaignId: CAMPAIGN_ID,
    matchId: 'match-1',
    revision: 0,
    state: sampleState(),
    ...overrides,
  });
}

describe('campaign co-op snapshot authority', () => {
  it('rejects unknown source, missing refs, duplicates, and stale revisions', () => {
    const state = sampleState();
    expect(parseSnap({ state }).ok).toBe(true);
    expect(parseSnap({ campaignId: 'other', state }).ok).toBe(false);
    expect(parseSnap({ revision: -1, state }).ok).toBe(false);
    expect(
      parseSnap({
        state: {
          ...state,
          rosterUnits: {
            'unit-1': {
              ...state.rosterUnits['unit-1'],
              unitSource: 'stock',
            },
          },
        } as unknown,
      }).ok,
    ).toBe(false);
    expect(
      parseSnap({
        state: { ...state, forceUnits: { a: ['unit-1'], b: ['unit-1'] } },
      }).ok,
    ).toBe(false);
  });

  it('publishes CAMP-01B wave-result.json when the controller artifact dir is set', async () => {
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    if (!artifactDir || !runId) return;
    const matchId = 'match-coop';
    const registry = new CampaignHostRegistry();
    const entry = await registry.register(matchId, {
      campaignId: CAMPAIGN_ID,
      hostPlayerId: 'host',
      roomCode: 'ABC234',
      state: sampleState(),
    });
    useCampaignMirrorStore.getState().reset();
    useCampaignMirrorStore
      .getState()
      .beginMirror(
        { hostPeerId: 'host-peer', guestPeerId: 'guest-peer' },
        'guest-peer',
      );
    const join = await entry.syncSession.joinGuest('ABC234', (event) => {
      const store = useCampaignMirrorStore.getState();
      if (event.type === 'CampaignSnapshotPublished' && event.sequence < 0) {
        store.applySnapshot(event);
      } else {
        store.applyEvent(event);
      }
    });
    const guest = useCampaignMirrorStore.getState().campaign;
    const hostState = entry.host.getState();
    const unit = guest?.rosterUnits['unit-1'];
    const assertions = {
      'campaignIdMatched===true':
        entry.campaignId === CAMPAIGN_ID && guest?.campaignId === CAMPAIGN_ID,
      'forceMembershipMatched===true':
        JSON.stringify(hostState.forceUnits) ===
        JSON.stringify(guest?.forceUnits),
      'guestMirrorHydrated===true': guest !== null && join.ok,
      'matchIdMatched===true': entry.matchId === matchId,
      'revisionMatched===true':
        entry.revision === 0 &&
        useCampaignMirrorStore.getState().lastSequence === entry.revision,
      'sourceIdentityMatched===true':
        hostState.rosterUnits['unit-1']?.unitSource === 'canonical' &&
        unit?.unitSource === 'canonical' &&
        unit?.unitRef === 'atlas-as7-d',
    };
    if (Object.values(assertions).some((value) => value !== true)) {
      throw new Error(
        `wave assertion checks failed: ${JSON.stringify(assertions)}`,
      );
    }
    fs.writeFileSync(
      path.join(artifactDir, 'wave-result.json'),
      `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01b', runId, status: 'passed', assertions })}\n`,
      { flag: 'wx' },
    );
    join.disconnect();
    registry.dispose(matchId);
  });
});
