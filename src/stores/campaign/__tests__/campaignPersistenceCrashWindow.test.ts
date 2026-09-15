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

function stubFetch(): void {
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} });
      return Promise.resolve(savedResponse());
    });
}

// --- Arrange helpers ---

const BASE_VERSION = 7;

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
    // `processedBattleIds` rides the serialized body verbatim, so it is the
    // cheapest way to push the request past the keepalive budget the way
    // the unbounded per-campaign collections eventually will.
    const filler = 'battle-'.padEnd(256, 'x');
    const oversized: ICampaign = {
      ...campaign,
      processedBattleIds: Array.from(
        { length: 400 },
        (_, index) => `${filler}${index}`,
      ),
    };
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
});
