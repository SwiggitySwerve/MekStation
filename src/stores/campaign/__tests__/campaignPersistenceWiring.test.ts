/**
 * Campaign persistence wiring tests (task 4.5)
 *
 * Asserts that a change to the live campaign object reference marks the
 * persistence store dirty, that a first load establishes the baseline
 * silently, and that uninstall stops the bridge.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 *   - Requirement: Campaign Persistence Store (Auto-save fires after mutations settle)
 */

import type { StoreApi } from 'zustand';

import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';

import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '../campaignPersistenceWiring';
import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';

interface MockCampaignStore {
  campaign: ICampaign | null;
  updateCampaign: (updates: Partial<ICampaign>) => void;
}

type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

function makeMockStore(initial: ICampaign | null): StoreApi<MockCampaignStore> {
  return createStore<MockCampaignStore>((set, get) => ({
    campaign: initial,
    updateCampaign: (updates) => {
      const current = get().campaign;
      set({
        campaign: current ? { ...current, ...updates } : (updates as ICampaign),
      });
    },
  }));
}

describe('campaignPersistenceWiring', () => {
  let campaign: ICampaign;

  beforeEach(() => {
    jest.useFakeTimers();
    campaign = buildPopulatedCampaign();
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    uninstallCampaignPersistenceWiring();
    jest.useRealTimers();
  });

  it('marks the persistence store dirty when the live campaign mutates', () => {
    const store = makeMockStore(campaign);
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
    installCampaignPersistenceWiring();
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);

    store.getState().updateCampaign({ name: 'Renamed Company' });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('does not mark dirty when a campaign is first loaded from null', () => {
    const store = makeMockStore(null);
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
    installCampaignPersistenceWiring();

    // null -> campaign is a load, not an edit.
    store.getState().updateCampaign(campaign);
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);

    // A subsequent edit IS a mutation.
    store.getState().updateCampaign({ name: 'Edited' });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('is idempotent — a second install does not double-subscribe', () => {
    const store = makeMockStore(campaign);
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
    installCampaignPersistenceWiring();
    installCampaignPersistenceWiring();

    store.getState().updateCampaign({ name: 'Once' });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
  });

  it('uninstall stops the dirty bridge', () => {
    const store = makeMockStore(campaign);
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
    installCampaignPersistenceWiring();
    uninstallCampaignPersistenceWiring();
    useCampaignPersistenceStore.getState().reset();

    store.getState().updateCampaign({ name: 'After uninstall' });
    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
  });
});
