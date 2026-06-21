/**
 * Campaign persistence store tests (tasks 4.6, 5.3)
 *
 * Exercises dirty tracking, debounce coalescing, load-rehydrate, conflict
 * surfacing, offline non-fatal errors, and save-metadata updates. `fetch`
 * is stubbed; the live-campaign seam is satisfied with a minimal mock
 * campaign store registered through `campaignStoreAccessor`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Campaign Persistence Store
 *   - Requirement: Campaign Save Metadata
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import {
  AUTO_SAVE_DEBOUNCE_MS,
  useCampaignPersistenceStore,
} from '../useCampaignPersistenceStore';

// =============================================================================
// Minimal mock campaign store for the live-campaign seam
// =============================================================================

interface MockCampaignStore {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

/** The accessor signature `registerCampaignStoreAccessor` expects. */
type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

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
      set({ campaign: nextCampaign });
    },
  }));
}

// =============================================================================
// Fetch stubbing
// =============================================================================

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

// =============================================================================
// Setup
// =============================================================================

describe('useCampaignPersistenceStore', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    jest.useFakeTimers();
    campaign = buildPopulatedCampaign();
    const mockStore = makeMockCampaignStore(campaign);
    registerCampaignStoreAccessor(
      () => mockStore as unknown as ReturnType<MockAccessor>,
    );
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Dirty tracking + debounce
  // ---------------------------------------------------------------------------

  it('markDirty sets the dirty flag', () => {
    useCampaignPersistenceStore.getState().markDirty();
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('auto-save fires after the debounce interval settles', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    useCampaignPersistenceStore.getState().markDirty();
    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
  });

  it('coalesces rapid mutations into exactly one save', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    const store = useCampaignPersistenceStore.getState();
    store.markDirty();
    jest.advanceTimersByTime(500);
    store.markDirty();
    jest.advanceTimersByTime(500);
    store.markDirty();
    jest.advanceTimersByTime(AUTO_SAVE_DEBOUNCE_MS);
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Load rehydrate
  // ---------------------------------------------------------------------------

  it('loadCampaign fetches, migrates, deserializes, and writes the live campaign', async () => {
    const envelope = buildSerializedCampaign(campaign, 'device-y', 3);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, envelope));

    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);
    expect(ok).toBe(true);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(3);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('loadCampaign returns false on a 404', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign('missing');
    expect(ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Conflict surfacing
  // ---------------------------------------------------------------------------

  it('a 409 sets saveState to conflict and exposes the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(409, serverRecord));

    await useCampaignPersistenceStore.getState().saveCampaign();

    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('conflict');
    expect(state.conflictServerRecord).not.toBeNull();
    expect(state.conflictServerRecord?.version).toBe(5);
  });

  it('resolveConflictTakeServer adopts the server record', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(409, serverRecord));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const ok = await useCampaignPersistenceStore
      .getState()
      .resolveConflictTakeServer();
    expect(ok).toBe(true);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(5);
    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
  });

  it('resolveConflictKeepLocal re-PUTs using the server version as base', async () => {
    const serverRecord = buildSerializedCampaign(campaign, 'device-z', 5);
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockResolvedValueOnce(jsonResponse(409, serverRecord));
    await useCampaignPersistenceStore.getState().saveCampaign();

    const accepted = buildSerializedCampaign(campaign, 'device-local', 6);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, accepted));
    await useCampaignPersistenceStore.getState().resolveConflictKeepLocal();

    expect(useCampaignPersistenceStore.getState().saveState).toBe('saved');
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // Offline non-fatal error
  // ---------------------------------------------------------------------------

  it('an offline save failure is non-fatal — saveState becomes error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await useCampaignPersistenceStore.getState().saveCampaign();

    const state = useCampaignPersistenceStore.getState();
    expect(state.saveState).toBe('error');
    expect(state.errorMessage).toBe('network down');
  });

  it('clearError returns an errored store to idle', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    await useCampaignPersistenceStore.getState().saveCampaign();
    useCampaignPersistenceStore.getState().clearError();
    expect(useCampaignPersistenceStore.getState().saveState).toBe('idle');
  });

  // ---------------------------------------------------------------------------
  // Save metadata (task 5.3)
  // ---------------------------------------------------------------------------

  it('save metadata updates after a successful save', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-meta', 1);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, stored));

    await useCampaignPersistenceStore.getState().saveCampaign();

    const metadata = useCampaignPersistenceStore.getState().metadata;
    expect(metadata.lastSavedAt).toBe(stored.savedAt);
    expect(metadata.originDeviceId).toBe('device-meta');
    expect(metadata.version).toBe(1);
  });

  it('manual saveCampaign forces an immediate write without the debounce', async () => {
    const stored = buildSerializedCampaign(campaign, 'device-x', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, stored));

    await useCampaignPersistenceStore.getState().saveCampaign();

    // Issued immediately — no timer advance needed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
