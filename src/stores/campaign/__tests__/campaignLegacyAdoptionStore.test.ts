/**
 * Legacy adoption in the campaign persistence store (task 1.4, D8).
 *
 * The regression that matters most here is the one that needs no user
 * mistake to happen: a browser copy the server has never held used to be
 * one auto-save away from being created as a brand-new server campaign,
 * which stamps a journal-native cutover marker claiming the campaign's
 * whole history lives in a journal holding none of it. So the copy is
 * labelled instead, does NOT auto-save, and adoption is an explicit act.
 *
 * A campaign created this session is deliberately NOT treated as legacy —
 * it has no prior history to import and must keep its ordinary create.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8)
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

interface MockCampaignStore {
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
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

describe('legacy campaign adoption', () => {
  let campaign: ICampaign;
  let mockStore: StoreApi<MockCampaignStore>;

  /** Registers the campaign-store seam with the given rehydration mark. */
  function seedBrowserCopy(rehydratedCampaignId: string | null): void {
    mockStore = createStore<MockCampaignStore>((set, get) => ({
      campaign,
      rehydratedCampaignId,
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
      () => mockStore as unknown as ReturnType<MockAccessor>,
    );
  }

  beforeEach(() => {
    campaign = buildPopulatedCampaign();
    useCampaignPersistenceStore.getState().reset();
    useCampaignRosterStore.getState().reset();
    jest.restoreAllMocks();
  });

  it('offers adoption for a rehydrated copy the server does not hold', async () => {
    seedBrowserCopy(campaign.id);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(404, {}));

    const loaded = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(campaign.id);

    expect(loaded).toBe(false);
    const state = useCampaignPersistenceStore.getState();
    expect(state.legacyUnadopted).toBe(true);
    // An offer is not a failure: surfacing "campaign not found" over a
    // campaign the player can still see and play is simply untrue.
    expect(state.errorMessage).toBeNull();
    expect(state.saveState).toBe('idle');
  });

  it('still reports a genuine miss for a campaign created this session', async () => {
    seedBrowserCopy(null);
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(404, {}));

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    const state = useCampaignPersistenceStore.getState();
    expect(state.legacyUnadopted).toBe(false);
    expect(state.errorMessage).toBe('campaign not found');
  });

  it('does not let an unadopted copy become a server source by saving', async () => {
    seedBrowserCopy(campaign.id);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(404, {}));
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
    fetchMock.mockClear();

    const result = await useCampaignPersistenceStore.getState().saveCampaign();

    // The whole point: no PUT at all. A create here would stamp a
    // journal-native marker over a campaign with history elsewhere.
    expect(result.status).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('demotes the browser copy to a cache once adopted', async () => {
    seedBrowserCopy(campaign.id);
    const adopted = buildSerializedCampaign(campaign, 'device-legacy', 1);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(201, adopted));
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    const ok = await useCampaignPersistenceStore
      .getState()
      .adoptLegacyCampaign();

    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`/api/campaigns/${campaign.id}/adopt`);
    expect(init.method).toBe('POST');
    const state = useCampaignPersistenceStore.getState();
    expect(state.legacyUnadopted).toBe(false);
    // Now a normal server-backed campaign: version tracked, saves allowed.
    expect(state.baseVersion).toBe(adopted.version);
    expect(state.saveState).toBe('saved');
  });

  it('keeps the copy labelled legacy when adoption fails', async () => {
    seedBrowserCopy(campaign.id);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(409, { error: 'already held' }));
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    const ok = await useCampaignPersistenceStore
      .getState()
      .adoptLegacyCampaign();

    expect(ok).toBe(false);
    const state = useCampaignPersistenceStore.getState();
    // Still legacy, still unshareable, still not silently saving.
    expect(state.legacyUnadopted).toBe(true);
    expect(state.saveState).toBe('error');
  });

  it('clears the legacy label once the server does hold the campaign', async () => {
    seedBrowserCopy(campaign.id);
    const stored = buildSerializedCampaign(campaign, 'device-legacy', 3);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(200, stored));
    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);
    expect(useCampaignPersistenceStore.getState().legacyUnadopted).toBe(true);

    await useCampaignPersistenceStore.getState().loadCampaign(campaign.id);

    expect(useCampaignPersistenceStore.getState().legacyUnadopted).toBe(false);
  });
});
