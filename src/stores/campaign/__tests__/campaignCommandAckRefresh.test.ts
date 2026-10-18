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
import type { IFullUnit } from '@/services/units/CanonicalUnitService';
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
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// Canonical source I/O for the staged-maxima rows: every lookup is held
// until the test answers it, so a row can act while resolution is pending.
const mockCanonicalLookups: Array<{
  readonly id: string;
  readonly answer: (unit: unknown) => void;
}> = [];
jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getById: (id: string) =>
      new Promise((answer) => {
        mockCanonicalLookups.push({ id, answer });
      }),
    getIndex: async () => [],
  }),
}));

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

// --- P2CF2: the guarded refresh a mounted receipt consumer awaits ---

const CANONICAL_REF = 'test-medium-tmd-1a';

/** 50-ton canonical design the staged maxima resolve through `adaptUnit`. */
function canonicalUnit(): IFullUnit {
  return {
    id: CANONICAL_REF,
    chassis: 'Testmech',
    variant: 'TMD-1A',
    tonnage: 50,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: 250 },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 6 },
        LEFT_ARM: 12,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 5, jump: 0 },
    equipment: [{ id: 'medium-laser', location: 'CENTER_TORSO' }],
  } as unknown as IFullUnit;
}

interface IDeferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
}

function deferred<T>(): IDeferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/**
 * The guarded receipt refresh holds its context; flipping `current` is
 * the mounted binding becoming stale (unmount, rejoin, new view).
 */
function refreshContext(): { current: boolean; isCurrent: () => boolean } {
  const context = { current: true, isCurrent: () => context.current };
  return context;
}

/** Waits a bounded number of turns for an owner step the row can observe. */
async function until(reached: () => boolean): Promise<void> {
  for (let turn = 0; turn < 200; turn += 1) {
    if (reached()) return;
    await Promise.resolve();
  }
  throw new Error('the awaited owner step never happened');
}

