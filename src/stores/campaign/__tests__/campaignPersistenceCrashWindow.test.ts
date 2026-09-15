/**
 * Discard-time flush of pending campaign mutations (task 1.6, P-A)
 *
 * A client mutation only arms a 2s debounce (`markDirty` ->
 * `AUTO_SAVE_DEBOUNCE_MS`); a hard reload or tab close inside that window
 * discarded every mutation since the last PUT. These rows pin the flush:
 * one bounded, best-effort, never-acknowledged keepalive PUT of the
 * CURRENT in-memory envelope, skipped with a typed diagnostic when the
 * browser would reject the body outright.
 *
 * The first block exercises the store action DIRECTLY, without a DOM
 * event - which is why it is an action rather than a listener body. The
 * second drives the same behaviour through the real `pagehide` and
 * `visibilitychange` events the wiring module registers, so the listener
 * install/uninstall pair is covered by the same file.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 *   - Requirement: Pending client mutations are flushed before the document is discarded
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '../campaignPersistenceWiring';
import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  KEEPALIVE_FLUSH_BODY_CAP_BYTES,
  useCampaignPersistenceStore,
  __resetCampaignPersistenceCoordinationForTests,
} from '../useCampaignPersistenceStore';

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

// --- Live-campaign seam ---

interface MockCampaignStore {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

const switchCampaignSpy = jest.fn();

function makeMockCampaignStore(
  initial: ICampaign | null,
): StoreApi<MockCampaignStore> {
  return createStore<MockCampaignStore>((set, get) => ({
    campaign: initial,
    updateCampaign: (updates) => {
      const current = get().campaign;
      set({
        campaign: current ? { ...current, ...updates } : (updates as ICampaign),
      });
    },
    switchCampaign: (nextCampaign) => {
      switchCampaignSpy(nextCampaign);
      set({ campaign: nextCampaign });
    },
  }));
}

function registerLiveCampaign(campaign: ICampaign | null): void {
  const store = makeMockCampaignStore(campaign);
  registerCampaignStoreAccessor(
    () => store as unknown as ReturnType<MockAccessor>,
  );
}

// --- Fetch capture ---

const BASE_VERSION = 7;

interface CapturedRequest {
  readonly url: string;
  readonly init: RequestInit;
}

const captured: CapturedRequest[] = [];

/**
 * A plausible saved record: if the flush ever READ its response, adopting
 * this body would move `baseVersion` to 99 and clear `dirty`.
 */
function savedResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      schemaVersion: 1,
      campaignId: 'flushed-campaign',
      savedAt: new Date().toISOString(),
      originDeviceId: 'device',
      version: 99,
      body: {},
    }),
  } as Response;
}

/**
 * The typed 409 the PUT boundary returns when the compare-and-swap
 * refuses a stale write - which is exactly what a landed keepalive flush
 * leaves behind, since the client never read its response and so never
 * advanced `baseVersion`.
 */
function conflictResponse(): Response {
  return {
    ok: false,
    status: 409,
    json: async () => ({
      kind: 'conflict',
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: BASE_VERSION + 1,
      current: {
        schemaVersion: 1,
        campaignId: 'flushed-campaign',
        savedAt: new Date().toISOString(),
        originDeviceId: 'device',
        version: BASE_VERSION + 1,
        body: {},
      },
    }),
  } as Response;
}

/** Captured requests by HTTP verb - the reconciliation also READS. */
function requestsWithMethod(method: string): CapturedRequest[] {
  return captured.filter(
    (request) => String(request.init.method ?? 'GET').toUpperCase() === method,
  );
}

function putRequests(): CapturedRequest[] {
  return requestsWithMethod('PUT');
}

function getRequests(): CapturedRequest[] {
  return requestsWithMethod('GET');
}

function stubFetch(): void {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} });
      return Promise.resolve(savedResponse());
    });
}

// --- Arrange helpers ---

/** The discard-time flush, invoked the way a discarding document would. */
function flush(): void {
  useCampaignPersistenceStore.getState().flushPendingMutations();
}

