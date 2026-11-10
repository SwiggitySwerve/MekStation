import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

/**
 * Real campaign actions, persist rehydration and dirty wiring, with only the
 * HTTP boundary replaced by an in-memory CAS server. A lost keepalive is
 * captured but never delivered to that server.
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */
import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '../campaignPersistenceWiring';
import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  __resetCampaignPersistenceCoordinationForTests,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { createCampaignStore } from '../useCampaignStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const HOST = 'outcome-adoption-host';
const persistence = () => useCampaignPersistenceStore.getState();

function row(campaign: ICampaign, version: number): SerializedCampaign {
  return {
    ...buildSerializedCampaign(campaign, 'server-device', version),
    instanceId: HOST,
    authority: sourceCampaignAuthority(),
  };
}

function outcome(): ICombatOutcome {
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'lost-battle',
    contractId: null,
    scenarioId: 'scenario-1',
    endReason: CombatEndReason.ObjectiveMet,
    capturedAt: '2026-11-10T00:00:00.000Z',
    report: {
      version: 1,
      matchId: 'lost-battle',
      winner: GameSide.Player,
      reason: 'objective',
      turnCount: 1,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
  };
}

interface Put {
  envelope: SerializedCampaign;
  baseVersion: number;
  keepalive: boolean;
}

