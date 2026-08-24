/**
 * Cache identity at the load path (task 1.3, design D2).
 *
 * The pure rule says when a cached copy may stand. These rows pin that
 * the load path actually asks: an identical copy is left alone rather
 * than rebuilt, and a divergent one is replaced WHOLE by the server's
 * record.
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaignCacheKey } from '@/lib/campaign/persistence/campaignCacheKey';
import type { ICampaign } from '@/types/campaign/Campaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

const HOST_A = 'instance-host-a';
const HOST_B = 'instance-host-b';

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
  cachedCampaignKey: ICampaignCacheKey | null;
  setCachedCampaignKey: (key: ICampaignCacheKey | null) => void;
  updateCampaign: (updates: Partial<ICampaign>) => void;
  switchCampaign: (campaign: ICampaign) => void;
}

type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('campaign cache identity at load', () => {
  let campaign: ICampaign;
  let store: StoreApi<MockCampaignStore>;

  function seed(cachedCampaignKey: ICampaignCacheKey | null): void {
    store = createStore<MockCampaignStore>((set, get) => ({
      campaign,
      rehydratedCampaignId: campaign.id,
      cachedCampaignKey,
      setCachedCampaignKey: (key) => set({ cachedCampaignKey: key }),
      updateCampaign: (updates) => {
        const current = get().campaign;
        set({
          campaign: current
            ? { ...current, ...updates }
            : (updates as ICampaign),
        });
      },
      switchCampaign: (next) => set({ campaign: next }),
    }));
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
  }

  /** A server record for this campaign at a given instance + version. */
  function record(instanceId: string, version: number) {
    return {
      ...buildSerializedCampaign(campaign, 'device-cache', version),
      instanceId,
    };
  }

  beforeEach(() => {
    campaign = buildPopulatedCampaign();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    jest.restoreAllMocks();
  });

  it('leaves an identical copy in place rather than rebuilding it', async () => {
    seed({ instanceId: HOST_A, revision: 5 });
    const held = store.getState().campaign;
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, record(HOST_A, 5)));

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    // Same object: a copy that IS the server's record does not need to
    // be deserialized into a new graph on every session start.
    expect(store.getState().campaign).toBe(held);
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(5);
  });

  it('replaces a copy from a different server, even at the same revision', async () => {
    seed({ instanceId: HOST_B, revision: 5 });
    const held = store.getState().campaign;
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, record(HOST_A, 5)));

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    // Not the same object: the local copy was replaced whole. Matching
    // revisions across two servers is exactly the coincidence that makes
    // revision-only keying unsafe.
    expect(store.getState().campaign).not.toBe(held);
  });

  it('replaces a copy that carries no identity at all', async () => {
    seed(null);
    const held = store.getState().campaign;
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, record(HOST_A, 5)));

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    expect(store.getState().campaign).not.toBe(held);
  });

  it('records the identity of whatever it ends up holding', async () => {
    seed(null);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(200, record(HOST_A, 9)));

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    // Set from the record the server returned - never from anything the
    // client believed beforehand.
    expect(store.getState().cachedCampaignKey).toEqual({
      instanceId: HOST_A,
      revision: 9,
    });
  });
});
