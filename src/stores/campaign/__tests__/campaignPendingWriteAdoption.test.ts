/**
 * A reloaded document decides what it owes the server (the section 3 table at
 * the load path).
 *
 * Whatever lost the edit - a request the browser dropped, a crash, an offline
 * PUT - the browser keeps a copy NEWER than the server's, and `dirty` is gone
 * because it was a fact about the old document. These rows reload a document
 * over that copy and its marker and pin the only three outcomes there are:
 * push at the marker's token, adopt a flush that provably landed, or raise a
 * conflict. There is no row in which the local copy is replaced, or pushed at
 * the server's version, without the player choosing.
 *
 * The "reload" is: persistence state back to initial (a new document), while
 * the campaign store keeps what localStorage would keep - the copy, its cache
 * key and its marker.
 *
 * @spec openspec/changes/adopt-pending-campaign-write/specs/campaign-persistence/spec.md
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaignCacheKey } from '@/lib/campaign/persistence/campaignCacheKey';
import type { IPendingWrite } from '@/lib/campaign/persistence/campaignPendingWrite';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
  __resetCampaignPersistenceCoordinationForTests,
} from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const HOST = 'instance-host-a';
const OTHER_HOST = 'instance-host-b';
const BASE = 7;

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
  cachedCampaignKey: ICampaignCacheKey | null;
  setCachedCampaignKey: (key: ICampaignCacheKey | null) => void;
  pendingWrite: IPendingWrite | null;
  setPendingWrite: (marker: IPendingWrite | null) => void;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

interface FakeServer {
  getStatus: number;
  /** `undefined` makes the read reject, as an offline browser's does. */
  record: SerializedCampaign | null | undefined;
}

interface Captured {
  readonly method: string;
  readonly init: RequestInit;
}

const persistence = () => useCampaignPersistenceStore.getState();

