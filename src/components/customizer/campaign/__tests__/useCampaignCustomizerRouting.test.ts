import type { NextRouter } from 'next/router';

import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore } from 'zustand/vanilla';

import type { ICampaign } from '@/types/campaign/Campaign';

import { useCampaignCustomizerRouting } from '../useCampaignCustomizerRouting';

const mockLoadCampaign = jest.fn<Promise<boolean>, [string]>();
// The route only accepts a UUID editor id.
const EDITOR_UNIT_ID = '3f8b2c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';

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

const mockRosterUnits: { unitId: string; unitName: string }[] = [];

jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: (
    selector: (state: { units: typeof mockRosterUnits }) => unknown,
  ) => selector({ units: mockRosterUnits }),
}));

// The editor is built from whatever configuration the campaign holds.
jest.mock('@/lib/campaign/refit/unitConfiguration', () => ({
  resolveUnitConfiguration: (campaign: { engineRating: number }) => ({
    engineRating: campaign.engineRating,
    tonnage: 100,
  }),
}));
jest.mock('@/lib/campaign/customizer/campaignCustomizerSession', () => ({
  buildCampaignEditorUnitState: (input: unknown) => input,
  campaignEditorSessionKey: (...parts: string[]) => parts.join(':'),
}));
const mockCreateUnitFromFullState = jest.fn();
jest.mock('@/stores/unitStoreRegistry', () => ({
  createUnitFromFullState: (state: unknown) =>
    mockCreateUnitFromFullState(state),
  getUnitStore: () => undefined,
}));

const mockCampaignStore = createStore<{
  campaign: ICampaign | null;
  rehydratedCampaignId: string | null;
}>(() => ({ campaign: null, rehydratedCampaignId: null }));

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStore,
}));

function renderRouting({ editorUnitId }: { editorUnitId?: string } = {}) {
  const nextRouter = {
    asPath: '/customizer',
    query: {
      mode: 'campaign-refit',
      campaignId: 'cached-campaign',
      unitId: 'unit-atlas',
      returnTo: 'mek-stable',
      campaignDate: '3025-01-03T00:00:00.000Z',
      budget: '2500000',
      ...(editorUnitId && { editorUnitId }),
    },
    replace: jest.fn(),
  } as unknown as NextRouter;
  return renderHook(() =>
    useCampaignCustomizerRouting({
      activeTabId: null,
      addTab: jest.fn(),
      isHydrated: Boolean(editorUnitId),
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
    mockCreateUnitFromFullState.mockReset();
    mockRosterUnits.length = 0;
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

  it('builds the editor from the server copy, not the unvalidated cache', async () => {
    // Building from the cache while the server load is in flight left the
    // editor on the cached configuration, so saving any other change also
    // wrote the cached engine back over the server's.
    mockRosterUnits.push({ unitId: 'unit-atlas', unitName: 'Atlas' });
    mockCampaignStore.setState({
      campaign: { id: 'cached-campaign', engineRating: 250 } as never,
      rehydratedCampaignId: 'cached-campaign',
    });
    let finishLoad!: (loaded: boolean) => void;
    mockLoadCampaign.mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishLoad = resolve;
      }),
    );

    const { result } = renderRouting({ editorUnitId: EDITOR_UNIT_ID });

    await waitFor(() => expect(mockLoadCampaign).toHaveBeenCalledTimes(1));
    expect(result.current.campaignSession).toBeNull();
    expect(result.current.isCampaignLoading).toBe(true);
    expect(mockCreateUnitFromFullState).not.toHaveBeenCalled();

    await act(async () => {
      mockPersistenceState.baseVersion = 2;
      mockCampaignStore.setState({
        campaign: { id: 'cached-campaign', engineRating: 300 } as never,
      });
      finishLoad(true);
    });

    await waitFor(() =>
      expect(mockCreateUnitFromFullState).toHaveBeenCalledTimes(1),
    );
    expect(mockCreateUnitFromFullState).toHaveBeenCalledWith(
      expect.objectContaining({
        currentConfiguration: expect.objectContaining({ engineRating: 300 }),
      }),
    );
    expect(result.current.campaignSession).not.toBeNull();
  });

  it('falls back to the cached copy when the server load fails', async () => {
    mockRosterUnits.push({ unitId: 'unit-atlas', unitName: 'Atlas' });
    mockCampaignStore.setState({
      campaign: { id: 'cached-campaign', engineRating: 250 } as never,
      rehydratedCampaignId: 'cached-campaign',
    });
    mockLoadCampaign.mockResolvedValue(false);

    const { result } = renderRouting({ editorUnitId: EDITOR_UNIT_ID });

    await waitFor(() =>
      expect(mockCreateUnitFromFullState).toHaveBeenCalledTimes(1),
    );
    expect(mockLoadCampaign).toHaveBeenCalledTimes(1);
    expect(result.current.campaignSession).not.toBeNull();
  });
});
