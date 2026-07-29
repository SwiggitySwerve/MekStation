import { renderHook, waitFor } from '@testing-library/react';

import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignRouteLoader } from '../campaignPageShell';

const mockLoadCampaign = jest.fn<Promise<void>, [string]>();

jest.mock('@/stores/campaign/campaignPersistenceWiring', () => ({
  installCampaignPersistenceWiring: jest.fn(),
}));

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: (
    selector: (state: {
      loadCampaign: typeof mockLoadCampaign;
      saveState: 'idle';
    }) => unknown,
  ) =>
    selector({
      loadCampaign: mockLoadCampaign,
      saveState: 'idle',
    }),
}));

function campaignWithId(id: string): ICampaign {
  return { id } as ICampaign;
}

describe('useCampaignRouteLoader route identity boundary', () => {
  beforeEach(() => {
    mockLoadCampaign.mockReset().mockResolvedValue();
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
