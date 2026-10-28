import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

import { CustomizerConfirmationProvider } from '../../dialogs/CustomizerConfirmationProvider';
import { OverviewTab } from '../OverviewTab';
jest.mock('@/stores/utils/clientSafeStorage', () => ({
  ...jest.requireActual<typeof import('@/stores/utils/clientSafeStorage')>(
    '@/stores/utils/clientSafeStorage',
  ),
  clientSafeStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
}));
const pod: IMountedEquipmentInstance = {
  instanceId: 'pod',
  equipmentId: 'medium-laser',
  name: 'Medium Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  weight: 1,
  criticalSlots: 1,
  heat: 3,
  techBase: TechBase.INNER_SPHERE,
  isRearMounted: false,
  isRemovable: true,
  isOmniPodMounted: true,
};
function makeStore(id = 'unit-a') {
  const store = createNewUnitStore({
    name: 'Confirmation fixture',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  store.setState({
    id,
    isOmni: true,
    equipment: [pod, { ...pod, instanceId: 'fixed', isOmniPodMounted: false }],
  });
  return store;
}
function viewOf(
  store: ReturnType<typeof makeStore>,
  readOnly = false,
  visible = true,
) {
  return (
    <CustomizerConfirmationProvider
      scope={{ unitId: store.getState().id, unitType: 'BattleMech' }}
    >
      <UnitStoreContext.Provider value={store}>
        {visible && <OverviewTab readOnly={readOnly} />}
      </UnitStoreContext.Provider>
    </CustomizerConfirmationProvider>
  );
}
const show = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const close = Object.getOwnPropertyDescriptor(
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
  for (const [name, value] of [
    ['showModal', show],
    ['close', close],
  ] as const) {
    if (value) Object.defineProperty(HTMLDialogElement.prototype, name, value);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});
beforeEach(() => {
  jest.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  try {
    expect(window.confirm).not.toHaveBeenCalled();
  } finally {
    jest.restoreAllMocks();
  }
});
function open() {
  fireEvent.click(screen.getByTestId('reset-chassis-button'));
  return screen.getByRole('dialog', { name: 'Reset chassis?' });
}
describe('Overview chassis reset confirmation', () => {
  it('Cancel preserves the real isolated unit equipment', () => {
    const store = makeStore();
    const before = store.getState().equipment;
    render(viewOf(store));
    const child = open();
    fireEvent.click(within(child).getByRole('button', { name: 'Cancel' }));
    expect(store.getState().equipment).toBe(before);
  });
  it('approved reset invokes the existing owner once and retains fixed equipment', () => {
    const store = makeStore();
    const owner = store.getState().resetChassis;
    const reset = jest.fn(() => owner());
    store.setState({ resetChassis: reset });
    render(viewOf(store));
    const approve = within(open()).getByRole('button', {
      name: 'Reset Chassis',
    });
    act(() => {
      approve.click();
      approve.click();
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(store.getState().equipment.map((item) => item.instanceId)).toEqual([
      'fixed',
    ]);
  });
  it.each(['replacement', 'pod', 'removable', 'omni', 'readOnly'] as const)(
    'refuses changed %s reset admission',
    (change) => {
      const store = makeStore();
      const reset = jest.fn();
      store.setState({ resetChassis: reset });
      const view = render(viewOf(store));
      const child = open();
      act(() => {
        if (change === 'replacement')
          store.setState({
            equipment: store
              .getState()
              .equipment.map((item) =>
                item.instanceId === 'pod'
                  ? { ...item, instanceId: 'new-pod' }
                  : item,
              ),
          });
        if (change === 'pod')
          store.setState({
            equipment: store
              .getState()
              .equipment.map((item) =>
                item.instanceId === 'pod'
                  ? { ...item, isOmniPodMounted: false }
                  : item,
              ),
          });
        if (change === 'removable')
          store.setState({
            equipment: store
              .getState()
              .equipment.map((item) =>
                item.instanceId === 'pod'
                  ? { ...item, isRemovable: false }
                  : item,
              ),
          });
        if (change === 'omni') store.setState({ isOmni: false });
      });
      view.rerender(viewOf(store, change === 'readOnly'));
      fireEvent.click(
        within(child).getByRole('button', { name: 'Reset Chassis' }),
      );
      expect(reset).not.toHaveBeenCalled();
    },
  );
  it('accepts equal policy reorder with the current store action', () => {
    const store = makeStore();
    const old = jest.fn();
    store.setState({ resetChassis: old });
    render(viewOf(store));
    const child = open();
    const current = jest.fn();
    act(() =>
      store.setState({
        equipment: [...store.getState().equipment]
          .reverse()
          .map((item) => ({ ...item, name: 'Renamed' })),
        resetChassis: current,
      }),
    );
    fireEvent.click(
      within(child).getByRole('button', { name: 'Reset Chassis' }),
    );
    expect(current).toHaveBeenCalledTimes(1);
    expect(old).not.toHaveBeenCalled();
  });
  it('refuses a different StoreApi with the same unit id', () => {
    const first = makeStore();
    const firstReset = jest.fn();
    first.setState({ resetChassis: firstReset });
    const second = makeStore();
    const secondReset = jest.fn();
    second.setState({ resetChassis: secondReset });
    const view = render(viewOf(first));
    const child = open();
    view.rerender(viewOf(second));
    fireEvent.click(
      within(child).getByRole('button', { name: 'Reset Chassis' }),
    );
    expect(firstReset).not.toHaveBeenCalled();
    expect(secondReset).not.toHaveBeenCalled();
  });
  it('refuses changed store identity before the provider scope is rerendered', () => {
    const store = makeStore();
    const reset = jest.fn();
    store.setState({ resetChassis: reset });
    render(viewOf(store));
    const child = open();
    act(() => store.setState({ id: 'changed-unit' }));
    fireEvent.click(
      within(child).getByRole('button', { name: 'Reset Chassis' }),
    );
    expect(reset).not.toHaveBeenCalled();
  });
  it('disposes a request when the same-unit overview unmounts', () => {
    const store = makeStore();
    const reset = jest.fn();
    store.setState({ resetChassis: reset });
    const view = render(viewOf(store));
    open();
    view.rerender(viewOf(store, false, false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });
  it('does not offer reset for read-only or non-Omni units', () => {
    const store = makeStore();
    const view = render(viewOf(store, true));
    expect(
      screen.queryByTestId('reset-chassis-button'),
    ).not.toBeInTheDocument();
    act(() => store.setState({ isOmni: false }));
    view.rerender(viewOf(store));
    expect(
      screen.queryByTestId('reset-chassis-button'),
    ).not.toBeInTheDocument();
  });
});
