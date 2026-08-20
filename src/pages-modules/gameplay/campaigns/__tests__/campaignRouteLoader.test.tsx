import { renderHook, waitFor } from '@testing-library/react';

import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignRouteLoader } from '../campaignPageShell';

const mockLoadCampaign = jest.fn<Promise<void>, [string]>();

jest.mock('@/stores/campaign/campaignPersistenceWiring', () => ({
  installCampaignPersistenceWiring: jest.fn(),
}));

const mockPersistenceState = {
  saveState: 'idle' as const,
  baseVersion: 0,
  dirty: false,
};

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: (
    selector: (state: {
      loadCampaign: typeof mockLoadCampaign;
      saveState: 'idle';
      baseVersion: number;
      dirty: boolean;
    }) => unknown,
  ) =>
    selector({
      loadCampaign: mockLoadCampaign,
      ...mockPersistenceState,
    }),
}));

function campaignWithId(id: string): ICampaign {
  return { id } as ICampaign;
}

describe('useCampaignRouteLoader route identity boundary', () => {
  beforeEach(() => {
    mockLoadCampaign.mockReset().mockResolvedValue();
    mockPersistenceState.baseVersion = 0;
    mockPersistenceState.dirty = false;
    window.history.replaceState({}, '', '/');
  });

  it('loads the campaign from the concrete browser path exactly once', async () => {
    window.history.replaceState(
      {},
      '',
      '/gameplay/campaigns/browser-campaign/missions',
    );

    const { result } = renderHook(() =>
      useCampaignRouteLoader({
        campaign: null,
        isClient: true,
        router: { query: {}, asPath: '/gameplay/campaigns/[id]/missions' },
      }),
    );

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledTimes(1);
    });
    expect(mockLoadCampaign).toHaveBeenCalledWith('browser-campaign');
    expect(result.current.routeCampaignId).toBe('browser-campaign');
  });

  it('does not reload a matching active campaign', () => {
    const { result } = renderHook(() =>
      useCampaignRouteLoader({
        campaign: campaignWithId('active-campaign'),
        isClient: true,
        router: {
          query: { id: 'active-campaign' },
          asPath: '/gameplay/campaigns/active-campaign',
        },
      }),
    );

    expect(result.current.campaign?.id).toBe('active-campaign');
    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('does not load when every campaign identity is absent or dynamic', () => {
    window.history.replaceState({}, '', '/gameplay/campaigns');

    const { result } = renderHook(() =>
      useCampaignRouteLoader({
        campaign: null,
        isClient: true,
        router: {
          query: { id: '[id]' },
          asPath: '/gameplay/campaigns/%5Bid%5D/missions',
        },
      }),
    );

    expect(result.current.routeCampaignId).toBeNull();
    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('head-validates a storage-rehydrated matching campaign exactly once', async () => {
    // Per campaign-authority "Stale cache is refreshed, not trusted": a
    // rehydrated cache with no in-session server validation (baseVersion 0)
    // must be refetch-replaced even though the route already matches.
    const { result } = renderHook(() =>
      useCampaignRouteLoader({
        campaign: campaignWithId('cached-campaign'),
        isClient: true,
        router: {
          query: { id: 'cached-campaign' },
          asPath: '/gameplay/campaigns/cached-campaign',
        },
        rehydratedCampaignId: 'cached-campaign',
      }),
    );

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledTimes(1);
    });
    expect(mockLoadCampaign).toHaveBeenCalledWith('cached-campaign');
    // The cached copy keeps rendering while the refetch replaces it.
    expect(result.current.campaign?.id).toBe('cached-campaign');
  });

  it('does not validate an in-session campaign that was never rehydrated', () => {
    renderHook(() =>
      useCampaignRouteLoader({
        campaign: campaignWithId('created-campaign'),
        isClient: true,
        router: {
          query: { id: 'created-campaign' },
          asPath: '/gameplay/campaigns/created-campaign',
        },
        rehydratedCampaignId: null,
      }),
    );

    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('does not clobber dirty local state with a validation refetch', () => {
    mockPersistenceState.dirty = true;

    renderHook(() =>
      useCampaignRouteLoader({
        campaign: campaignWithId('cached-campaign'),
        isClient: true,
        router: {
          query: { id: 'cached-campaign' },
          asPath: '/gameplay/campaigns/cached-campaign',
        },
        rehydratedCampaignId: 'cached-campaign',
      }),
    );

    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('does not revalidate once the session has a server base version', () => {
    mockPersistenceState.baseVersion = 3;

    renderHook(() =>
      useCampaignRouteLoader({
        campaign: campaignWithId('cached-campaign'),
        isClient: true,
        router: {
          query: { id: 'cached-campaign' },
          asPath: '/gameplay/campaigns/cached-campaign',
        },
        rehydratedCampaignId: 'cached-campaign',
      }),
    );

    expect(mockLoadCampaign).not.toHaveBeenCalled();
  });

  it('falls through a placeholder query id to a concrete path', async () => {
    window.history.replaceState(
      {},
      '',
      '/gameplay/campaigns/fallback-campaign/missions',
    );

    renderHook(() =>
      useCampaignRouteLoader({
        campaign: null,
        isClient: true,
        router: {
          query: { id: '[id]' },
          asPath: '/gameplay/campaigns/%5Bid%5D/missions',
        },
      }),
    );

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledWith('fallback-campaign');
    });
  });
});
