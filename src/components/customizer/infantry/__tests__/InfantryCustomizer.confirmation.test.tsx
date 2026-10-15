import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';

import type { UseCustomizerTabsResult } from '@/hooks/useCustomizerTabs';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import { createNewInfantryStore } from '@/stores/useInfantryStore';
import { InfantryMotive } from '@/types/unit/InfantryInterfaces';

import { InfantryCustomizer } from '../InfantryCustomizer';

let mockTabs:
  | UseCustomizerTabsResult<{ infantryMotive: InfantryMotive }>
  | undefined;
jest.mock('@/components/customizer/tabs/OverviewTabForType', () => ({
  OverviewTabForType: () => null,
}));
jest.mock('@/components/customizer/tabs/PreviewTabForType', () => ({
  PreviewTabForType: () => null,
}));
jest.mock('@/hooks/useCustomizerTabs', () => {
  const actual = jest.requireActual<typeof import('@/hooks/useCustomizerTabs')>(
    '@/hooks/useCustomizerTabs',
  );
  return {
    ...actual,
    useCustomizerTabs: (
      options: Parameters<
        typeof actual.useCustomizerTabs<{ infantryMotive: InfantryMotive }>
      >[0],
    ) => {
      mockTabs = actual.useCustomizerTabs(options);
      return mockTabs;
    },
  };
});
jest.mock('@/components/customizer/shared/tabRegistry', () => {
  const actual = jest.requireActual<
    typeof import('@/components/customizer/shared/tabRegistry')
  >('@/components/customizer/shared/tabRegistry');
  return {
    ...actual,
    INFANTRY_TABS: actual.INFANTRY_TABS.map((spec) => ({
      ...spec,
      component: () => <span>Panel {spec.id}</span>,
    })),
  };
});

describe('Infantry accepted tab navigation', () => {
  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );
  beforeAll(() => {
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

  function mount(route = jest.fn()) {
    const store = createNewInfantryStore({ name: 'Navigation platoon' });
    const view = render(
      <CustomizerConfirmationProvider
        scope={{ unitId: store.getState().id, unitType: 'Infantry' }}
      >
        <InfantryCustomizer
          store={store}
          initialTab="platoon"
          onTabChange={route}
        />
      </CustomizerConfirmationProvider>,
    );
    return { store, view, route };
  }
  function dirty() {
    act(() => mockTabs?.markDirty('platoon'));
    expect(mockTabs?.dirtyTabs.has('platoon')).toBe(true);
  }

  it('routes a clean visible change once', () => {
    const { route } = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Field Guns' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel fieldGuns');
    expect(route.mock.calls).toEqual([['fieldGuns']]);
  });
  it('does not route a same-tab click', () => {
    const { route } = mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Platoon' }));
    expect(route).not.toHaveBeenCalled();
  });
  it('retains the current panel, route and dirty marker on Cancel', () => {
    const { route } = mount();
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Field Guns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(route).not.toHaveBeenCalled();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel platoon');
    expect(mockTabs?.dirtyTabs.has('platoon')).toBe(true);
  });
  it('changes panel and route only once after approval', () => {
    const { route } = mount();
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Field Guns' }));
    expect(route).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(route.mock.calls).toEqual([['fieldGuns']]);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel fieldGuns');
  });
  it('denies approval after real store motive hides the target', () => {
    const { store, route } = mount();
    dirty();
    fireEvent.click(screen.getByRole('tab', { name: 'Field Guns' }));
    act(() => store.getState().setInfantryMotive(InfantryMotive.JUMP));
    expect(
      screen.queryByRole('tab', { name: 'Field Guns' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Leave tab' }));
    expect(route).not.toHaveBeenCalled();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel platoon');
  });
});
