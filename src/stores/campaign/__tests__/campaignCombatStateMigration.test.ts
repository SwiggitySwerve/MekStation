/**
 * T1: the load-time runner for the legacy combat-state migration. The
 * quarantine is written outside the payload BEFORE the migrated campaign is
 * adopted; a failed write leaves every entry in place.
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
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import legacyFixture from '@/lib/campaign/__tests__/fixtures/legacySessionKeyedCampaign.json';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import {
  IndexedDBService,
  resetIndexedDBService,
} from '@/services/persistence/IndexedDBService';
import { createIndexedDbLegacyCombatStateQuarantineStore } from '@/services/persistence/legacyCombatStateQuarantineStore';

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

describe('ensureCampaignCombatStateMigration', () => {
  afterEach(() => {
    resetCampaignStore();
    useCampaignRosterStore.setState({ campaignId: null, units: [] });
  });

  it('stores the quarantine first, then adopts the migration and logs the opponent prune', async () => {
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
    expect(Object.keys(liveStates())).toEqual(['ff-roster-unit-1']);
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

  it('does nothing without this campaign roster to map against', async () => {
    seedLegacyCampaign();
    useCampaignRosterStore.setState({ campaignId: 'another-campaign' });
    const quarantine: ILegacyCombatStateQuarantineStore = {
      get: jest.fn(),
      put: jest.fn(),
    };
    await ensureCampaignCombatStateMigration(quarantine);
    expect(quarantine.put).not.toHaveBeenCalled();
    expect(Object.keys(liveStates())).toContain(PLAYER_KEY);
  });
});

describe('IndexedDB legacy combat-state quarantine store', () => {
  afterEach(() => resetIndexedDBService());

  it('keeps records per campaign and never duplicates an identical record', async () => {
    const store = createIndexedDbLegacyCombatStateQuarantineStore(
      new IndexedDBService(),
    );
    const record = {
      campaignId: 'camp-q',
      sessionUnitId: PLAYER_KEY,
      original: { unitId: PLAYER_KEY } as never,
      resolution: { kind: 'migrated' as const, targets: [] },
      migratedAt: '2026-11-18T00:00:00.000Z',
    };
    await store.put('camp-q', [record]);
    await store.put('camp-q', [{ ...record, migratedAt: 'later' }]);
    expect(await store.get('camp-q')).toEqual([record]);
    expect(await store.get('camp-other')).toEqual([]);
  });
});
