import type { NextRouter } from 'next/router';

import { renderHook, waitFor } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignCustomizerRouting } from '../useCampaignCustomizerRouting';

const mockLoadCampaign = jest.fn<Promise<boolean>, [string]>();

jest.mock('@/stores/campaign/campaignPersistenceWiring', () => ({
  installCampaignPersistenceWiring: jest.fn(),
}));

const mockPersistenceState = {
  baseVersion: 0,
  dirty: false,
};

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: (
    selector: (state: {
      loadCampaign: typeof mockLoadCampaign;
      baseVersion: number;
      dirty: boolean;
    }) => unknown,
  ) => selector({ loadCampaign: mockLoadCampaign, ...mockPersistenceState }),
}));

jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: (selector: (state: { units: [] }) => unknown) =>
    selector({ units: [] }),
}));

const mockCampaignStore = createStore<{
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
}>(() => ({ campaign: null, rehydratedCampaignId: null }));

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStore,
}));

function renderRouting() {
  const nextRouter = {
    asPath: '/customizer',
    query: {
      mode: 'campaign-refit',
      campaignId: 'cached-campaign',
      unitId: 'unit-atlas',
      returnTo: 'mek-stable',
      campaignDate: '3025-01-03T00:00:00.000Z',
      budget: '2500000',
    },
    replace: jest.fn(),
  } as unknown as NextRouter;
  return renderHook(() =>
    useCampaignCustomizerRouting({
      activeTabId: null,
      addTab: jest.fn(),
      isHydrated: false,
      nextRouter,
      routerIsReady: true,
      routerTabId: 'structure',
      selectTab: jest.fn(),
      setLastSubTab: jest.fn(),
      tabs: [],
    }),
  );
}

describe('useCampaignCustomizerRouting campaign load', () => {
  beforeEach(() => {
    mockLoadCampaign.mockReset().mockResolvedValue(true);
    mockPersistenceState.baseVersion = 0;
    mockPersistenceState.dirty = false;
    mockCampaignStore.setState({ campaign: null, rehydratedCampaignId: null });
  });

  it('loads the routed campaign when none is held', async () => {
    renderRouting();

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledWith('cached-campaign');
    });
  });

  it('head-validates a storage-rehydrated campaign so the refit save has a server version', async () => {
    // The customizer is entered by full navigation, so the campaign comes
    // back out of storage while the persistence store starts at baseVersion
    // 0. Trusting that copy left the refit save writing against version 0,
    // which the server refuses with a 409.
    mockCampaignStore.setState({
      campaign: { id: 'cached-campaign' } as ICampaign,
      rehydratedCampaignId: 'cached-campaign',
    });

    renderRouting();

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledTimes(1);
    });
    expect(mockLoadCampaign).toHaveBeenCalledWith('cached-campaign');
  });

  it('does not reload a campaign the persistence store already holds', () => {
    mockPersistenceState.baseVersion = 2;
    mockCampaignStore.setState({
      campaign: { id: 'cached-campaign' } as ICampaign,
      rehydratedCampaignId: 'cached-campaign',
    });

    renderRouting();

    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('does not clobber dirty local state with a validation refetch', () => {
    mockPersistenceState.dirty = true;
    mockCampaignStore.setState({
      campaign: { id: 'cached-campaign' } as ICampaign,
      rehydratedCampaignId: 'cached-campaign',
    });

    renderRouting();

    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });
});