describe('a reloaded document that owes the server edits', () => {
  let remote: ICampaign;
  let local: ICampaign;
  let store: StoreApi<MockCampaignStore>;
  let server: FakeServer;
  let requests: Captured[];
  const switched: ICampaign[] = [];

  const puts = () => requests.filter((r) => r.method === 'PUT');
  const gets = () => requests.filter((r) => r.method === 'GET');
  const marker = () => store.getState().pendingWrite;
  const putBody = (index: number) =>
    JSON.parse(String(puts()[index].init.body)) as {
      envelope: SerializedCampaign;
      baseVersion: number;
    };

  /** The row the server holds for a campaign at (instance, version). */
  function row(
    campaign: ICampaign,
    version: number,
    instanceId = HOST,
  ): SerializedCampaign {
    return {
      ...buildSerializedCampaign(campaign, 'device-server', version),
      instanceId,
      authority: sourceCampaignAuthority(),
    };
  }

  /** What the server stores when a captured PUT lands. */
  function landed(put: Captured): SerializedCampaign {
    const { envelope, baseVersion } = JSON.parse(String(put.init.body)) as {
      envelope: SerializedCampaign;
      baseVersion: number;
    };
    return {
      ...envelope,
      version: baseVersion + 1,
      instanceId: HOST,
      authority: sourceCampaignAuthority(),
    };
  }

  function installStore(
    held: ICampaign,
    patch: Partial<MockCampaignStore> = {},
  ): void {
    store = createStore<MockCampaignStore>((set, get) => ({
      campaign: held,
      rehydratedCampaignId: held.id,
      cachedCampaignKey: { instanceId: HOST, revision: BASE },
      setCachedCampaignKey: (key) => set({ cachedCampaignKey: key }),
      pendingWrite: null,
      setPendingWrite: (next) => set({ pendingWrite: next }),
      updateCampaign: (updates) => {
        const current = get().campaign;
        set({ campaign: current ? { ...current, ...updates } : undefined });
      },
      switchCampaign: (next) => {
        switched.push(next);
        set({ campaign: next });
      },
      ...patch,
    }));
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
  }

  /** The old document: a copy built on `BASE`, edited once. */
  function editInOldDocument(held: ICampaign = local): void {
    installStore(held);
    useCampaignPersistenceStore.setState({
      campaignId: held.id,
      baseVersion: BASE,
    });
    persistence().markDirty();
  }

  /** The browser keeps the copy and its marker; the document is replaced. */
  function reloadDocument(): void {
    const carried = marker();
    useCampaignPersistenceStore.getState().reset();
    __resetCampaignPersistenceCoordinationForTests();
    store.getState().setPendingWrite(carried);
  }

  function pagehide(): void {
    persistence().flushPendingMutations();
  }

  async function tickDebounce(): Promise<void> {
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  }

  beforeEach(() => {
    jest.useFakeTimers();
    requests = [];
    switched.length = 0;
    remote = { ...buildPopulatedCampaign(), name: 'What The Server Holds' };
    local = { ...remote, name: 'What The Player Typed' };
    server = { getStatus: 200, record: row(remote, BASE) };
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    __resetCampaignPersistenceCoordinationForTests();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        const method = String(init?.method ?? 'GET').toUpperCase();
        requests.push({ method, init: init ?? {} });
        if (method === 'GET') {
          if (server.record === undefined) {
            return Promise.reject(new TypeError('Failed to fetch'));
          }
          return Promise.resolve({
            ok: server.getStatus >= 200 && server.getStatus < 300,
            status: server.getStatus,
            json: async () => server.record,
          } as Response);
        }
        // An accepted write lands one past the token it carried.
        const body = JSON.parse(String(init?.body)) as {
          envelope: SerializedCampaign;
          baseVersion: number;
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ...body.envelope,
            version: body.baseVersion + 1,
            instanceId: HOST,
            authority: sourceCampaignAuthority(),
          }),
        } as Response);
      });
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the server is still where the edits were built', () => {
    beforeEach(() => {
      editInOldDocument();
      reloadDocument();
    });

    it('keeps the local copy, comes up dirty and recovered, and replaces nothing', async () => {
      const held = store.getState().campaign;

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);

      expect(store.getState().campaign).toBe(held);
      expect(switched).toHaveLength(0);
      expect(persistence()).toMatchObject({
        dirty: true,
        saveState: 'idle',
        recoveredPendingWrite: true,
        baseVersion: BASE,
        editSeq: 1,
      });
      expect(puts()).toHaveLength(0);
    });

    it('arms the ordinary save, which carries the marker token and the LOCAL state', async () => {
      await persistence().loadCampaign(local.id);

      await tickDebounce();

      expect(puts()).toHaveLength(1);
      expect(putBody(0).baseVersion).toBe(BASE);
      expect(putBody(0).envelope.body.name).toBe('What The Player Typed');
      expect(puts()[0].init.keepalive).toBeUndefined();
      expect(persistence()).toMatchObject({
        saveState: 'saved',
        dirty: false,
        recoveredPendingWrite: false,
        baseVersion: BASE + 1,
      });
      expect(marker()).toBeNull();
    });

    it('keeps the claim until the save is acknowledged, so a second reload decides again', async () => {
      await persistence().loadCampaign(local.id);
      expect(marker()).toEqual({
        campaignId: local.id,
        baseVersion: BASE,
        editSeq: 1,
      });

      reloadDocument();
      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);
      expect(persistence().dirty).toBe(true);
      expect(puts()).toHaveLength(0);
    });

    it('survives a reload that cannot reach the server, then adopts when it can', async () => {
      server.record = undefined;
      await expect(persistence().loadCampaign(local.id)).resolves.toBe(false);
      expect(persistence().saveState).toBe('error');
      expect(marker()).not.toBeNull();

      reloadDocument();
      server.record = row(remote, BASE);
      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);
      expect(persistence().recoveredPendingWrite).toBe(true);
    });
  });

  describe('our flush landed', () => {
    it('adopts clean when the flush carried every edit: no push, no stale token', async () => {
      editInOldDocument();
      pagehide();
      server.record = landed(puts()[0]);
      const sent = puts().length;
      reloadDocument();

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);

      expect(persistence()).toMatchObject({
        dirty: false,
        saveState: 'saved',
        recoveredPendingWrite: false,
        baseVersion: BASE + 1,
      });
      expect(marker()).toBeNull();
      await tickDebounce();
      expect(puts()).toHaveLength(sent);
    });

    it('keeps local and dirty at the flush row when edits came after the flush', async () => {
      editInOldDocument();
      pagehide();
      persistence().markDirty();
      server.record = landed(puts()[0]);
      reloadDocument();
      const held = store.getState().campaign;

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);

      expect(store.getState().campaign).toBe(held);
      expect(persistence()).toMatchObject({
        dirty: true,
        recoveredPendingWrite: true,
        baseVersion: BASE + 1,
        editSeq: 2,
      });
      await tickDebounce();
      const ordinary = puts().filter((p) => p.init.keepalive === undefined);
      expect(ordinary).toHaveLength(1);
      expect(
        (JSON.parse(String(ordinary[0].init.body)) as { baseVersion: number })
          .baseVersion,
      ).toBe(BASE + 1);
    });

    it('does not clean a copy this document edited before its first read landed', async () => {
      editInOldDocument();
      pagehide();
      server.record = landed(puts()[0]);
      reloadDocument();
      // The new document's own edit is not in the marker's edit counter.
      persistence().markDirty();

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(true);

      expect(persistence()).toMatchObject({
        dirty: true,
        baseVersion: BASE + 1,
      });
    });
  });

  describe('anything else is a conflict: no push, no replace, local state kept', () => {
    async function expectHeldConflict(
      held: ICampaign,
      serverVersion: number,
      /** PUTs the OLD document already sent; the new one must add none. */
      sentBeforeReload = 0,
    ): Promise<void> {
      expect(store.getState().campaign).toBe(held);
      expect(switched).toHaveLength(0);
      expect(persistence()).toMatchObject({
        saveState: 'conflict',
        dirty: true,
        saveConflict: {
          reason: 'local-edits-predate-server',
          localBaseVersion: BASE,
          currentVersion: serverVersion,
        },
      });
      // Not even after the debounce would have fired.
      await tickDebounce();
      jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS * 5);
      expect(puts()).toHaveLength(sentBeforeReload);
      // The cache still names the record the copy was built on, and the
      // claim still stands, so a later reload decides the same way again.
      expect(store.getState().cachedCampaignKey).toEqual({
        instanceId: HOST,
        revision: BASE,
      });
      expect(marker()).toMatchObject({
        campaignId: local.id,
        baseVersion: BASE,
      });
    }

    it('another writer moved the row (digest does not match our flush)', async () => {
      editInOldDocument();
      pagehide();
      const theirs = landed(puts()[0]);
      server.record = {
        ...theirs,
        body: { ...theirs.body, name: 'Written Elsewhere' },
      };
      const sent = puts().length;
      reloadDocument();
      const held = store.getState().campaign as ICampaign;

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(false);

      expect(persistence().conflictServerRecord?.body.name).toBe(
        'Written Elsewhere',
      );
      expect(puts()).toHaveLength(sent);
      await expectHeldConflict(held, BASE + 1, sent);
    });

    it('the server moved on by more than one write', async () => {
      editInOldDocument();
      server.record = row(remote, BASE + 4);
      reloadDocument();
      const held = store.getState().campaign as ICampaign;

      await persistence().loadCampaign(local.id);

      await expectHeldConflict(held, BASE + 4);
    });

    it('keeps further conflict edits dirty and unsent without arming autosave, then resumes after take-server', async () => {
      editInOldDocument();
      server.record = row(remote, BASE + 4);
      reloadDocument();
      await persistence().loadCampaign(local.id);
      const before = persistence();
      const timers = jest.getTimerCount();

      store.getState().updateCampaign({ name: 'Further local edit' });
      persistence().markDirty();

      expect(jest.getTimerCount()).toBe(timers);
      expect(persistence()).toMatchObject({
        saveState: 'conflict',
        dirty: true,
        editSeq: before.editSeq + 1,
        baseVersion: before.baseVersion,
        saveConflict: before.saveConflict,
      });
      await tickDebounce();
      expect(puts()).toHaveLength(0);
      expect(store.getState().campaign?.name).toBe('Further local edit');
      expect(marker()).not.toBeNull();

      await expect(persistence().resolveConflictTakeServer()).resolves.toBe(
        true,
      );
      expect(store.getState().campaign?.name).toBe(remote.name);
      expect(persistence()).toMatchObject({
        saveState: 'saved',
        dirty: false,
        baseVersion: BASE + 4,
      });
      expect(marker()).toBeNull();

      store.getState().updateCampaign({ name: 'Edit after explicit choice' });
      persistence().markDirty();
      await tickDebounce();
      expect(puts()).toHaveLength(1);
      expect(putBody(0).baseVersion).toBe(BASE + 4);
      expect(putBody(0).envelope.body.name).toBe('Edit after explicit choice');
      expect(persistence()).toMatchObject({ saveState: 'saved', dirty: false });
    });

    it('Save now returns the held conflict without a PUT, even if the token matches the server', async () => {
      editInOldDocument();
      // Same version on another instance: matching CAS is not permission to write.
      server.record = row(remote, BASE, OTHER_HOST);
      reloadDocument();
      await persistence().loadCampaign(local.id);
      useCampaignPersistenceStore.setState({ baseVersion: BASE });
      store.getState().updateCampaign({ name: 'Still local' });
      persistence().markDirty();
      const before = persistence();

      await expect(persistence().saveCampaign()).resolves.toEqual({
        status: 'conflict',
        conflictServerRecord: before.conflictServerRecord,
        conflict: before.saveConflict,
      });

      expect(puts()).toHaveLength(0);
      expect(persistence()).toBe(before);
      expect(store.getState().campaign?.name).toBe('Still local');
      expect(marker()).not.toBeNull();
    });

    it('a save queued behind the load cannot bypass the conflict it discovers', async () => {
      editInOldDocument();
      server.record = row(remote, BASE + 4);
      reloadDocument();
      const loading = persistence().loadCampaign(local.id);
      const saving = persistence().saveCampaign();
      await loading;
      await expect(saving).resolves.toMatchObject({ status: 'conflict' });
      expect(puts()).toHaveLength(0);
      expect(persistence()).toMatchObject({
        saveState: 'conflict',
        dirty: true,
      });
    });

    it('discard-time flush sends nothing while conflict edits are unresolved', async () => {
      editInOldDocument();
      server.record = row(remote, BASE + 4);
      reloadDocument();
      await persistence().loadCampaign(local.id);
      persistence().markDirty();
      const before = persistence();

      pagehide();

      expect(puts()).toHaveLength(0);
      expect(persistence()).toBe(before);
      expect(marker()).not.toBeNull();
    });

    it('the server was rolled back or restored below our base', async () => {
      editInOldDocument();
      server.record = row(remote, BASE - 2);
      reloadDocument();
      const held = store.getState().campaign as ICampaign;

      await persistence().loadCampaign(local.id);

      await expectHeldConflict(held, BASE - 2);
    });

    it('a different instance at the very same version', async () => {
      editInOldDocument();
      server.record = row(remote, BASE, OTHER_HOST);
      reloadDocument();
      const held = store.getState().campaign as ICampaign;

      await persistence().loadCampaign(local.id);

      await expectHeldConflict(held, BASE);
    });

    it('a copy that cannot say which instance it was built on', async () => {
      editInOldDocument();
      store.getState().setCachedCampaignKey(null);
      reloadDocument();
      const held = store.getState().campaign as ICampaign;

      await persistence().loadCampaign(local.id);

      expect(persistence().saveState).toBe('conflict');
      expect(store.getState().campaign).toBe(held);
      await tickDebounce();
      expect(puts()).toHaveLength(0);
    });

    it('is left only by the player choosing the server version, which discards the local copy', async () => {
      editInOldDocument();
      server.record = row(remote, BASE + 1);
      reloadDocument();
      const held = store.getState().campaign as ICampaign;
      await persistence().loadCampaign(local.id);
      expect(store.getState().campaign).toBe(held);

      // Another reload changes nothing: the claim and the copy are still here.
      reloadDocument();
      await persistence().loadCampaign(local.id);
      expect(persistence().saveState).toBe('conflict');
      expect(store.getState().campaign).toBe(held);

      await expect(persistence().resolveConflictTakeServer()).resolves.toBe(
        true,
      );

      expect(store.getState().campaign?.name).toBe('What The Server Holds');
      expect(persistence()).toMatchObject({
        saveState: 'saved',
        dirty: false,
        saveConflict: null,
        baseVersion: BASE + 1,
      });
      expect(marker()).toBeNull();
      expect(puts()).toHaveLength(0);
    });
  });

  describe('clocks decide nothing', () => {
    const LONG_AGO = '2000-01-01T00:00:00.000Z';
    const FAR_FUTURE = '2100-01-01T00:00:00.000Z';

    it('still raises a conflict when the moved-on server row looks OLDER than the local copy', async () => {
      editInOldDocument();
      server.record = { ...row(remote, BASE + 3), savedAt: LONG_AGO };
      reloadDocument();

      await persistence().loadCampaign(local.id);

      expect(persistence().saveState).toBe('conflict');
      await tickDebounce();
      expect(puts()).toHaveLength(0);
    });

    it('still pushes when the row at our base looks NEWER than the local copy', async () => {
      editInOldDocument();
      server.record = { ...row(remote, BASE), savedAt: FAR_FUTURE };
      reloadDocument();

      await persistence().loadCampaign(local.id);

      expect(persistence()).toMatchObject({
        dirty: true,
        recoveredPendingWrite: true,
      });
      await tickDebounce();
      expect(puts()).toHaveLength(1);
      expect(putBody(0).baseVersion).toBe(BASE);
    });
  });

  describe('nothing owed: the existing load behaviour', () => {
    it("ignores another campaign's marker", async () => {
      editInOldDocument();
      store.getState().setPendingWrite({
        campaignId: 'someone-else',
        baseVersion: BASE,
        editSeq: 3,
      });
      reloadDocument();

      await persistence().loadCampaign(local.id);

      expect(persistence()).toMatchObject({
        saveState: 'saved',
        dirty: false,
        recoveredPendingWrite: false,
      });
      expect(puts()).toHaveLength(0);
    });

    it('ignores a marker on a co-op copy', async () => {
      editInOldDocument({
        ...local,
        coopSession: createHostCoopSession(local.id, 'ABCD'),
      });
      store.getState().setPendingWrite({
        campaignId: local.id,
        baseVersion: BASE,
        editSeq: 3,
      });
      reloadDocument();
      server.record = row(remote, BASE + 1);

      await persistence().loadCampaign(local.id);

      expect(persistence()).toMatchObject({ saveState: 'saved', dirty: false });
      expect(puts()).toHaveLength(0);
    });

    it('treats a missing record as before (404 is not a pending-write conflict)', async () => {
      editInOldDocument();
      server.getStatus = 404;
      reloadDocument();

      await expect(persistence().loadCampaign(local.id)).resolves.toBe(false);

      expect(persistence().saveState).not.toBe('conflict');
      expect(persistence().recoveredPendingWrite).toBe(false);
      expect(puts()).toHaveLength(0);
    });

    it('reads once and writes nothing when there is no marker at all', async () => {
      installStore(local);

      await persistence().loadCampaign(local.id);

      expect(gets()).toHaveLength(1);
      expect(puts()).toHaveLength(0);
    });
  });
});
