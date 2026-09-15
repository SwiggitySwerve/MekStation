/**
 * The client record is refreshed after a committed command is
 * acknowledged (task 6.4 - the admission brief's P-C).
 *
 * Two independent optimistic-concurrency counters exist. The whole-envelope
 * PUT compares the `SerializedCampaign` row `version` (the client holds it
 * as `baseVersion`); the command route compares the journal stream
 * revision. They never met until the source began writing the campaigns
 * row on a client's behalf on a committed acceptance - after which the row
 * moved while the client still held the version it had before the command,
 * so the client's next ordinary auto-save was refused 409 and the accepted
 * mission was invisible until a reload.
 *
 * These rows pin the bridge: the two numbers are NOT mapped onto each
 * other, because a journal revision is not a row version and arithmetic
 * between them would be an invention. The client re-reads the source
 * record through the one existing load path and adopts what the server
 * actually holds.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 *   - Requirement: Client storage is a cache, never a source
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaignCacheKey } from '@/lib/campaign/persistence/campaignCacheKey';
import type { ICampaign, IMission } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { MissionStatus } from '@/types/campaign/enums';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
  __resetCampaignPersistenceCoordinationForTests,
} from '../useCampaignPersistenceStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const BASE_VERSION = 11;
const HOST_INSTANCE_ID = 'instance-host-a';
const ACCEPTED_CONTRACT_ID = 'contract-accepted';

/**
 * The watermark the source materialization stamps on the row (task 6.1).
 * A later whole-envelope PUT that does not echo it is refused 409 by the
 * fence guard, ahead of the compare-and-swap.
 */
const STAMPED_FENCE = { rootPublicRevision: 6 } as const;

/**
 * Journal-side numbers, deliberately unequal to any row version in this
 * file. If either one ever became the cache key's revision or the
 * compare-and-swap token, the rows below would catch it by value.
 */
const RECEIPT_REVISION = 4;
const PUBLIC_HEAD = 9;

// --- Live-campaign seam ---

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
  cachedCampaignKey: ICampaignCacheKey | null;
  setCachedCampaignKey: (key: ICampaignCacheKey | null) => void;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

let campaignStore: StoreApi<MockCampaignStore>;

function registerLiveCampaign(campaign: ICampaign): void {
  campaignStore = createStore<MockCampaignStore>((set, get) => ({
    campaign,
    rehydratedCampaignId: null,
    cachedCampaignKey: { instanceId: HOST_INSTANCE_ID, revision: BASE_VERSION },
    setCachedCampaignKey: (key) => set({ cachedCampaignKey: key }),
    updateCampaign: (updates) => {
      const current = get().campaign;
      set({
        campaign: current ? { ...current, ...updates } : (updates as ICampaign),
      });
    },
    switchCampaign: (next) => set({ campaign: next }),
  }));
  registerCampaignStoreAccessor(
    () => campaignStore as unknown as ReturnType<MockAccessor>,
  );
}

function liveCampaign(): ICampaign | null {
  return campaignStore.getState().campaign;
}

// --- Fetch capture ---

interface CapturedRequest {
  readonly url: string;
  readonly init: RequestInit;
}

interface FakeServer {
  getStatus: number;
  putStatus: number;
  record: SerializedCampaign | null;
  /** The fence the row carries, or `null` for a never-materialized row. */
  storedFence: { readonly rootPublicRevision: number } | null;
}

const captured: CapturedRequest[] = [];

function requestsWithMethod(method: string): CapturedRequest[] {
  return captured.filter(
    (request) => String(request.init.method ?? 'GET').toUpperCase() === method,
  );
}

function getRequests(): CapturedRequest[] {
  return requestsWithMethod('GET');
}

function putRequests(): CapturedRequest[] {
  return requestsWithMethod('PUT');
}

function putBody(request: CapturedRequest): {
  envelope: SerializedCampaign;
  baseVersion: number;
} {
  return JSON.parse(String(request.init.body));
}

function putBaseVersion(request: CapturedRequest): number {
  return putBody(request).baseVersion;
}

function putEnvelope(request: CapturedRequest): SerializedCampaign {
  return putBody(request).envelope;
}

/**
 * The typed 409 the PUT boundary returns for a refused whole-envelope
 * write, carrying the stored record the way the real route does.
 *
 * The fence guard and the compare-and-swap share this one shape by
 * design (task 6.1 kept the existing `conflict` result rather than
 * minting a new refusal kind), which is why `current` matters here: it
 * is how a client learns the fence it was standing behind.
 */
function conflictResponse(
  currentVersion: number,
  current: SerializedCampaign | null,
): Response {
  return {
    ok: false,
    status: 409,
    json: async () => ({
      kind: 'conflict',
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion,
      ...(current === null ? {} : { current }),
    }),
  } as Response;
}

