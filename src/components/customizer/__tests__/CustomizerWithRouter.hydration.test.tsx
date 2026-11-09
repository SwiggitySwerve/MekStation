import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';
import React from 'react';

import CustomizerWithRouter from '@/components/customizer/CustomizerWithRouter';
import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore, type TabInfo } from '@/stores/useTabManagerStore';

jest.mock('next/router', () => ({ useRouter: jest.fn() }));

// Keep the real tab UI, controller, storage, and unit creation. Campaign
// orchestration, catalog reads, and the editor body are outside this seam.
jest.mock(
  '@/components/customizer/campaign/useCampaignCustomizerRouting',
  () => ({
    useCampaignCustomizerRouting: () => ({
      campaignRoute: null,
      campaignSession: null,
      isCampaignLoading: false,
      isCampaignSyncPending: false,
      returnToCampaign: jest.fn(),
      unavailableUnitId: null,
    }),
  }),
);

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({ getIndex: () => Promise.resolve([]) }),
}));

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/hooks/useAutoSaveIndicator', () => ({
  useAutoSaveIndicator: jest.fn(),
}));

jest.mock('@/components/customizer/UnitTypeRouter', () => ({
  UnitTypeRouter: ({ activeTab }: { activeTab: TabInfo | null }) => (
    <div>{activeTab ? `Editing ${activeTab.name}` : 'No unit selected'}</div>
  ),
}));

describe('CustomizerWithRouter hydration recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllStores(true);
    useTabManagerStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: true,
      isNewTabModalOpen: false,
    });
    jest.mocked(useRouter).mockReturnValue({
      route: '/customizer/[[...slug]]',
      query: {},
      asPath: '/customizer',
      pathname: '/customizer/[[...slug]]',
      basePath: '',
      isLocaleDomain: false,
      isFallback: false,
      isPreview: false,
      isReady: true,
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    clearAllStores(true);
    localStorage.clear();
  });

  it.each([
    ['corrupt JSON', '{broken'],
    [
      'a null tab',
      JSON.stringify({
        state: { tabs: [null], activeTabId: null },
        version: 0,
      }),
    ],
  ])('allows creating a unit after hydrating %s', async (_label, payload) => {
    localStorage.setItem('megamek-tab-manager', payload);

    render(<CustomizerWithRouter />);

    const addUnit = await screen.findByRole('button', {
      name: 'Add Unit',
    });
    expect(useTabManagerStore.getState().isLoading).toBe(false);
    expect(
      screen.queryByRole('status', { name: 'Loading customizer' }),
    ).not.toBeInTheDocument();
    fireEvent.click(addUnit);
    fireEvent.click(
      await screen.findByRole('button', { name: /New Blank Unit/ }),
    );

    expect(await screen.findByText(/^Editing /)).toBeInTheDocument();
    const { tabs, activeTabId } = useTabManagerStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(activeTabId);
    expect(getUnitStore(tabs[0].id)).toBeDefined();
  });

  it('finishes the component hydration gate when rehydrate rejects', async () => {
    useTabManagerStore.getState().setLoading(false);
    jest
      .spyOn(useTabManagerStore.persist, 'rehydrate')
      .mockRejectedValueOnce(new Error('rehydrate rejected'));

    render(<CustomizerWithRouter />);

    expect(
      await screen.findByRole('button', { name: 'Add Unit' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('status', { name: 'Loading customizer' }),
    ).not.toBeInTheDocument();
  });
});