/**
 * Seed a dirty store over a live campaign, with the auto-save debounce
 * armed and nothing saved yet - the exact state the crash window loses.
 */
function seedDirtyCampaign(campaign: ICampaign): void {
  registerLiveCampaign(campaign);
  useCampaignPersistenceStore.setState({
    campaignId: campaign.id,
    baseVersion: BASE_VERSION,
  });
  useCampaignPersistenceStore.getState().markDirty();
}

/**
 * A campaign whose serialized body clears the 64 KiB keepalive budget.
 * `processedBattleIds` rides the serialized body verbatim, so it is the
 * cheapest stand-in for the unbounded per-campaign collections that will
 * eventually push a real envelope past the cap.
 */
function makeOversizedCampaign(base: ICampaign): ICampaign {
  const filler = 'battle-'.padEnd(256, 'x');
  return {
    ...base,
    processedBattleIds: Array.from(
      { length: 400 },
      (_, index) => `${filler}${index}`,
    ),
  };
}

/** Let a queued save run its fetch, its json() read and its state write. */
async function drainMicrotasks(): Promise<void> {
  for (let tick = 0; tick < 12; tick += 1) {
    await Promise.resolve();
  }
}

interface FlushBody {
  envelope: { campaignId: string; version: number; body: { name: string } };
  baseVersion: number;
}

function parseFlushBody(request: CapturedRequest): FlushBody {
  return JSON.parse(String(request.init.body));
}

