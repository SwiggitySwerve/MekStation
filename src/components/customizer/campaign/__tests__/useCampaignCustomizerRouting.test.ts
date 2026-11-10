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
  hasUnsettledCampaignPersistence: () => false,
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

function renderRouting({
  editorUnitId,
  asPath = '/customizer',
  query,
}: {
  editorUnitId?: string;
  asPath?: string;
  query?: NextRouter['query'];
} = {}) {
  const nextRouter = {
    asPath,
    query: query ?? {
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
  const hook = renderHook(() =>
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
  return { ...hook, nextRouter };
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

  it('recomputes the fallback on an asPath-only change and keeps the memo stable otherwise', async () => {
    const previousUrl = window.location.href;
    const firstPath =
      '/customizer?mode=campaign-refit&campaignId=cached-campaign&unitId=unit-atlas&unitId=ignored&returnTo=mek-stable&campaignDate=3025-01-03&budget=2500000#structure';
    window.history.replaceState({}, '', firstPath);
    try {
      const query = {};
      const { result, rerender, nextRouter } = renderRouting({
        asPath: firstPath,
        query,
      });
      await waitFor(() =>
        expect(result.current.campaignRoute?.unitId).toBe('unit-atlas'),
      );
      const firstRoute = result.current.campaignRoute;
      rerender();
      expect(result.current.campaignRoute).toBe(firstRoute);

      await act(async () => {
        nextRouter.asPath = firstPath.replace(
          'unitId=unit-atlas',
          'unitId=unit-marauder',
        );
        rerender();
      });
      expect(nextRouter.query).toBe(query);
      expect(window.location.search).toContain('unitId=unit-atlas');
      expect(result.current.campaignRoute?.unitId).toBe('unit-marauder');
      expect(result.current.campaignRoute).not.toBe(firstRoute);
      const secondRoute = result.current.campaignRoute;
      rerender();
      expect(result.current.campaignRoute).toBe(secondRoute);
    } finally {
      window.history.replaceState({}, '', previousUrl);
    }
  });

  it('retains the browser search fallback while asPath has no query', async () => {
    const previousUrl = window.location.href;
    window.history.replaceState(
      {},
      '',
      '/customizer?mode=campaign-refit&campaignId=browser-campaign&unitId=unit-atlas&returnTo=mek-stable&campaignDate=3025-01-03&budget=2500000',
    );
    try {
      const { result } = renderRouting({ query: {} });
      await waitFor(() =>
        expect(result.current.campaignRoute?.campaignId).toBe(
          'browser-campaign',
        ),
      );
    } finally {
      window.history.replaceState({}, '', previousUrl);
    }
  });

  it('prefers a valid router query to the asPath fallback', async () => {
    const { result } = renderRouting({
      asPath:
        '/customizer?mode=campaign-refit&campaignId=other-campaign&unitId=other-unit&returnTo=mek-stable&campaignDate=3025-01-03&budget=1',
    });
    await waitFor(() =>
      expect(result.current.campaignRoute?.campaignId).toBe('cached-campaign'),
    );
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
