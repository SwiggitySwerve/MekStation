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

  it.each(['leave open', 'close tab'] as const)(
    'keeps the conflicted copy, outcome and marker in storage when the player chooses nothing (%s)',
    async (action) => {
      const battle = outcome();
      store.getState().enqueueOutcome(battle);
      store
        .getState()
        .updateCampaign({ name: 'Local changes held for later carry-over' });
      remote = {
        ...remote,
        version: 5,
        body: { ...remote.body, name: 'Other writer' },
      };
      reload();
      await persistence().loadCampaign(remote.campaignId);
      expect(persistence().saveState).toBe('conflict');
      const stored = localStorage.getItem('campaign-store');
      const marker = store.getState().pendingWrite;
      expect(stored).not.toBeNull();
      expect(marker).toMatchObject({
        campaignId: remote.campaignId,
        baseVersion: 3,
      });
      await jest.advanceTimersByTimeAsync(20_000);
      expect(localStorage.getItem('campaign-store')).toBe(stored);
      if (action === 'close tab') {
        window.dispatchEvent(new Event('pagehide'));
        window.dispatchEvent(new Event('unload'));
        expect(localStorage.getItem('campaign-store')).toBe(stored);
        expect(puts).toEqual([]);
        reload();
        expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
        expect(store.getState().campaign?.name).toBe(
          'Local changes held for later carry-over',
        );
        expect(store.getState().pendingWrite).toEqual(marker);
        expect(localStorage.getItem('campaign-store')).toBe(stored);
        await persistence().loadCampaign(remote.campaignId);
        await jest.advanceTimersByTimeAsync(20_000);
      }
      expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
      expect(store.getState().campaign?.pendingBattleOutcomes).toEqual([
        battle,
      ]);
      expect(store.getState().campaign?.name).toBe(
        'Local changes held for later carry-over',
      );
      expect(store.getState().pendingWrite).toEqual(marker);
      expect(localStorage.getItem('campaign-store')).toBe(stored);
      expect(persistence().saveState).toBe('conflict');
      expect(puts).toEqual([]);
      expect(remote.body.pendingBattleOutcomes).toEqual([]);
    },
  );

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
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(puts).toHaveLength(0);
    expect(remote.version).toBe(5);
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

    // A server install cannot silently union unclaimed local pending entries.
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
    expect(puts).toHaveLength(0);
    store.getState().updateCampaign({ name: 'Edit after authoritative load' });
    await debounce();
    expect(puts).toHaveLength(1);
    expect(puts[0].baseVersion).toBe(5);
    expect(remote.body.pendingBattleOutcomes).toEqual([]);
  });

  it('clears the timer armed by authoritative replacement before any debounce callback', async () => {
    remote = { ...remote, version: 5 };
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expect(persistence().dirty).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(puts).toEqual([]);
  });

  it('does not classify a server-load replacement as an edit or arm its debounce', async () => {
    remote = { ...remote, version: 5 };
    reload();
    const markDirty = jest.spyOn(persistence(), 'markDirty');
    await persistence().loadCampaign(remote.campaignId);
    expect(markDirty).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(puts).toEqual([]);
    // Suppressing the server install must not suppress the next real edit.
    store.getState().updateCampaign({ name: 'Edit following replacement' });
    expect(markDirty).toHaveBeenCalledTimes(1);
    await debounce();
    expect(puts).toHaveLength(1);
    expect(puts[0].baseVersion).toBe(5);
  });

  it('disarms an older timer when record-loaded acknowledges the server row', async () => {
    // Reproduce an already-armed timer without claiming an unsaved local copy.
    // A pending claim would correctly choose adoption instead of record-loaded.
    persistence().markDirty();
    store.getState().setPendingWrite(null);
    expect(jest.getTimerCount()).toBe(1);
    await persistence().loadCampaign(remote.campaignId);
    const timersAfterLoad = jest.getTimerCount();
    await jest.advanceTimersByTimeAsync(20_000);
    expect(puts).toEqual([]);
    expect(timersAfterLoad).toBe(0);
  });

  it('writes an explicit clean save and still debounces an ordinary edit', async () => {
    expect(persistence().dirty).toBe(false);
    await expect(persistence().saveCampaign()).resolves.toMatchObject({
      status: 'saved',
    });
    expect(puts).toHaveLength(1);
    expect(puts[0].baseVersion).toBe(3);
    expect(remote.version).toBe(4);
    store.getState().updateCampaign({ name: 'Ordinary edit' });
    await jest.advanceTimersByTimeAsync(AUTO_SAVE_DEBOUNCE_MS - 1);
    expect(puts).toHaveLength(1);
    await debounce();
    expect(puts).toHaveLength(2);
    expect(puts[1].baseVersion).toBe(4);
    expect(remote.body.name).toBe('Ordinary edit');
    expect(persistence().dirty).toBe(false);
    await persistence().saveCampaign();
    expect(puts).toHaveLength(3);
    expect(puts[2].baseVersion).toBe(5);
    expect(remote.version).toBe(6);
  });

  it.each([3, 5])(
    'claims an outcome before the first load completes and reloads at server v%s',
    async (serverVersion) => {
      reload();
      expect(persistence().baseVersion).toBe(0);
      expect(store.getState().pendingWrite).toBeNull();
      // A discarded document never receives this outstanding GET, just as the
      // lost keepalive in the acceptance case never settles.
      jest
        .mocked(globalThis.fetch)
        .mockImplementationOnce(() => new Promise<Response>(() => {}));
      void persistence().loadCampaign(remote.campaignId);
      const battle = outcome();
      store.getState().enqueueOutcome(battle);
      expect(store.getState().pendingWrite).toMatchObject({ baseVersion: 3 });
      expect(persistence().baseVersion).toBe(0); // No unread server token granted.
      reload();
      remote = { ...remote, version: serverVersion };
      await persistence().loadCampaign(remote.campaignId);
      await debounce();
      expect(store.getState().pendingBattleOutcomes).toEqual([battle]);
      if (serverVersion === 3) {
        expect(puts).toHaveLength(1);
        expect(puts[0].baseVersion).toBe(3);
        expect(remote.body.pendingBattleOutcomes).toEqual([battle]);
        store.getState().enqueueOutcome(battle);
        store.getState().updateCampaign({ name: 'Later edit' });
        await debounce();
        expect(remote.body.pendingBattleOutcomes).toEqual([battle]);
      } else {
        expect(persistence().saveState).toBe('conflict');
        expect(puts).toEqual([]);
        expect(remote.body.pendingBattleOutcomes).toEqual([]);
      }
    },
  );

  it('keeps processed ids from both sides and excludes their outcomes from either pending ledger', async () => {
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    await debounce();
    // Local processing evidence is retained even when the new server queue
    // includes that matchId. A server-processed id also blocks a stale local entry.
    store.getState().updateCampaign({
      processedBattleIds: ['already-processed', battle.matchId],
    });
    await debounce();
    remote = {
      ...remote,
      version: remote.version + 2,
      body: {
        ...remote.body,
        processedBattleIds: ['already-processed'],
        pendingBattleOutcomes: [
          battle,
          { ...battle, matchId: 'already-processed' },
        ],
      },
    };
    puts = [];
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(store.getState().processedBattleIds).toEqual(
      expect.arrayContaining(['already-processed', battle.matchId]),
    );
    store.getState().enqueueOutcome(battle);
    store
      .getState()
      .enqueueOutcome({ ...battle, matchId: 'already-processed' });
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(puts).toEqual([]);
  });

  it('never requeues a stale local outcome that the newer server row already processed', async () => {
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    await debounce();
    remote = {
      ...remote,
      version: remote.version + 2,
      body: {
        ...remote.body,
        pendingBattleOutcomes: [],
        processedBattleIds: ['already-processed', battle.matchId],
      },
    };
    puts = [];
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(store.getState().processedBattleIds).toContain(battle.matchId);
    store.getState().enqueueOutcome(battle);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(puts).toEqual([]);
  });

  it('uses the server payload for the same matchId on an authoritative load', async () => {
    const battle = outcome();
    store.getState().enqueueOutcome(battle);
    await debounce();
    const newerBattle = { ...battle, capturedAt: '2026-11-10T12:00:00.000Z' };
    remote = {
      ...remote,
      version: remote.version + 1,
      body: { ...remote.body, pendingBattleOutcomes: [newerBattle] },
    };
    puts = [];
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expect(store.getState().pendingBattleOutcomes).toEqual([newerBattle]);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(puts).toEqual([]);
  });

  it('explicitly taking the server version discards the held outcome without a later PUT', async () => {
    store.getState().enqueueOutcome(outcome());
    remote = { ...remote, version: 5 };
    reload();
    await persistence().loadCampaign(remote.campaignId);
    expect(persistence().saveState).toBe('conflict');
    await expect(persistence().resolveConflictTakeServer()).resolves.toBe(true);
    expect(store.getState().pendingBattleOutcomes).toEqual([]);
    expect(store.getState().pendingWrite).toBeNull();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(puts).toEqual([]);
  });
});