describe('pending client mutations are flushed before the document is discarded', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    jest.useFakeTimers();
    captured.length = 0;
    switchCampaignSpy.mockClear();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    stubFetch();
    campaign = { ...buildPopulatedCampaign(), name: 'Pending Rename' };
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('issues exactly one keepalive PUT of the pending envelope', () => {
    seedDirtyCampaign(campaign);

    flush();

    expect(captured).toHaveLength(1);
    const [request] = captured;
    expect(request.url).toBe(`/api/campaigns/${campaign.id}`);
    expect(request.init.method).toBe('PUT');
    expect(request.init.keepalive).toBe(true);

    const payload = parseFlushBody(request);
    expect(payload.baseVersion).toBe(BASE_VERSION);
    expect(payload.envelope.campaignId).toBe(campaign.id);
    expect(payload.envelope.version).toBe(BASE_VERSION + 1);
    // The CURRENT in-memory campaign, not the last-persisted one.
    expect(payload.envelope.body.name).toBe('Pending Rename');
  });

  it('clears the armed debounce so the timer cannot also write', () => {
    seedDirtyCampaign(campaign);

    flush();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS * 2);

    expect(captured).toHaveLength(1);
  });

  it('issues at most one write per pending set, however often it is called', () => {
    seedDirtyCampaign(campaign);

    flush();
    flush();

    expect(captured).toHaveLength(1);
  });

  it('flushes again once a new mutation makes the campaign dirty', () => {
    seedDirtyCampaign(campaign);
    flush();

    useCampaignPersistenceStore.getState().markDirty();
    flush();

    expect(captured).toHaveLength(2);
  });

  it('issues no write when the client is not dirty', () => {
    registerLiveCampaign(campaign);
    useCampaignPersistenceStore.setState({
      campaignId: campaign.id,
      baseVersion: BASE_VERSION,
    });

    flush();

    expect(captured).toHaveLength(0);
  });

  it('issues no write for a co-op campaign, whose writer is the session', () => {
    const coopCampaign: ICampaign = {
      ...campaign,
      coopSession: createHostCoopSession(campaign.id, 'ABCD'),
    };
    seedDirtyCampaign(coopCampaign);

    flush();

    expect(captured).toHaveLength(0);
  });

  it('issues no write for an unadopted legacy copy, and records no diagnostic', () => {
    seedDirtyCampaign(campaign);
    useCampaignPersistenceStore.setState({ legacyUnadopted: true });

    flush();

    // A silent no-op, NOT a skip diagnostic: the over-cap reason is the
    // only condition the store reports, because it is the only one where
    // pending work was measured and then abandoned. Here the whole PUT
    // path is closed - `runSave` already refuses an unadopted copy - so a
    // flush would be the FIRST write to make the server hold a record the
    // D8 adoption gate says it must not acquire by accident.
    expect(captured).toHaveLength(0);
    expect(useCampaignPersistenceStore.getState().flushSkip).toBeNull();
    // Still dirty, and the armed timer is left alone - it is harmless,
    // because the debounced save refuses the same copy for the same reason.
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS * 2);
    expect(captured).toHaveLength(0);
  });

  it('skips an over-cap envelope with a typed diagnostic rather than firing it', () => {
    const oversized = makeOversizedCampaign(campaign);
    seedDirtyCampaign(oversized);

    flush();

    expect(captured).toHaveLength(0);
    const { flushSkip } = useCampaignPersistenceStore.getState();
    expect(flushSkip).not.toBeNull();
    expect(flushSkip?.reason).toBe('envelope-over-keepalive-cap');
    expect(flushSkip?.capBytes).toBe(KEEPALIVE_FLUSH_BODY_CAP_BYTES);
    expect(flushSkip?.byteLength).toBeGreaterThan(
      KEEPALIVE_FLUSH_BODY_CAP_BYTES,
    );
    expect(flushSkip?.campaignId).toBe(oversized.id);
  });

  it('leaves the ordinary debounced save armed when it skips an over-cap envelope', async () => {
    // The armed save has NO keepalive cap - `putLiveCampaign` is a plain
    // fetch - so cancelling it on the branch that then fires nothing would
    // destroy a write that was about to succeed, and lose a mutation this
    // change was written to rescue.
    const oversized = makeOversizedCampaign(campaign);
    seedDirtyCampaign(oversized);

    flush();
    expect(captured).toHaveLength(0);
    expect(useCampaignPersistenceStore.getState().flushSkip?.reason).toBe(
      'envelope-over-keepalive-cap',
    );

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(captured).toHaveLength(1);
    // The ordinary uncapped PUT, not a second keepalive attempt.
    expect(captured[0].init.keepalive).toBeUndefined();
  });

  it('never claims the revision it did not read: dirty and baseVersion survive', async () => {
    seedDirtyCampaign(campaign);

    flush();
    // Let any response settle. A flush that read it would applySavedRecord.
    await Promise.resolve();
    await Promise.resolve();

    const state = useCampaignPersistenceStore.getState();
    expect(state.dirty).toBe(true);
    expect(state.baseVersion).toBe(BASE_VERSION);
    expect(state.metadata.version).toBe(0);
    expect(state.saveState).not.toBe('saved');
    expect(switchCampaignSpy).not.toHaveBeenCalled();
  });
});

// --- DOM discard triggers ---

function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
}

function firePagehide(): void {
  window.dispatchEvent(new Event('pagehide'));
}