function stubServer(server: FakeServer): void {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const request: CapturedRequest = { url: String(input), init: init ?? {} };
      captured.push(request);
      const method = String(request.init.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        return Promise.resolve({
          ok: server.getStatus >= 200 && server.getStatus < 300,
          status: server.getStatus,
          json: async () => server.record,
        } as Response);
      }
      const body = JSON.parse(String(request.init.body)) as {
        envelope: SerializedCampaign;
        baseVersion: number;
      };
      // The task-6.1 fence guard, judged AHEAD of the compare-and-swap: a
      // PUT that does not echo the stored watermark never saw the
      // materialization that produced the row it is writing over. The
      // ordering is what makes a PURE fence refusal possible - one whose
      // `currentVersion` EQUALS the token the client sent, because the
      // row never moved.
      if (
        server.storedFence !== null &&
        body.envelope.sourceReplayFence?.rootPublicRevision !==
          server.storedFence.rootPublicRevision
      ) {
        return Promise.resolve(
          conflictResponse(body.baseVersion, server.record),
        );
      }
      if (server.putStatus === 409) {
        return Promise.resolve(
          conflictResponse(body.baseVersion + 1, server.record),
        );
      }
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

// --- Arrange helpers ---

/** The mission a source-side acceptance splices into the source record. */
function acceptedMission(): IMission {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: ACCEPTED_CONTRACT_ID,
    name: 'Garrison Duty on Galatea',
    status: MissionStatus.ACTIVE,
    type: 'mission',
    systemId: 'galatea',
    scenarioIds: [],
    description: 'Accepted by the source, never by this client',
    briefing: 'Hold the line',
    startDate: '3025-07-04',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The record the campaigns row holds AFTER the source wrote it inside the
 * acceptance commit: the accepted mission present, and the row version one
 * past the token this client still holds.
 */
function recordAfterAcceptance(campaign: ICampaign): SerializedCampaign {
  const missions = new Map(campaign.missions);
  missions.set(ACCEPTED_CONTRACT_ID, acceptedMission());
  return {
    ...buildSerializedCampaign(
      { ...campaign, missions },
      'device',
      BASE_VERSION + 1,
      undefined,
      { instanceId: HOST_INSTANCE_ID, authority: sourceCampaignAuthority() },
    ),
    sourceReplayFence: STAMPED_FENCE,
  };
}

/**
 * The committed body `/api/campaigns/[id]/commands` answers with. The two
 * revisions ride along exactly as the route emits them and are never read
 * as a row version.
 */
function committedAck(campaignId: string) {
  return {
    kind: 'committed' as const,
    state: { campaignId },
    receiptRevision: RECEIPT_REVISION,
    publicHead: PUBLIC_HEAD,
  };
}

function refresh(campaignId: string): Promise<boolean> {
  return useCampaignPersistenceStore
    .getState()
    .refreshAfterCommittedCommand(committedAck(campaignId));
}

/**
 * A client sitting on the CURRENT row version while holding no fence -
 * the shape a pre-fence copy has after the source materialized the row.
 * Its next write is refused by the watermark, not by the version.
 */
function seedAtMaterializedRowWithoutFence(): void {
  useCampaignPersistenceStore.setState({
    baseVersion: BASE_VERSION + 1,
    sourceReplayFence: null,
  });
}

/** Let the queued read, its `json()` and the state write it drives run. */
async function drainMicrotasks(): Promise<void> {
  for (let tick = 0; tick < 12; tick += 1) {
    await Promise.resolve();
  }
}

describe('the client record is refreshed after a committed command is acknowledged', () => {
  let campaign: ICampaign;
  let server: FakeServer;

  beforeEach(() => {
    jest.useFakeTimers();
    captured.length = 0;
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    campaign = buildPopulatedCampaign();
    registerLiveCampaign(campaign);
    server = {
      getStatus: 200,
      putStatus: 200,
      record: recordAfterAcceptance(campaign),
      storedFence: STAMPED_FENCE,
    };
    stubServer(server);
    useCampaignPersistenceStore.setState({
      campaignId: campaign.id,
      baseVersion: BASE_VERSION,
      saveState: 'saved',
    });
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('carries the row version the source write produced into the next ordinary save', async () => {
    const adopted = await refresh(campaign.id);
    await drainMicrotasks();

    expect(adopted).toBe(true);
    expect(getRequests()).toHaveLength(1);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      BASE_VERSION + 1,
    );

    // The save the player's next edit arms. Before the bridge it carried
    // BASE_VERSION and was refused by a compare-and-swap the client's own
    // command had moved.
    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(1);
    expect(putBaseVersion(puts[0])).toBe(BASE_VERSION + 1);
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('saved');
    expect(state.saveConflict).toBeNull();
  });

  it('echoes the source replay fence the refreshed record carries, so the fence guard accepts', async () => {
    await refresh(campaign.id);
    await drainMicrotasks();

    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(1);
    // Echoed, never invented: the client proves it has SEEN the
    // materialization. A PUT without it is refused ahead of the CAS.
    expect(putEnvelope(puts[0]).sourceReplayFence).toEqual(STAMPED_FENCE);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('leaves a dirty client with a pending write when the refetch does not answer', async () => {
    server.getStatus = 500;
    useCampaignPersistenceStore.getState().markDirty();

    await refresh(campaign.id);
    await drainMicrotasks();

    // NO further mutation - the player typed nothing after the command,
    // which is the ordinary case. The refresh cancelled the armed save on
    // its way in, so if it does not hand the write back here the campaign
    // stays dirty with nothing pending until an edit that may never come.
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(1);
    expect(putBaseVersion(puts[0])).toBe(BASE_VERSION);
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('does not retry a fence refusal that names the very token the client sent', async () => {
    // The pure fence case: the row never moved, so `currentVersion` comes
    // back EQUAL to the compare-and-swap token this client sent. Any
    // "the versions match, so try again" heuristic would loop forever on
    // it, because the missing thing is the watermark, not the version.
    seedAtMaterializedRowWithoutFence();

    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(1);
    expect(putEnvelope(puts[0]).sourceReplayFence).toBeUndefined();
    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.saveConflict?.currentVersion).toBe(BASE_VERSION + 1);
    expect(putBaseVersion(puts[0])).toBe(BASE_VERSION + 1);
  });

  it('restores a saveable client when the server record is taken after a fence refusal', async () => {
    seedAtMaterializedRowWithoutFence();
    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();
    expect(useCampaignPersistenceStore.getState().saveState).toBe('conflict');

    // The refusal carried the stored record, fence and all, so taking it
    // is what lets the next write prove it has seen the materialization.
    // `metadataFrom` drops the fence, which is exactly why it is held as
    // its own store field rather than inside the metadata projection.
    await useCampaignPersistenceStore.getState().resolveConflictTakeServer();
    await drainMicrotasks();

    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(2);
    expect(putEnvelope(puts[1]).sourceReplayFence).toEqual(STAMPED_FENCE);
    expect(putBaseVersion(puts[1])).toBe(BASE_VERSION + 1);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('renders the accepted mission from the refreshed record without a reload', async () => {
    expect(liveCampaign()?.missions.has(ACCEPTED_CONTRACT_ID)).toBe(false);

    await refresh(campaign.id);
    await drainMicrotasks();

    const refreshed = liveCampaign();
    expect(refreshed?.missions.has(ACCEPTED_CONTRACT_ID)).toBe(true);
    expect(refreshed?.missions.get(ACCEPTED_CONTRACT_ID)?.name).toBe(
      'Garrison Duty on Galatea',
    );
  });

  it('leaves the pre-command token and the conflict path intact when the refetch fails', async () => {
    server.getStatus = 500;
    server.putStatus = 409;

    const adopted = await refresh(campaign.id);
    await drainMicrotasks();

    // Nothing is adopted and nothing is overwritten: a read that did not
    // answer is not evidence about the row.
    expect(adopted).toBe(false);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      BASE_VERSION,
    );
    expect(putRequests()).toHaveLength(0);

    useCampaignPersistenceStore.getState().markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    const puts = putRequests();
    expect(puts).toHaveLength(1);
    expect(putBaseVersion(puts[0])).toBe(BASE_VERSION);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('conflict');
  });

  it('ignores an acknowledgement for a different campaign', async () => {
    const held = liveCampaign();

    const adopted = await refresh('some-other-campaign');
    await drainMicrotasks();

    expect(adopted).toBe(false);
    expect(captured).toHaveLength(0);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      BASE_VERSION,
    );
    expect(liveCampaign()).toBe(held);
  });

  it('keys the refreshed cache by the row version, not by either journal number', async () => {
    await refresh(campaign.id);
    await drainMicrotasks();

    const key = campaignStore.getState().cachedCampaignKey;
    expect(key).toEqual({
      instanceId: HOST_INSTANCE_ID,
      revision: BASE_VERSION + 1,
    });
    // The same number the compare-and-swap uses, and neither of the two
    // the acknowledgement carried.
    expect(key?.revision).toBe(
      useCampaignPersistenceStore.getState().baseVersion,
    );
    expect(key?.revision).not.toBe(RECEIPT_REVISION);
    expect(key?.revision).not.toBe(PUBLIC_HEAD);
  });
});
