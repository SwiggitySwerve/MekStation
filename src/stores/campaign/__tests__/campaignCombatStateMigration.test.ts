/**
 * T1: the load-time runner for the legacy combat-state migration. The
 * quarantine is written outside the payload BEFORE the migrated campaign is
 * adopted; a failed write leaves every entry in place. Owner ruling
 * PARITY-PLAN §186.4: nothing is attributed to a roster unit.
 */
import 'fake-indexeddb/auto';

// jsdom has no structuredClone; fake-indexeddb needs one (same shim as
// InteractiveSession.matchLog.test.ts).
if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import type { ILegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import type { ILegacyCombatStateRecord } from '@/types/campaign/LegacyCombatStateMigration';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import legacyFixture from '@/lib/campaign/__tests__/fixtures/legacySessionKeyedCampaign.json';
import { getDeviceId } from '@/lib/campaign/persistence/deviceId';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import {
  IndexedDBService,
  resetIndexedDBService,
} from '@/services/persistence/IndexedDBService';
import { createIndexedDbLegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';
import { LEGACY_NOT_ATTRIBUTED_NOTE } from '@/types/campaign/LegacyCombatStateMigration';

import { ensureCampaignCombatStateMigration } from '../campaignCombatStateMigration';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

const PLAYER_KEY = 'player-1-atlas-as7-d';
const OPPONENT_KEY = 'opponent-1-marauder-mad-3r';

function seedLegacyCampaign() {
  const { envelope } = legacyFixture as unknown as {
    envelope: SerializedCampaign;
  };
  const campaign = deserializeCampaignBody(envelope.body);
  resetCampaignStore();
  useCampaignStore().setState({ campaign, activityLog: [] });
  useCampaignRosterStore.setState({
    campaignId: campaign.id,
    units: envelope.body.rosterProjection!.units as IRosterUnitProjection[],
  });
  return campaign;
}

function liveStates() {
  return useCampaignStore().getState().campaign?.unitCombatStates ?? {};
}

/** A quarantine record for the store tests (its resolution is the migration's). */
function storedRecord(
  campaignId: string,
  sessionUnitId: string,
): ILegacyCombatStateRecord {
  return {
    source: 'combat-state',
    campaignId,
    sessionUnitId,
    original: { unitId: sessionUnitId } as never,
    resolution: {
      kind: 'not-attributed',
      note: LEGACY_NOT_ATTRIBUTED_NOTE,
      flag: {
        kind: 'combat-state',
        sessionUnitId,
        reason: 'legacy-not-attributed',
        candidateRosterUnitIds: [],
        matchIds: [],
      },
    },
    migratedAt: '2026-11-18T00:00:00.000Z',
  };
}

describe('ensureCampaignCombatStateMigration', () => {
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.setState({ campaignId: null, units: [] });
  });

  it('stores the quarantine first, then adopts the migration (nothing attributed, the entry flagged) and logs the opponent prune', async () => {
    const campaign = seedLegacyCampaign();
    const order: string[] = [];
    const quarantine: ILegacyCombatStateQuarantineStore = {
      get: jest.fn(),
      put: jest.fn(async (campaignId, records) => {
        // Nothing adopted yet while the originals are being stored.
        expect(Object.keys(liveStates())).toContain(PLAYER_KEY);
        expect(campaignId).toBe(campaign.id);
        expect(records.map((record) => record.sessionUnitId)).toEqual([
          PLAYER_KEY,
        ]);
        order.push('quarantine');
      }),
    };

    await ensureCampaignCombatStateMigration(quarantine);

    expect(order).toEqual(['quarantine']);
    // §186.4: the fixture's roster unit (ff-roster-unit-1) gets nothing.
    expect(liveStates()).toEqual({});
    expect(
      useCampaignStore().getState().campaign?.legacyCombatStateFlags,
    ).toEqual([
      expect.objectContaining({
        kind: 'combat-state',
        sessionUnitId: PLAYER_KEY,
        reason: 'legacy-not-attributed',
        quarantinedOnDeviceId: getDeviceId(),
      }),
    ]);
    const log = useCampaignStore().getState().activityLog;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      category: 'technical',
      message: 'Removed 1 enemy-unit combat state written by an earlier bug',
      payload: { event: 'legacy-combat-state-cleanup' },
    });

    // A second load finds nothing to do.
    await ensureCampaignCombatStateMigration(quarantine);
    expect(quarantine.put).toHaveBeenCalledTimes(1);
    expect(useCampaignStore().getState().activityLog).toHaveLength(1);
  });

  it('a failed quarantine write leaves every legacy entry in place', async () => {
    seedLegacyCampaign();
    const quarantine: ILegacyCombatStateQuarantineStore = {
      get: jest.fn(),
      put: jest.fn(async () => {
        throw new Error('storage unavailable');
      }),
    };

    await ensureCampaignCombatStateMigration(quarantine);

    expect(Object.keys(liveStates()).sort()).toEqual(
      [OPPONENT_KEY, PLAYER_KEY].sort(),
    );
    expect(useCampaignStore().getState().activityLog).toEqual([]);
  });

  it('leaves a co-op guest replica to its host', async () => {
    const campaign = seedLegacyCampaign();
    useCampaignStore().setState({
      campaign: {
        ...campaign,
        coopSession: { mode: 'guest' } as never,
      },
    });
    const quarantine: ILegacyCombatStateQuarantineStore = {
      get: jest.fn(),
      put: jest.fn(),
    };
    await ensureCampaignCombatStateMigration(quarantine);
    expect(quarantine.put).not.toHaveBeenCalled();
    expect(Object.keys(liveStates())).toContain(PLAYER_KEY);
  });

  it('§186.4: needs no roster, since nothing is mapped', async () => {
    seedLegacyCampaign();
    useCampaignRosterStore.setState({ campaignId: 'another-campaign' });
    const quarantine: ILegacyCombatStateQuarantineStore = {
      get: jest.fn(),
      put: jest.fn(async () => {}),
    };
    await ensureCampaignCombatStateMigration(quarantine);
    expect(quarantine.put).toHaveBeenCalledTimes(1);
    expect(liveStates()).toEqual({});
  });
});

describe('IndexedDB legacy combat-state quarantine store', () => {
  afterEach(() => resetIndexedDBService());

  it('N2: two un-awaited puts for one campaign keep both records', async () => {
    const store = createIndexedDbLegacyCombatStateQuarantineStore(
      new IndexedDBService(),
    );
    const record = (sessionUnitId: string) =>
      storedRecord('camp-race', sessionUnitId);
    await Promise.all([
      store.put('camp-race', [record('player-1-atlas-as7-d')]),
      store.put('camp-race', [record('player-2-locust-lct-1v')]),
    ]);
    expect(
      (await store.get('camp-race')).map((r) => r.sessionUnitId).sort(),
    ).toEqual(['player-1-atlas-as7-d', 'player-2-locust-lct-1v']);
  });

  it('keeps records per campaign and never duplicates an identical record', async () => {
    const store = createIndexedDbLegacyCombatStateQuarantineStore(
      new IndexedDBService(),
    );
    const record = storedRecord('camp-q', PLAYER_KEY);
    await store.put('camp-q', [record]);
    await store.put('camp-q', [{ ...record, migratedAt: 'later' }]);
    expect(await store.get('camp-q')).toEqual([record]);
    expect(await store.get('camp-other')).toEqual([]);
  });
});
