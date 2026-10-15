import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';

import type { TabSpec } from '@/components/customizer/shared/TabSpec';
import type { UseCustomizerTabsResult } from '@/hooks/useCustomizerTabs';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';

import { CustomizerTabs } from '../CustomizerTabs';
import { useCustomizerTabShell } from '../useCustomizerTabShell';

let mockTabs: UseCustomizerTabsResult<{ armorVisible: boolean }> | undefined;
jest.mock('@/hooks/useCustomizerTabs', () => {
  const actual = jest.requireActual<typeof import('@/hooks/useCustomizerTabs')>(
    '@/hooks/useCustomizerTabs',
  );
  return {
    ...actual,
    useCustomizerTabs: (
      options: Parameters<
        typeof actual.useCustomizerTabs<{ armorVisible: boolean }>
      >[0],
    ) => {
      mockTabs = actual.useCustomizerTabs(options);
      return mockTabs;
    },
  };
});

const specs: TabSpec<{ armorVisible: boolean }>[] = [
  { id: 'overview', label: 'Overview', component: () => null },
  {
    id: 'armor',
    label: 'Armor',
    component: () => null,
    visibleWhen: (state) => state.armorVisible,
  },
];

const suspendedRender = new Promise<void>(() => {});
function Shell({
  onTabChange,
  armorVisible = true,
  suspend = false,
}: {
  onTabChange: (id: string) => void;
  armorVisible?: boolean;
  suspend?: boolean;
}) {
  const shell = useCustomizerTabShell({
    specs,
    state: { armorVisible },
    initialTab: 'overview',
    onTabChange,
  });
  if (suspend) throw suspendedRender;
  return (
    <>
      <CustomizerTabs {...shell.tabBarProps} />
      <output>{shell.activeTab}</output>
      <button onClick={() => shell.tabBarProps.onTabChange('missing')}>
        Missing target
      </button>
    </>
  );
}
function mount(onTabChange: (id: string) => void, armorVisible = true) {
  return render(
    <CustomizerConfirmationProvider
      scope={{ unitId: 'unit-a', unitType: 'BattleMech' }}
    >
      <Shell onTabChange={onTabChange} armorVisible={armorVisible} />
    </CustomizerConfirmationProvider>,
  );
}
function dirty() {
  act(() => mockTabs?.markDirty('overview'));
  expect(mockTabs?.dirtyTabs.has('overview')).toBe(true);
}

describe('Customizer tab shell accepted navigation', () => {
  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );
  beforeAll(() => {
    // Lifecycle-only JSDOM fixture, not proof of browser top-layer geometry.
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
  });
  afterAll(() => {
    for (const [key, descriptor] of [
      ['showModal', originalShow],
      ['close', originalClose],
    ] as const) {
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
    }
  });
  beforeEach(() => {
    mockTabs = undefined;
    jest.spyOn(window, 'confirm').mockImplementation(() => {
      throw new Error('Native confirmation is inaccessible');
    });
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('routes a clean visible change once', () => {
    const route = jest.fn();
    mount(route);
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    expect(screen.getByRole('status')).toHaveTextContent('armor');
    expect(route.mock.calls).toEqual([['armor']]);
  });
  it('does not route same or hidden targets', () => {
    const route = jest.fn();
    mount(route);
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Missing target' }));
    expect(route).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('overview');
  });
  it('keeps the route and dirty source when Cancel is chosen', () => {
    const route = jest.fn();
    mount(route);
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(route).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(mockTabs?.dirtyTabs.has('overview')).toBe(true);
  });
  it('routes only after approval, exactly once, retaining the dirty marker', () => {
    const route = jest.fn();
    mount(route);
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    expect(route).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(route.mock.calls).toEqual([['armor']]);
    expect(screen.getByRole('tab', { name: 'Armor' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(mockTabs?.dirtyTabs.has('overview')).toBe(true);
  });
  it('refuses approval when the target becomes hidden', () => {
    const route = jest.fn();
    const view = mount(route);
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    view.rerender(
      <CustomizerConfirmationProvider
        scope={{ unitId: 'unit-a', unitType: 'BattleMech' }}
      >
        <Shell onTabChange={route} armorVisible={false} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(route).not.toHaveBeenCalled();
    expect(mockTabs?.activeTab).toBe('overview');
  });
  it('uses the latest committed callback after an equal semantic rerender', () => {
    const oldRoute = jest.fn();
    const latestRoute = jest.fn();
    const view = mount(oldRoute);
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    view.rerender(
      <CustomizerConfirmationProvider
        scope={{ unitId: 'unit-a', unitType: 'BattleMech' }}
      >
        <Shell onTabChange={latestRoute} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(oldRoute).not.toHaveBeenCalled();
    expect(latestRoute.mock.calls).toEqual([['armor']]);
  });

  it('ignores future visibility and callback props from an uncommitted suspended render', () => {
    const committedRoute = jest.fn();
    const futureRoute = jest.fn();
    const frame = (future = false) => (
      <CustomizerConfirmationProvider
        scope={{ unitId: 'unit-a', unitType: 'BattleMech' }}
      >
        <React.Suspense fallback={<span>Loading editor</span>}>
          <Shell
            onTabChange={future ? futureRoute : committedRoute}
            armorVisible={!future}
            suspend={future}
          />
        </React.Suspense>
      </CustomizerConfirmationProvider>
    );
    const view = render(frame());
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Armor' }));
    act(() => React.startTransition(() => view.rerender(frame(true))));
    expect(screen.queryByText('Loading editor')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(committedRoute.mock.calls).toEqual([['armor']]);
    expect(futureRoute).not.toHaveBeenCalled();
  });
});