function fireVisibilityChange(state: 'hidden' | 'visible'): void {
  setVisibility(state);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('the document-discard events that drive the flush', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    jest.useFakeTimers();
    captured.length = 0;
    setVisibility('visible');
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    stubFetch();
    campaign = { ...buildPopulatedCampaign(), name: 'Pending Rename' };
    seedDirtyCampaign(campaign);
    installCampaignPersistenceWiring();
  });

  afterEach(() => {
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('flushes on pagehide', () => {
    firePagehide();

    expect(captured).toHaveLength(1);
    expect(captured[0].init.keepalive).toBe(true);
  });

  it('flushes on a hidden visibility transition', () => {
    fireVisibilityChange('hidden');

    expect(captured).toHaveLength(1);
  });

  it('does not flush when the document becomes visible', () => {
    fireVisibilityChange('visible');

    expect(captured).toHaveLength(0);
  });

  it('issues at most one write across a pagehide immediately followed by a hidden transition', () => {
    firePagehide();
    fireVisibilityChange('hidden');

    expect(captured).toHaveLength(1);
  });

  it('stops flushing once the wiring is uninstalled', () => {
    uninstallCampaignPersistenceWiring();

    firePagehide();
    fireVisibilityChange('hidden');

    expect(captured).toHaveLength(0);
  });

  it('re-arms the ordinary save when a document the flush assumed lost becomes visible again', async () => {
    // A hidden transition fires on every ordinary tab switch, where the
    // document is NOT discarded. The flush was never an acknowledgement,
    // so an acknowledged save is still owed - and nothing else re-arms the
    // debounce until the next mutation, which may never come.
    fireVisibilityChange('hidden');
    expect(putRequests()).toHaveLength(1);

    fireVisibilityChange('visible');
    // The reconciliation reads the record back before it arms anything,
    // so the read has to settle before the debounce can be advanced.
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(2);
    // The ordinary acknowledged PUT, not a second best-effort flush.
    expect(puts[1].init.keepalive).toBeUndefined();
  });

  it('reaches the existing conflict flow when the record cannot be read back and the re-armed save is stale', async () => {
    fireVisibilityChange('hidden');
    // The keepalive write landed: the server counter moved, and the client
    // - which never read that response - still holds the old baseVersion.
    // Here the reconciliation's read gives no usable answer either, so
    // nothing is adopted and the save goes out on the old token: the
    // pre-existing path, pinned.
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        captured.push({ url: String(input), init: init ?? {} });
        return Promise.resolve(conflictResponse());
      });

    fireVisibilityChange('visible');
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    // Pinned, not redesigned: this lands in the conflict state the store
    // already models, carrying the server's typed reason and its record,
    // and take-server remains the single resolution the UI already offers.
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.saveConflict?.reason).toBe('base-state-unavailable');
    expect(state.saveConflict?.recoveryAction).toBe('resync-to-active-head');
    expect(state.conflictServerRecord?.version).toBe(BASE_VERSION + 1);
    expect(state.dirty).toBe(true);
  });
});
// --- Reconciling a flush the document survived ---

/** Stands in for the host singleton the server pins on every write. */
const HOST_INSTANCE_ID = 'host-instance';

/** Everything the fake server answers, in one mutable place. */
interface FakeServer {
  /** Status for `GET /api/campaigns/<id>`. */
  getStatus: number;
  /** The record that GET answers with. */
  record: SerializedCampaign | null;
  /** Status for the reconciled `PUT`. */
  putStatus: number;
}

interface CampaignPutBody {
  envelope: SerializedCampaign;
  baseVersion: number;
}

function parsePutBody(request: CapturedRequest): CampaignPutBody {
  return JSON.parse(String(request.init.body)) as CampaignPutBody;
}

/**
 * The row the server holds once a flush PUT has landed: the envelope
 * VERBATIM at `baseVersion + 1`, with the host's own instance and
 * authority pinned over the client's proposal - exactly the record
 * `prepareCampaignWrite` builds and `saveCampaign` stores.
 */
function storedFromFlush(request: CapturedRequest): SerializedCampaign {
  const { envelope, baseVersion } = parsePutBody(request);
  return {
    ...envelope,
    version: baseVersion + 1,
    instanceId: HOST_INSTANCE_ID,
    authority: sourceCampaignAuthority(),
  };
}

function stubServer(server: FakeServer): void {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const request: CapturedRequest = {
        url: String(input),
        init: init ?? {},
      };
      captured.push(request);
      const method = String(request.init.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        return Promise.resolve({
          ok: server.getStatus >= 200 && server.getStatus < 300,
          status: server.getStatus,
          json: async () => server.record,
        } as Response);
      }
      if (server.putStatus === 409) {
        return Promise.resolve(conflictResponse());
      }
      // An accepted write lands one past whatever token it carried.
      const body = parsePutBody(request);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          ...body.envelope,
          version: body.baseVersion + 1,
          instanceId: HOST_INSTANCE_ID,
          authority: sourceCampaignAuthority(),
        }),
      } as Response);
    });
}

/** The compare-and-swap token a captured PUT carried. */
function putBaseVersion(request: CapturedRequest): number {
  return parsePutBody(request).baseVersion;
}

