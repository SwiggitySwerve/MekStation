/**
 * Campaigns index legacy-adoption offer (task 1.4, design D8).
 *
 * The spec puts the offer here: "a device with a pre-existing
 * browser-persisted campaign loads the campaigns index... the campaign
 * SHALL be offered for adoption". The card already rendered for a
 * store-only campaign; what was missing was any indication that this one
 * lives nowhere but the browser, and any way to do something about it.
 *
 * The discriminating case is the campaign created THIS session: it is
 * also store-only for a moment, but it is new rather than legacy and must
 * keep its ordinary first save.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

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

interface MockCampaign {
  readonly id: string;
  readonly name: string;
  readonly factionId: string;
  readonly currentDate: Date;
  readonly forces: Map<string, unknown>;
  readonly missions: Map<string, unknown>;
}

const mockCampaignStoreState: {
  campaign: MockCampaign | null;
  rehydratedCampaignId: string | null;
  createCampaign: jest.Mock;
  createGuestMirrorCampaign: jest.Mock;
  getCampaign: jest.Mock;
} = {
  campaign: null,
  rehydratedCampaignId: null,
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
const mockAdoptLegacyCampaign = jest.fn<Promise<boolean>, []>(async () => true);
jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: {
    getState: () => ({
      loadCampaign: mockLoadCampaign,
      adoptLegacyCampaign: mockAdoptLegacyCampaign,
    }),
  },
}));

import CampaignsListPage from '@/pages/gameplay/campaigns/index';

const LEGACY_ID = 'campaign-browser-only';

function browserCampaign(): MockCampaign {
  return {
    id: LEGACY_ID,
    name: 'Grey Death Legion',
    factionId: 'mercenary',
    currentDate: new Date('3025-06-01T00:00:00.000Z'),
    forces: new Map(),
    missions: new Map(),
  };
}

/** The server lists nothing: this browser copy is all there is. */
function emptyServerList(): void {
  (globalThis as unknown as { fetch: jest.Mock }).fetch = jest.fn(async () => ({
    ok: true,
    json: async () => [],
    headers: { get: () => null },
  }));
}

describe('campaigns index legacy adoption offer', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockLoadCampaign.mockClear();
    mockAdoptLegacyCampaign.mockClear();
    mockCampaignStoreState.campaign = null;
    mockCampaignStoreState.rehydratedCampaignId = null;
    emptyServerList();
  });

  it('labels a rehydrated browser copy the server does not list', async () => {
    mockCampaignStoreState.campaign = browserCampaign();
    mockCampaignStoreState.rehydratedCampaignId = LEGACY_ID;

    await act(async () => {
      render(<CampaignsListPage />);
    });

    expect(
      await screen.findByTestId(`campaign-legacy-${LEGACY_ID}`),
    ).toBeInTheDocument();
  });

  it('does not label a campaign created this session as legacy', async () => {
    // Store-only for the same reason, but it has no prior history to
    // import - offering adoption would divert a brand-new campaign away
    // from its ordinary create.
    mockCampaignStoreState.campaign = browserCampaign();
    mockCampaignStoreState.rehydratedCampaignId = null;

    await act(async () => {
      render(<CampaignsListPage />);
    });

    expect(
      await screen.findByTestId(`campaign-card-${LEGACY_ID}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`campaign-legacy-${LEGACY_ID}`),
    ).not.toBeInTheDocument();
  });

  it('adopts without also navigating into the campaign', async () => {
    mockCampaignStoreState.campaign = browserCampaign();
    mockCampaignStoreState.rehydratedCampaignId = LEGACY_ID;
    await act(async () => {
      render(<CampaignsListPage />);
    });

    fireEvent.click(await screen.findByTestId(`campaign-adopt-${LEGACY_ID}`));

    await waitFor(() => {
      expect(mockAdoptLegacyCampaign).toHaveBeenCalledTimes(1);
    });
    // The card navigates; the button inside it must not, or adopting
    // would always throw the player into the campaign as a side effect.
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
