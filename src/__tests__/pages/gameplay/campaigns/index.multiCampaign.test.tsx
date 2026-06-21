import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import type { ICampaignSummary } from '@/types/campaign/SerializedCampaign';

const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/gameplay/campaigns',
    query: {},
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

jest.mock('@/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel', () => ({
  CampaignCoopEntryPanel: () => <div data-testid="campaign-coop-entry" />,
}));

const mockCampaignStoreState = {
  campaign: null,
  createCampaign: jest.fn(),
  createGuestMirrorCampaign: jest.fn(),
  getCampaign: jest.fn(() => null),
};
const mockCampaignStoreApi = {
  getState: () => mockCampaignStoreState,
  getInitialState: () => mockCampaignStoreState,
  subscribe: () => () => undefined,
};
jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStoreApi,
}));

jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: Object.assign(
    (selector: (state: { pilots: readonly unknown[] }) => unknown) =>
      selector({ pilots: [] }),
    { getState: () => ({ pilots: [] }) },
  ),
}));

const mockLoadCampaign = jest.fn<Promise<boolean>, [string]>(async () => true);
jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: {
    getState: () => ({ loadCampaign: mockLoadCampaign }),
  },
}));

import CampaignsListPage from '@/pages/gameplay/campaigns/index';

describe('CampaignsListPage multi-campaign backend list', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockLoadCampaign.mockClear();
  });

  it('renders multiple campaign summaries from GET /api/campaigns and switches by id', async () => {
    const campaigns: ICampaignSummary[] = [
      {
        id: 'campaign-alpha',
        name: 'Alpha Lance',
        factionId: 'mercenary',
        currentDate: '3025-01-01T00:00:00.000Z',
        balance: 1000000,
        updatedAt: '2026-06-21T12:00:00.000Z',
      },
      {
        id: 'campaign-bravo',
        name: 'Bravo Lance',
        factionId: 'davion',
        currentDate: '3025-02-01T00:00:00.000Z',
        balance: 2500000,
        updatedAt: '2026-06-21T13:00:00.000Z',
      },
    ];
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn(
      async (url: string) => {
        expect(url).toBe('/api/campaigns');
        return {
          ok: true,
          json: async () => campaigns,
        };
      },
    );

    await act(async () => {
      render(<CampaignsListPage />);
    });

    expect(
      await screen.findByTestId('campaign-card-campaign-alpha'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('campaign-card-campaign-bravo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Alpha Lance')).toBeInTheDocument();
    expect(screen.getByText('Bravo Lance')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('campaign-card-campaign-bravo'));

    await waitFor(() => {
      expect(mockLoadCampaign).toHaveBeenCalledWith('campaign-bravo');
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/campaigns/campaign-bravo',
      );
    });
  });
});