describe('a guarded refresh never writes for a stale binding (P2CF2)', () => {
  let campaign: ICampaign;
  /** Answers queued GETs in order; an unanswered GET stays held. */
  let gets: IDeferred<Response>[];
  let getIssued: IDeferred<void>;
  /** When set, a GET answers this record at once instead of being held. */
  let autoAnswer: SerializedCampaign | null;

  function okResponse(record: SerializedCampaign): Response {
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(JSON.stringify(record)),
    } as Response;
  }

  function recordAt(
    version: number,
    rosterUnits: SerializedCampaign['body']['rosterProjection'] = undefined,
  ): SerializedCampaign {
    return {
      ...buildSerializedCampaign(
        { ...campaign, name: `Row v${version}` },
        'device',
        version,
        rosterUnits,
        { instanceId: HOST_INSTANCE_ID, authority: sourceCampaignAuthority() },
      ),
      sourceReplayFence: STAMPED_FENCE,
    };
  }

  function rosterWithMissingMaxima(): SerializedCampaign['body']['rosterProjection'] {
    return {
      campaignId: campaign.id,
      units: [
        {
          unitId: 'unit-1',
          unitName: 'Testmech TMD-1A',
          chassisVariant: 'TMD-1A',
          readiness: 'Ready',
          unitRef: CANONICAL_REF,
          unitSource: 'canonical',
        },
      ],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    };
  }

  /** Every write a stale refresh must not make, read in one place. */
  function observable() {
    const state = useCampaignPersistenceStore.getState();
    return {
      live: liveCampaign(),
      cachedKey: campaignStore.getState().cachedCampaignKey,
      roster: useCampaignRosterStore.getState(),
      campaignId: state.campaignId,
      baseVersion: state.baseVersion,
      fence: state.sourceReplayFence,
      saveState: state.saveState,
      errorMessage: state.errorMessage,
      dirty: state.dirty,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    captured.length = 0;
    mockCanonicalLookups.length = 0;
    __resetCampaignPersistenceCoordinationForTests();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    campaign = buildPopulatedCampaign();
    registerLiveCampaign(campaign);
    gets = [];
    getIssued = deferred<void>();
    autoAnswer = null;
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const request: CapturedRequest = {
          url: String(input),
          init: init ?? {},
        };
        captured.push(request);
        if (String(request.init.method ?? 'GET').toUpperCase() !== 'GET') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => recordAt(BASE_VERSION + 9),
          } as Response);
        }
        if (autoAnswer) return Promise.resolve(okResponse(autoAnswer));
        const answer = deferred<Response>();
        gets.push(answer);
        getIssued.resolve();
        return answer.promise;
      });
    useCampaignPersistenceStore.setState({
      campaignId: campaign.id,
      baseVersion: BASE_VERSION,
      saveState: 'saved',
    });
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function guardedRefresh(context: {
    isCurrent: () => boolean;
  }): Promise<boolean> {
    return useCampaignPersistenceStore
      .getState()
      .refreshAfterCommittedCommand(committedAck(campaign.id), context);
  }

  it('does not start for a binding that is already stale and keeps the armed save', async () => {
    useCampaignPersistenceStore.getState().markDirty();
    autoAnswer = recordAt(BASE_VERSION + 1);
    const context = refreshContext();
    context.current = false;

    const adopted = await guardedRefresh(context);
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await drainMicrotasks();

    expect(adopted).toBe(false);
    expect(getRequests()).toHaveLength(0);
    // The ordinary save the edit armed still goes out at the held token.
    expect(putRequests().map(putBaseVersion)).toEqual([BASE_VERSION]);
  });

  it.each(['the GET', 'the JSON body'])(
    'writes nothing and re-arms nothing when the binding goes stale while %s is held',
    async (held) => {
      useCampaignPersistenceStore.getState().markDirty();
      const before = observable();
      const context = refreshContext();
      const refresh = guardedRefresh(context);
      await getIssued.promise;
      const body = deferred<SerializedCampaign>();
      let bodyRead = false;

      if (held === 'the GET') {
        context.current = false;
        gets[0].resolve(okResponse(recordAt(BASE_VERSION + 1)));
      } else {
        gets[0].resolve({
          ok: true,
          status: 200,
          json: () => {
            bodyRead = true;
            return body.promise;
          },
        } as Response);
        await until(() => bodyRead);
        context.current = false;
        body.resolve(recordAt(BASE_VERSION + 1));
      }
      const adopted = await refresh;
      jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
      await drainMicrotasks();

      expect(adopted).toBe(false);
      expect(observable()).toEqual(before);
      expect(observable().live).toBe(before.live);
      expect(putRequests()).toHaveLength(0);
    },
  );

  it('records no not-found status for a stale binding whose record is gone', async () => {
    const before = observable();
    const context = refreshContext();
    const refresh = guardedRefresh(context);
    await getIssued.promise;

    context.current = false;
    gets[0].resolve({ ok: false, status: 404 } as Response);
    const adopted = await refresh;

    expect(adopted).toBe(false);
    expect(observable()).toEqual(before);
    expect(useCampaignPersistenceStore.getState().legacyUnadopted).toBe(false);
  });

  it('starts no network-backed maxima resolution once the binding is stale', async () => {
    const context = refreshContext();
    const refresh = guardedRefresh(context);
    await getIssued.promise;
    const body = deferred<SerializedCampaign>();
    let bodyRead = false;
    gets[0].resolve({
      ok: true,
      status: 200,
      json: () => {
        bodyRead = true;
        return body.promise;
      },
    } as Response);
    await until(() => bodyRead);

    context.current = false;
    body.resolve(recordAt(BASE_VERSION + 1, rosterWithMissingMaxima()));
    const adopted = await refresh;

    expect(adopted).toBe(false);
    expect(mockCanonicalLookups).toHaveLength(0);
  });

  it('records no error for a stale binding whose read fails', async () => {
    const before = observable();
    const context = refreshContext();
    const refresh = guardedRefresh(context);
    await getIssued.promise;

    context.current = false;
    gets[0].reject(new Error('network down'));
    const adopted = await refresh;

    expect(adopted).toBe(false);
    expect(observable()).toEqual(before);
  });

  it('stages missing maxima into the installed record without updateCampaign or a PUT', async () => {
    const updateCampaign = jest.spyOn(
      campaignStore.getState(),
      'updateCampaign',
    );
    const refresh = guardedRefresh(refreshContext());
    await getIssued.promise;
    gets[0].resolve(
      okResponse(recordAt(BASE_VERSION + 1, rosterWithMissingMaxima())),
    );
    await until(() => mockCanonicalLookups.length > 0);

    mockCanonicalLookups[0].answer(canonicalUnit());
    const adopted = await refresh;

    expect(adopted).toBe(true);
    expect(liveCampaign()?.unitMaxStates?.['unit-1']).toBeDefined();
    expect(useCampaignRosterStore.getState().units[0]?.unitId).toBe('unit-1');
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
      BASE_VERSION + 1,
    );
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(putRequests()).toHaveLength(0);
  });

  it('writes nothing when the binding goes stale while maxima are resolving', async () => {
    const updateCampaign = jest.spyOn(
      campaignStore.getState(),
      'updateCampaign',
    );
    const before = observable();
    const context = refreshContext();
    const refresh = guardedRefresh(context);
    await getIssued.promise;
    gets[0].resolve(
      okResponse(recordAt(BASE_VERSION + 1, rosterWithMissingMaxima())),
    );
    await until(() => mockCanonicalLookups.length > 0);

    context.current = false;
    mockCanonicalLookups[0].answer(canonicalUnit());
    const adopted = await refresh;

    expect(adopted).toBe(false);
    expect(observable()).toEqual(before);
    expect(observable().live).toBe(before.live);
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(putRequests()).toHaveLength(0);
  });

  it('does not overwrite a newer record a later load adopted while it was in flight', async () => {
    const refresh = guardedRefresh(refreshContext());
    await getIssued.promise;

    const load = useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);
    await until(() => gets.length > 1);
    gets[1].resolve(okResponse(recordAt(BASE_VERSION + 2)));
    await load;
    const afterLoad = observable();
    gets[0].resolve(okResponse(recordAt(BASE_VERSION + 1)));
    const adopted = await refresh;

    expect(afterLoad.baseVersion).toBe(BASE_VERSION + 2);
    expect(adopted).toBe(false);
    expect(observable()).toEqual(afterLoad);
    expect(liveCampaign()?.name).toBe(`Row v${BASE_VERSION + 2}`);
  });

  it('does not write into a store that was reset while it was in flight', async () => {
    const refresh = guardedRefresh(refreshContext());
    await getIssued.promise;

    useCampaignPersistenceStore.getState().reset();
    // An edit after the reset names the same campaign again; the refresh
    // still belongs to the store state the reset discarded.
    useCampaignPersistenceStore.getState().markDirty();
    const afterReset = observable();
    gets[0].resolve(okResponse(recordAt(BASE_VERSION + 1)));
    const adopted = await refresh;

    expect(afterReset.campaignId).toBe(campaign.id);
    expect(adopted).toBe(false);
    expect(observable()).toEqual(afterReset);
  });

  it('does not start when the store is reset before its queued start', async () => {
    autoAnswer = recordAt(BASE_VERSION + 1);
    const refresh = guardedRefresh(refreshContext());
    useCampaignPersistenceStore.getState().reset();
    const afterReset = observable();

    const adopted = await refresh;

    expect(adopted).toBe(false);
    expect(getRequests()).toHaveLength(0);
    expect(observable()).toEqual(afterReset);
  });

  it.each([
    ['the live record', () => campaignStore.getState().campaign, true],
    ['the roster', () => useCampaignRosterStore.getState().units, false],
    ['the cache key', () => campaignStore.getState().cachedCampaignKey, false],
  ])(
    'stops at once when a subscriber invalidates the binding on %s write',
    async (label, watched, rosterUntouched) => {
      autoAnswer = recordAt(BASE_VERSION + 1, rosterWithMissingMaxima());
      const context = refreshContext();
      const held = watched();
      const invalidate = (): void => {
        if (watched() !== held) context.current = false;
      };
      campaignStore.subscribe(invalidate);
      useCampaignRosterStore.subscribe(invalidate);
      const before = observable();
      const refresh = guardedRefresh(context);
      await until(() => mockCanonicalLookups.length > 0);
      mockCanonicalLookups[0].answer(canonicalUnit());

      const adopted = await refresh;

      expect(adopted).toBe(false);
      // Nothing after the write that invalidated it.
      expect(useCampaignRosterStore.getState() === before.roster).toBe(
        rosterUntouched,
      );
      expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
        BASE_VERSION,
      );
      expect(
        useCampaignPersistenceStore.getState().sourceReplayFence,
      ).toBeNull();
      expect(campaignStore.getState().cachedCampaignKey).toEqual(
        label === 'the cache key'
          ? { instanceId: HOST_INSTANCE_ID, revision: BASE_VERSION + 1 }
          : before.cachedKey,
      );
    },
  );

  // --- CF14: a discard flush adopted while an older guarded read is held ---

  /** The discard flush's envelope as the row would hold it had it landed. */
  function flushedRecord(): SerializedCampaign {
    const flush = putRequests().find((request) => request.init.keepalive);
    if (!flush) throw new Error('no discard flush was sent');
    return {
      ...putEnvelope(flush),
      version: BASE_VERSION + 1,
      instanceId: HOST_INSTANCE_ID,
      authority: sourceCampaignAuthority(),
    };
  }

  function ordinaryPuts(): CapturedRequest[] {
    return putRequests().filter((request) => !request.init.keepalive);
  }

  /** Dirty, flushed on discard, then a guarded refresh starts its read. */
  async function flushThenStartGuardedRefresh(): Promise<{
    readonly refresh: Promise<boolean>;
  }> {
    useCampaignPersistenceStore.getState().markDirty();
    useCampaignPersistenceStore.getState().flushPendingMutations();
    const refresh = guardedRefresh(refreshContext());
    await getIssued.promise;
    return { refresh };
  }

  /** The document returns; its reconciliation read is answered with `record`. */
  async function reconcileWith(record: SerializedCampaign): Promise<void> {
    useCampaignPersistenceStore.getState().reconcileAfterDiscardFlush();
    await until(() => gets.length === 2);
    gets[1].resolve(okResponse(record));
    await drainMicrotasks();
  }

  it.each(['the GET', 'the staged maxima'])(
    'an older guarded refresh held on %s writes nothing over a discard flush adopted meanwhile',
    async (held) => {
      if (held === 'the staged maxima') {
        // No cache key names the held row, so its read stages maxima.
        campaignStore.setState({ cachedCampaignKey: null });
      }
      const { refresh } = await flushThenStartGuardedRefresh();
      if (held === 'the staged maxima') {
        gets[0].resolve(
          okResponse(recordAt(BASE_VERSION, rosterWithMissingMaxima())),
        );
        await until(() => mockCanonicalLookups.length > 0);
      }
      await reconcileWith(flushedRecord());
      const afterAdoption = observable();

      if (held === 'the GET') {
        gets[0].resolve(okResponse(recordAt(BASE_VERSION)));
      } else {
        mockCanonicalLookups[0].answer(canonicalUnit());
      }
      const adopted = await refresh;
      await drainMicrotasks();
      const afterRelease = observable();
      jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
      await drainMicrotasks();

      expect(afterAdoption).toMatchObject({
        baseVersion: BASE_VERSION + 1,
        dirty: true,
        cachedKey: { instanceId: HOST_INSTANCE_ID, revision: BASE_VERSION + 1 },
      });
      expect(adopted).toBe(false);
      expect(afterRelease).toEqual(afterAdoption);
      expect(afterRelease.live).toBe(afterAdoption.live);
      expect(afterRelease.roster).toBe(afterAdoption.roster);
      // One re-armed ordinary save, at the token the flush earned.
      expect(ordinaryPuts().map(putBaseVersion)).toEqual([BASE_VERSION + 1]);
    },
  );

  it.each([
    ['a digest that is not the flushed envelope', 'digest'],
    ['a version the flush could not have produced', 'version'],
  ])(
    'still completes a guarded refresh when the reconciliation read shows %s',
    async (_label, mismatch) => {
      const { refresh } = await flushThenStartGuardedRefresh();
      const landed = flushedRecord();
      await reconcileWith(
        mismatch === 'digest'
          ? { ...landed, body: { ...landed.body, name: 'Other device' } }
          : { ...landed, version: BASE_VERSION + 2 },
      );
      const afterRead = observable();

      gets[0].resolve(okResponse(recordAt(BASE_VERSION + 1)));
      const adopted = await refresh;

      expect(afterRead.baseVersion).toBe(BASE_VERSION);
      expect(adopted).toBe(true);
      expect(useCampaignPersistenceStore.getState().baseVersion).toBe(
        BASE_VERSION + 1,
      );
      expect(liveCampaign()?.name).toBe(`Row v${BASE_VERSION + 1}`);
    },
  );

  it('never announces saving for a guarded refresh, while an ordinary load still does (m12)', async () => {
    const transitions: string[] = [];
    const unsubscribe = useCampaignPersistenceStore.subscribe(
      (state, previous) => {
        if (state.saveState !== previous.saveState) {
          transitions.push(state.saveState);
        }
      },
    );
    autoAnswer = recordAt(BASE_VERSION + 1);

    const adopted = await guardedRefresh(refreshContext());
    const guarded = transitions.splice(0);
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
    unsubscribe();

    expect(adopted).toBe(true);
    expect(guarded).toEqual([]);
    expect(transitions).toEqual(['saving', 'saved']);
  });

  it('completes on its own writes when nothing supersedes it', async () => {
    const refresh = guardedRefresh(refreshContext());
    await getIssued.promise;
    gets[0].resolve(okResponse(recordAt(BASE_VERSION + 1)));

    const adopted = await refresh;

    expect(adopted).toBe(true);
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      baseVersion: BASE_VERSION + 1,
      sourceReplayFence: STAMPED_FENCE,
      saveState: 'saved',
      dirty: false,
    });
    expect(campaignStore.getState().cachedCampaignKey).toEqual({
      instanceId: HOST_INSTANCE_ID,
      revision: BASE_VERSION + 1,
    });
    expect(liveCampaign()?.name).toBe(`Row v${BASE_VERSION + 1}`);
  });
});
