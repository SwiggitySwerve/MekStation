import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IRefitOrder } from '@/types/campaign/Refit';
import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';

import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { RefitClass } from '@/types/campaign/Refit';

const mockLoadCampaign = jest.fn();
const mockRawCanonicalGetIndex = jest.fn();
const mockCancelRefitOrder = jest.fn();
const mockSaveCampaign = jest.fn();
const mockBaySaveError = jest.fn<React.ReactElement | null, []>(() => null);
const mockCampaign = {
  id: 'campaign-1',
  name: 'BV Smoke Campaign',
  missions: new Map(),
  unitConfigurations: {},
  refitOrders: [] as readonly IRefitOrder[],
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

jest.mock('@/stores/campaign/campaignRefitActions', () => ({
  cancelCampaignRefitOrder: (...args: unknown[]) =>
    mockCancelRefitOrder(...args),
}));

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => ({
  useCampaignPersistenceStore: {
    getState: () => ({ saveCampaign: mockSaveCampaign }),
  },
}));

jest.mock('@/lib/campaign/readiness/useReadinessAuthority', () => ({
  useReadinessAuthority: () => ({ kind: 'snapshot' }),
}));

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
  buildMissionReadinessProjection: () => ({
    units: mockRosterState.units.map((unit) => ({
      unit,
      reasons: [],
      status: 'eligible',
      repairTicketCount: 0,
      blockingRepairTicketCount: 0,
    })),
  }),
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
  renderCampaignBaySaveError: () => mockBaySaveError(),
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
    mockCampaign.refitOrders = [];
    mockBaySaveError.mockReturnValue(null);
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

  it('keeps cancellation retry mounted when the campaign save error replaces the bay', async () => {
    const order: IRefitOrder = {
      id: 'retry-refit',
      unitId: 'roster-atlas',
      status: 'in-progress',
      targetConfiguration: DEFAULT_UNIT_CONFIGURATION,
      refitClass: RefitClass.EquipmentSwap,
      estimatedCost: 1000,
      estimatedHours: 20,
      hoursCompleted: 7,
      createdAt: '3025-01-01',
    };
    const cancelled = { ...order, status: 'cancelled' as const };
    mockCampaign.refitOrders = [order];
    mockCancelRefitOrder
      .mockResolvedValueOnce({ applied: true, order: cancelled })
      .mockResolvedValueOnce({ applied: false, order: cancelled });
    mockSaveCampaign
      .mockResolvedValueOnce({ status: 'error', errorMessage: 'Offline.' })
      .mockResolvedValueOnce({ status: 'saved' });
    const { rerender } = render(<MechBayPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Refit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Refit cancellation was not saved.',
    );
    mockCampaign.refitOrders = [cancelled];
    mockBaySaveError.mockReturnValue(<div>Campaign save failed.</div>);
    rerender(<MechBayPage />);
    expect(screen.getByText('Campaign save failed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Refit cancellation saved.',
    );
    expect(mockCancelRefitOrder).toHaveBeenNthCalledWith(
      2,
      'campaign-1',
      'retry-refit',
    );
    expect(mockSaveCampaign).toHaveBeenCalledTimes(2);
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
