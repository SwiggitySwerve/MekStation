import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useRouter } from 'next/router';
import React from 'react';

import CustomizerWithRouter from '@/components/customizer/CustomizerWithRouter';
import { useCustomizerConfirmation } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import { type CampaignCustomizerRouteState } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { RulesLevel } from '@/types/enums/RulesLevel';

const UNIT_ID = '1d1f3290-748c-469c-a534-79e9dd09a115';
const mockRoutingConfirm = jest.fn();

function MockUnitRouterProbe({
  activeTabId,
  activeTab,
}: {
  activeTabId: string;
  activeTab?: { id: string };
}) {
  const [count, setCount] = React.useState(0);
  const { requestConfirmation } = useCustomizerConfirmation();
  return (
    <div
      data-testid="unit-type-router"
      data-active-tab={activeTabId}
      data-rendered-unit={activeTab?.id}
    >
      <button onClick={() => setCount(count + 1)}>Controller {count}</button>
      <button
        onClick={() =>
          requestConfirmation({
            title: 'Confirm route action',
            message: 'Apply?',
            isCurrent: () => true,
            onConfirm: mockRoutingConfirm,
          })
        }
      >
        Request route action
      </button>
    </div>
  );
}

const mockTabManagerState = {
  tabs: [{ id: UNIT_ID, unitType: 'BattleMech' }],
  activeTabId: UNIT_ID,
  isLoading: false,
  selectTab: jest.fn(),
  addTab: jest.fn(),
  setLastSubTab: jest.fn(),
  getLastSubTab: jest.fn(() => 'preview'),
};

const mockCampaignRoutingState = {
  campaignRoute: null as CampaignCustomizerRouteState | null,
  campaignSession: null as unknown,
  isCampaignLoading: false,
  isCampaignSyncPending: false,
  returnToCampaign: jest.fn(),
  unavailableUnitId: null as string | null,
};

jest.mock('next/router', () => ({ useRouter: jest.fn() }));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: Object.assign(jest.fn(), {
    persist: { rehydrate: jest.fn(() => Promise.resolve()) },
  }),
}));

jest.mock('@/components/common', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock(
  '@/components/customizer/campaign/CampaignCustomizerSessionContext',
  () => ({
    CampaignCustomizerSessionProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <>{children}</>,
  }),
);

jest.mock(
  '@/components/customizer/campaign/useCampaignCustomizerRouting',
  () => ({
    useCampaignCustomizerRouting: () => mockCampaignRoutingState,
  }),
);

jest.mock('@/components/customizer/tabs', () => ({
  MultiUnitTabs: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

jest.mock('@/hooks/useAutoSaveIndicator', () => ({
  useAutoSaveIndicator: jest.fn(),
}));

jest.mock('@/components/customizer/UnitTypeRouter', () => ({
  UnitTypeRouter: (props: React.ComponentProps<typeof MockUnitRouterProbe>) => (
    <MockUnitRouterProbe {...props} />
  ),
}));

function mockCustomizerRoute(slug: string[]) {
  const router = {
    query: { slug },
    asPath: '/customizer/' + slug.join('/'),
    pathname: '/customizer/[[...slug]]',
    isReady: true,
    push: jest.fn(),
    replace: jest.fn(),
  } as unknown as ReturnType<typeof useRouter>;
  jest.mocked(useRouter).mockReturnValue(router);
  return router;
}

describe('CustomizerWithRouter route and persisted-tab composition', () => {
  beforeEach(() => {
    mockTabManagerState.tabs = [{ id: UNIT_ID, unitType: 'BattleMech' }];
    mockTabManagerState.activeTabId = UNIT_ID;
    Object.assign(mockCampaignRoutingState, {
      campaignRoute: null,
      campaignSession: null,
      isCampaignLoading: false,
      isCampaignSyncPending: false,
      unavailableUnitId: null,
    });
    (useTabManagerStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: typeof mockTabManagerState) => unknown) =>
        selector(mockTabManagerState),
    );
    (useTabManagerStore.persist.rehydrate as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps explicit Structure selected when persisted state says Preview', async () => {
    mockCustomizerRoute([UNIT_ID, 'structure']);
    render(<CustomizerWithRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('unit-type-router')).toHaveAttribute(
        'data-active-tab',
        'structure',
      );
    });
  });

  it('uses rendered unit scope and preserves mounted controller state across unit switches', async () => {
    const show = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'showModal',
    );
    const close = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      'close',
    );
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
    const router = mockCustomizerRoute([UNIT_ID, 'structure']);
    const view = render(<CustomizerWithRouter />);
    try {
      await waitFor(() =>
        expect(screen.getByTestId('unit-type-router')).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Controller 0' }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Request route action' }),
      );
      expect(
        screen.getByRole('dialog', { name: 'Confirm route action' }),
      ).toBeInTheDocument();
      const secondId = 'unit-b';
      mockTabManagerState.tabs = [
        ...mockTabManagerState.tabs,
        { id: secondId, unitType: 'Vehicle' },
      ];
      mockTabManagerState.activeTabId = secondId;
      view.rerender(<CustomizerWithRouter />);
      expect(router.query.slug).toEqual([UNIT_ID, 'structure']);
      expect(screen.getByTestId('unit-type-router')).toHaveAttribute(
        'data-rendered-unit',
        secondId,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Controller 1' }),
      ).toBeInTheDocument();
      expect(mockRoutingConfirm).not.toHaveBeenCalled();
    } finally {
      view.unmount();
      for (const [key, descriptor] of [
        ['showModal', show],
        ['close', close],
      ] as const) {
        if (descriptor)
          Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
      }
    }
  });

  it('restores persisted Preview when the URL omits its tab', async () => {
    mockCustomizerRoute([UNIT_ID]);
    render(<CustomizerWithRouter />);

    await waitFor(() => {
      expect(screen.getByTestId('unit-type-router')).toHaveAttribute(
        'data-active-tab',
        'preview',
      );
    });
  });
  it('keeps campaign Structure after hydration and wires unavailable-unit return', async () => {
    const router = mockCustomizerRoute([UNIT_ID, 'structure']);
    const campaignRoute: CampaignCustomizerRouteState = {
      mode: 'campaign-refit',
      campaignId: 'campaign-1',
      unitId: 'roster-unit-1',
      missionId: 'mission-1',
      returnTo: 'mission-readiness',
      campaignDate: '3025-01-01',
      budget: 1000,
      rulesLevel: RulesLevel.STANDARD,
      refitConstraints: 'field',
      editorUnitId: UNIT_ID,
    };
    router.query = {
      ...router.query,
      mode: campaignRoute.mode,
      campaignId: campaignRoute.campaignId,
      unitId: campaignRoute.unitId,
    };
    mockCampaignRoutingState.campaignRoute = campaignRoute;
    let finishHydration!: () => void;
    (useTabManagerStore.persist.rehydrate as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        finishHydration = resolve;
      }),
    );
    const view = render(<CustomizerWithRouter />);
    expect(screen.queryByTestId('unit-type-router')).not.toBeInTheDocument();
    await act(async () => {
      finishHydration();
    });
    expect(screen.getByTestId('unit-type-router')).toHaveAttribute(
      'data-active-tab',
      'structure',
    );
    expect(router.replace).not.toHaveBeenCalled();
    mockCampaignRoutingState.unavailableUnitId = campaignRoute.unitId;
    view.rerender(<CustomizerWithRouter />);
    expect(screen.queryByTestId('unit-type-router')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Return to Campaign' }));
    expect(mockCampaignRoutingState.returnToCampaign).toHaveBeenCalledTimes(1);
  });
});