describe('pending battle outcomes through a new document', () => {
  let store: ReturnType<typeof createCampaignStore>;
  let remote: SerializedCampaign;
  let puts: Put[];

  function bindStore(): void {
    registerCampaignStoreAccessor(() => store);
    installCampaignPersistenceWiring();
  }

  function reload(): void {
    uninstallCampaignPersistenceWiring();
    const saved = localStorage.getItem('campaign-store');
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignRosterStore.getState().reset();
    if (saved === null) throw new Error('Missing persisted campaign');
    localStorage.setItem('campaign-store', saved);
    store = createCampaignStore();
    bindStore();
  }

  async function debounce(): Promise<void> {
    await jest.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS + 200);
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    uninstallCampaignPersistenceWiring();
    localStorage.clear();
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignRosterStore.getState().reset();
    puts = [];
    const campaign = {
      ...buildPopulatedCampaign(),
      pendingBattleOutcomes: [],
      processedBattleIds: ['already-processed'],
    };
    remote = row(campaign, 3);
    store = createCampaignStore();
    store.getState().switchCampaign(campaign);
    store.getState().setCachedCampaignKey({ instanceId: HOST, revision: 3 });
    bindStore();
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.method !== 'PUT') {
        return { ok: true, status: 200, json: async () => remote } as Response;
      }
      const body = JSON.parse(String(init.body)) as Omit<Put, 'keepalive'>;
      puts.push({ ...body, keepalive: init.keepalive === true });
      if (init.keepalive) {
        // The old document goes away: no arrival, response or CAS mutation.
        return new Promise<Response>(() => {});
      }
      if (body.baseVersion !== remote.version) {
        return {
          ok: false,
          status: 409,
          json: async () => remote,
        } as Response;
      }
      remote = {
        ...body.envelope,
        version: remote.version + 1,
        instanceId: HOST,
        authority: sourceCampaignAuthority(),
      };
      return { ok: true, status: 200, json: async () => remote } as Response;
    });
    await persistence().loadCampaign(campaign.id);
  });

  afterEach(() => {
    uninstallCampaignPersistenceWiring();
    persistence().reset();
    __resetCampaignPersistenceCoordinationForTests();
    jest.restoreAllMocks();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('adopts an enqueued outcome after an undelivered flush, without applying or duplicating it on a later save', async () => {
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    expect(persistence().dirty).toBe(true);
    expect(store.getState().pendingWrite).toMatchObject({ baseVersion: 3 });
    persistence().flushPendingMutations();
    expect(puts).toHaveLength(1);
    expect(puts[0].keepalive).toBe(true);
    expect(remote.body.pendingBattleOutcomes).toEqual([]);

    reload();
    expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
    await persistence().loadCampaign(remote.campaignId);
    expect(persistence()).toMatchObject({
      dirty: true,
      recoveredPendingWrite: true,
      baseVersion: 3,
    });
    await debounce();
    expect(puts).toHaveLength(2);
    expect(puts[1]).toMatchObject({ baseVersion: 3, keepalive: false });
    expect(remote.body.pendingBattleOutcomes).toEqual([battle]);
    expect(remote.body.processedBattleIds).toEqual(['already-processed']);
    expect(store.getState().processedBattleIds).toEqual(['already-processed']);
    expect(persistence()).toMatchObject({ dirty: false, saveState: 'saved' });
    expect(store.getState().pendingWrite).toBeNull();

    store.getState().enqueueOutcome(battle);
    store.getState().updateCampaign({ name: 'A later unrelated edit' });
    await debounce();
    expect(puts).toHaveLength(3);
    expect(remote.body.pendingBattleOutcomes).toEqual([battle]);
    expect(remote.body.processedBattleIds).toEqual(['already-processed']);
  });

  it('holds the outcome and original v3 token when another writer advances to v5; no v3 content may be PUT at base 5', async () => {
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    persistence().flushPendingMutations();
    const localName = store.getState().campaign?.name;
    remote = {
      ...remote,
      version: 5,
      body: {
        ...remote.body,
        name: 'Newer writer',
        currentDate: '3025-07-06T00:00:00.000Z',
      },
    };
    const newer = remote;
    reload();
    await expect(persistence().loadCampaign(remote.campaignId)).resolves.toBe(
      false,
    );
    expect(persistence()).toMatchObject({
      dirty: true,
      saveState: 'conflict',
      baseVersion: 0,
      saveConflict: { localBaseVersion: 3, currentVersion: 5 },
    });
    expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
    expect(store.getState().campaign?.name).toBe(localName);
    await debounce();
    await expect(persistence().saveCampaign()).resolves.toMatchObject({
      status: 'conflict',
    });
    persistence().flushPendingMutations();
    expect(puts).toHaveLength(1); // Only the old document's dropped flush.
    expect(remote).toEqual(newer);
    expect(store.getState().pendingWrite).toMatchObject({ baseVersion: 3 });
    expect(store.getState().processedBattleIds).toEqual(['already-processed']);
  });

  it('replaces a clean stale v3 copy with v5 before any on-load PUT can use base 5', async () => {
    expect(store.getState().pendingWrite).toBeNull();
    remote = {
      ...remote,
      version: 5,
      body: {
        ...remote.body,
        name: 'Newer writer',
        currentDate: '3025-07-06T00:00:00.000Z',
      },
    };
    reload();
    await expect(persistence().loadCampaign(remote.campaignId)).resolves.toBe(
      true,
    );
    await debounce();
    expect(store.getState().campaign?.name).toBe('Newer writer');
    expect(store.getState().campaign?.currentDate.toISOString()).toBe(
      remote.body.currentDate,
    );
    expect(puts).toHaveLength(1);
    expect(puts[0].baseVersion).toBe(5);
    expect(puts[0].envelope.body.name).toBe('Newer writer');
    expect(puts[0].envelope.body.currentDate).toBe('3025-07-06T00:00:00.000Z');
    expect(remote.version).toBe(6);
  });

  it('sends no PUT when a clean rehydrated copy already names the current server row', async () => {
    reload();
    await persistence().loadCampaign(remote.campaignId);
    await debounce();
    expect(puts).toHaveLength(0);
    expect(remote.version).toBe(3);
  });

  it('does not restore a stale pending outcome removed by a newer server row through a base-5 on-load write', async () => {
    // Start one version earlier so the real enqueue/save below leaves a
    // clean, acknowledged v3 local copy, without hand-setting its ledgers.
    remote = { ...remote, version: 2 };
    store.getState().setCachedCampaignKey({ instanceId: HOST, revision: 2 });
    await persistence().loadCampaign(remote.campaignId);
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    await debounce();
    expect(remote.version).toBe(3);
    expect(persistence().dirty).toBe(false);
    expect(store.getState().pendingWrite).toBeNull();
    expect(remote.body.pendingBattleOutcomes).toEqual([battle]);
    // Another writer dequeues the outcome. The stored v3 copy has no
    // pending-write marker, so normal authoritative replacement must apply.
    remote = {
      ...remote,
      version: 5,
      body: { ...remote.body, pendingBattleOutcomes: [] },
    };
    puts = [];
    reload();
    await persistence().loadCampaign(remote.campaignId);
    await debounce();

    // Keep this regression red until the authoritative-load decision is
    // resolved by C4/Root. A future fix may eliminate the redundant PUT.
    expect(
      puts.map((put) => ({
        baseVersion: put.baseVersion,
        pendingBattleOutcomes: put.envelope.body.pendingBattleOutcomes,
      })),
    ).not.toContainEqual({ baseVersion: 5, pendingBattleOutcomes: [battle] });
    expect(remote.body.pendingBattleOutcomes).toEqual([]);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(
      puts.every(
        (put) => put.envelope.body.pendingBattleOutcomes?.length === 0,
      ),
    ).toBe(true);
  });
});