function reconcile(): void {
  useCampaignPersistenceStore.getState().reconcileAfterDiscardFlush();
}

describe('a flush the document survives is acknowledged by reading the record it wrote', () => {
  let campaign: ICampaign;
  let server: FakeServer;

  beforeEach(() => {
    jest.useFakeTimers();
    captured.length = 0;
    switchCampaignSpy.mockClear();
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    server = { getStatus: 200, record: null, putStatus: 200 };
    stubServer(server);
    campaign = { ...buildPopulatedCampaign(), name: 'Pending Rename' };
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('adopts the revision the flush provably earned, so the reconciled save is acknowledged', async () => {
    seedDirtyCampaign(campaign);
    flush();
    server.record = storedFromFlush(putRequests()[0]);

    reconcile();
    await drainMicrotasks();

    // Earned by READING, never by assuming: the record the server answers
    // with is the envelope this client sent, at the revision its own write
    // would have produced.
    expect(getRequests()).toHaveLength(1);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      BASE_VERSION + 1,
    );
    // The token is adopted; the ACKNOWLEDGEMENT is not. An ordinary save
    // is still owed, and is still pending.
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(2);
    expect(puts[1].init.keepalive).toBeUndefined();
    // The whole point: N + 1, so the compare-and-swap accepts it.
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION + 1);
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('saved');
    expect(state.saveConflict).toBeNull();
    expect(state.conflictServerRecord).toBeNull();
    expect(state.dirty).toBe(false);
  });

  it('refuses to adopt a revision another writer produced, and the conflict flow still runs', async () => {
    seedDirtyCampaign(campaign);
    flush();
    // Same revision, different content: another device won the race. The
    // version alone would have been enough to fool a version-only check,
    // which is precisely why the envelope is digested too.
    const landed = storedFromFlush(putRequests()[0]);
    server.record = {
      ...landed,
      body: { ...landed.body, name: 'Written Elsewhere' },
    };
    server.putStatus = 409;

    reconcile();
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    // The read happened, and was REJECTED as evidence.
    expect(getRequests()).toHaveLength(1);
    const puts = putRequests();
    expect(puts).toHaveLength(2);
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION);
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.saveConflict?.reason).toBe('base-state-unavailable');
    expect(state.conflictServerRecord?.version).toBe(BASE_VERSION + 1);
    expect(state.dirty).toBe(true);
  });

  it('adopts the earned revision even when a mutation arrived after the flush', async () => {
    seedDirtyCampaign(campaign);
    flush();
    server.record = storedFromFlush(putRequests()[0]);
    // A further edit before the tab came back. It clears the
    // already-flushed flag and arms its own save on the STALE token -
    // which is the save the reconciliation has to take over.
    useCampaignPersistenceStore.getState().markDirty();

    reconcile();
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    // Exactly one save, not the mutation's stale one AND a reconciled one.
    expect(puts).toHaveLength(2);
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION + 1);
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('saved');
    expect(state.saveConflict).toBeNull();
  });

  it('adopts nothing when the record still sits at the version the flush wrote against', async () => {
    seedDirtyCampaign(campaign);
    flush();
    // The flush never landed. Today's behaviour is the right one here:
    // send the old token and let the server judge it.
    const landed = storedFromFlush(putRequests()[0]);
    server.record = { ...landed, version: BASE_VERSION };

    reconcile();
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(2);
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION);
  });

  it('adopts nothing when the record cannot be read back at all', async () => {
    seedDirtyCampaign(campaign);
    flush();
    server.getStatus = 500;
    server.record = null;

    reconcile();
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(2);
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION);
    // A failed read is not an error the player is shown: the save that
    // follows is what decides the outcome.
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('reads nothing when no flush was ever issued', async () => {
    seedDirtyCampaign(campaign);

    reconcile();
    await drainMicrotasks();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS * 2);
    await drainMicrotasks();

    expect(getRequests()).toHaveLength(0);
  });
});
