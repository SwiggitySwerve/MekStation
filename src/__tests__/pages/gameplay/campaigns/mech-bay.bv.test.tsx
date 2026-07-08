import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

const mockLoadCampaign = jest.fn();
const mockRawCanonicalGetIndex = jest.fn();
const mockCampaign = {
  id: 'campaign-1',
  name: 'BV Smoke Campaign',
  missions: new Map(),
  unitConfigurations: {},
  currentDate: new Date('3025-01-01T00:00:00.000Z'),
  finances: {
    balance: {
      amount: 1_000_000,
    },
  },
};
const mockRosterState = {
  units: [
    {
      unitId: 'roster-atlas',
      unitRef: 'atlas-as7-d',
      unitName: 'Atlas',
      chassisVariant: 'AS7-D',
      readiness: 'Ready' as const,
    },
  ],
  pilots: [],
  getActiveMission: () => null,
};

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    getIndex: mockRawCanonicalGetIndex,
  }),
}));

jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: (
    selector: (state: typeof mockRosterState) => unknown,
  ) => selector(mockRosterState),
}));

jest.mock('@/stores/campaign/campaignBaySelectors', () => ({
  selectRepairBay: () => [],
}));

jest.mock('@/lib/campaign/readiness/missionReadinessProjection', () => ({
  buildMissionReadinessProjection: () => ({ units: [] }),
}));

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => ({
    campaign: mockCampaign,
    breadcrumbs: [],
    isClient: true,
    isLoadingCampaign: false,
    routeCampaignId: 'campaign-1',
  }),
  useCampaignLoadStatus: () => ({
    saveState: 'idle',
    errorMessage: null,
    loadCampaign: mockLoadCampaign,
  }),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: (shell: { campaign: typeof mockCampaign }) =>
    shell.campaign,
  renderCampaignBaySaveError: () => null,
  CampaignPageFrameFromShell: ({
    children,
  }: {
    readonly children: React.ReactNode;
  }) => <div data-testid="campaign-page-frame">{children}</div>,
}));

import MechBayPage from '@/pages/gameplay/campaigns/[id]/mech-bay';

const originalFetch = global.fetch;

function makeUnitIndexEntry(
  entry: Partial<IUnitIndexEntry> & Pick<IUnitIndexEntry, 'id' | 'tonnage'>,
): IUnitIndexEntry {
  return entry as IUnitIndexEntry;
}

describe('MechBayPage BV loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRawCanonicalGetIndex.mockResolvedValue([
      makeUnitIndexEntry({
        id: 'atlas-as7-d',
        tonnage: 100,
      }),
    ]);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/units?includeBV=true') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              makeUnitIndexEntry({
                id: 'atlas-as7-d',
                tonnage: 100,
                bv: 1897,
              }),
            ],
          }),
        } as Response;
      }

      return {
        ok: false,
        json: async () => ({ success: false }),
      } as Response;
    }) as jest.MockedFunction<typeof fetch>;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sources displayed BV from the server BV-enriched units API', async () => {
    render(<MechBayPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId('mech-bay-loadout-roster-atlas'),
      ).toHaveTextContent('BV: 1,897');
    });
    expect(
      screen.getByTestId('mech-bay-loadout-roster-atlas'),
    ).toHaveTextContent('Weight: 100 tons');
    expect(global.fetch).toHaveBeenCalledWith('/api/units?includeBV=true');
    expect(mockRawCanonicalGetIndex).not.toHaveBeenCalled();
  });
});
