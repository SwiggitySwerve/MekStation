/**
 * Unit tests for VehicleArmorDiagram.
 *
 * Validates:
 *  - 4 base locations always rendered
 *  - Turret location appears when hasTurret
 *  - Rotor location appears when isVTOL
 *  - Body location appears when unitType === SUPPORT_VEHICLE
 *  - Auto-allocate button disabled when availablePoints === 0
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Scenario: VTOL adds Rotor location
 *       Scenario: Support vehicle adds Body location
 *       Scenario: Turret configured shows Turret location
 */

import type { StoreApi } from 'zustand';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import React from 'react';

import type { VehicleState } from '@/stores/vehicleState';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import {
  useVehicleStore,
  useVehicleStoreApi,
  VehicleStore,
} from '@/stores/useVehicleStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleArmorDiagram } from '../VehicleArmorDiagram';

jest.mock('@/stores/useVehicleStore');
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    motionType: GroundMotionType.TRACKED,
    unitType: UnitType.VEHICLE,
    turret: null,
    armorAllocation: {
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 8,
      [VehicleLocation.RIGHT]: 8,
      [VehicleLocation.REAR]: 4,
    } as Record<string, number>,
    tonnage: 50,
    armorTonnage: 5,
    setLocationArmor: jest.fn(),
    autoAllocateArmor: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseVehicleStore.mockImplementation((selector) =>
    selector(makeState() as unknown as VehicleStore),
  );
});

describe('VehicleArmorDiagram', () => {
  it('renders the 4 base armor location labels', () => {
    render(<VehicleArmorDiagram />);
    expect(screen.getByText('Front')).toBeInTheDocument();
    expect(screen.getByText('Left Side')).toBeInTheDocument();
    expect(screen.getByText('Right Side')).toBeInTheDocument();
    expect(screen.getByText('Rear')).toBeInTheDocument();
  });

  it('shows Turret location when hasTurret', () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({ turret: { type: 'Single' } }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText('Turret')).toBeInTheDocument();
  });

  it('shows Rotor location when VTOL', () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({
          motionType: GroundMotionType.VTOL,
          unitType: UnitType.VTOL,
        }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText('Rotor')).toBeInTheDocument();
  });

  it('shows Body location when support vehicle', () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({
          unitType: UnitType.SUPPORT_VEHICLE,
        }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('disables auto-allocate button when armorTonnage is 0', () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(makeState({ armorTonnage: 0 }) as unknown as VehicleStore),
    );
    render(<VehicleArmorDiagram />);
    const btn = screen.getByTestId('vehicle-armor-auto-allocate');
    expect(btn).toBeDisabled();
  });

  it('does not show Turret when turret is null', () => {
    render(<VehicleArmorDiagram />);
    expect(screen.queryByText('Turret')).not.toBeInTheDocument();
  });
});

describe('VehicleArmorDiagram app confirmation with the real store', () => {
  const actualStore = jest.requireActual<
    typeof import('@/stores/useVehicleStore')
  >('@/stores/useVehicleStore');
  const { createDefaultVehicleState, createEmptyVehicleArmorAllocation } =
    jest.requireActual<typeof import('@/stores/vehicleState')>(
      '@/stores/vehicleState',
    );
  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );
  const allocation = {
    ...createEmptyVehicleArmorAllocation(),
    Front: 10,
    Left: 8,
    Right: 8,
    Rear: 4,
  };

  function createStore(overrides: Partial<VehicleState> = {}) {
    return actualStore.createVehicleStore({
      ...createDefaultVehicleState({
        id: 'armor-confirmation-vehicle',
        name: 'Confirmation Tank',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      armorTonnage: 5,
      armorAllocation: { ...allocation },
      ...overrides,
    });
  }

  function tree(store: StoreApi<VehicleStore>, mounted = true) {
    const state = store.getState();
    return (
      <CustomizerConfirmationProvider
        scope={{ unitId: state.id, unitType: state.unitType }}
      >
        <actualStore.VehicleStoreContext.Provider value={store}>
          {mounted && <VehicleArmorDiagram />}
        </actualStore.VehicleStoreContext.Provider>
      </CustomizerConfirmationProvider>
    );
  }

  function request() {
    fireEvent.click(screen.getByTestId('vehicle-armor-auto-allocate'));
    return screen.getByRole('dialog', { name: 'Auto-allocate armor?' });
  }

  function confirm() {
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Auto-Allocate',
      }),
    );
  }

  beforeAll(() => {
    // JSDOM lifecycle fixture only; does not model UA top-layer or inertness.
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
    localStorage.removeItem('megamek-vehicle-armor-confirmation-vehicle');
    mockUseVehicleStore.mockImplementation(actualStore.useVehicleStore);
    jest
      .mocked(useVehicleStoreApi)
      .mockImplementation(actualStore.useVehicleStoreApi);
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    localStorage.removeItem('megamek-vehicle-armor-confirmation-vehicle');
  });

  it('asks in the named app dialog before overwriting a nonzero allocation', () => {
    const store = createStore();
    render(tree(store));
    expect(request().tagName).toBe('DIALOG');
    expect(store.getState().armorAllocation).toEqual(allocation);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('keeps allocation and modification state unchanged when Cancel is chosen', () => {
    const store = createStore();
    const before = store.getState();
    const allocate = jest.spyOn(before, 'autoAllocateArmor');
    render(tree(store));
    request();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState()).toBe(before);
    expect(allocate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('runs the original allocator once when the displayed request is confirmed twice', () => {
    const store = createStore();
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    const button = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Auto-Allocate',
    });
    act(() => {
      button.click();
      button.click();
    });
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation).toEqual({
      ...createEmptyVehicleArmorAllocation(),
      Front: 35,
      Left: 17,
      Right: 17,
      Rear: 8,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('refuses a same-total redistribution made after opening the request', () => {
    const store = createStore();
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    act(() => {
      store.getState().setLocationArmor(VehicleLocation.LEFT, 9);
      store.getState().setLocationArmor(VehicleLocation.RIGHT, 7);
    });
    const changed = store.getState();
    confirm();
    expect(changed.armorAllocation.Left + changed.armorAllocation.Right).toBe(
      16,
    );
    expect(store.getState()).toBe(changed);
    expect(allocate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    VehicleLocation.BODY,
    VehicleLocation.TURRET_2,
    VTOLLocation.ROTOR,
    'Imported location',
  ])('refuses changes to the undisplayed allocation key %s', (location) => {
    const store = createStore();
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    act(() =>
      store.setState({
        armorAllocation: { ...store.getState().armorAllocation, [location]: 3 },
      }),
    );
    const changed = store.getState();
    confirm();
    expect(store.getState()).toBe(changed);
    expect(allocate).not.toHaveBeenCalled();
  });

  it('refuses a removed dynamic allocation key even when total armor is unchanged', () => {
    const store = createStore({
      armorAllocation: { ...allocation, 'Imported location': 0 },
    });
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    act(() => store.setState({ armorAllocation: { ...allocation } }));
    const changed = store.getState();
    confirm();
    expect(store.getState()).toBe(changed);
    expect(allocate).not.toHaveBeenCalled();
  });

  const turret = {
    type: TurretType.SINGLE,
    maxWeight: 5,
    currentWeight: 0,
    rotationArc: 360,
  };
  it.each([
    ['tonnage', { tonnage: 60 }],
    ['motionType', { motionType: GroundMotionType.HOVER }],
    ['armorType', { armorType: ArmorTypeEnum.FERRO_FIBROUS_IS }],
    ['armorTonnage', { armorTonnage: 6 }],
    ['primary turret presence', { turret }],
    ['secondary turret presence', { secondaryTurret: turret }],
    ['unit ID', { id: 'replaced-vehicle' }],
    ['unit type', { unitType: UnitType.SUPPORT_VEHICLE }],
  ] satisfies ReadonlyArray<readonly [string, Partial<VehicleState>]>)(
    'refuses changed %s at approval',
    (_field, patch) => {
      const store = createStore();
      const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
      render(tree(store));
      request();
      act(() => store.setState(patch));
      const changed = store.getState();
      confirm();
      expect(store.getState()).toBe(changed);
      expect(allocate).not.toHaveBeenCalled();
    },
  );

  it.each(['turret', 'secondaryTurret'] as const)(
    'refuses a changed %s type with the same location layout',
    (key) => {
      const store = createStore({ [key]: turret });
      const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
      render(tree(store));
      request();
      act(() =>
        store.setState({ [key]: { ...turret, type: TurretType.DUAL } }),
      );
      const changed = store.getState();
      confirm();
      expect(store.getState()).toBe(changed);
      expect(allocate).not.toHaveBeenCalled();
    },
  );

  it('refuses an equal-valued replacement StoreApi with the same unit ID', () => {
    const first = createStore();
    const second = createStore();
    const firstAllocate = jest.spyOn(first.getState(), 'autoAllocateArmor');
    const secondAllocate = jest.spyOn(second.getState(), 'autoAllocateArmor');
    const view = render(tree(first));
    request();
    view.rerender(tree(second));
    confirm();
    expect(first.getState().armorAllocation).toEqual(allocation);
    expect(second.getState().armorAllocation).toEqual(allocation);
    expect(firstAllocate).not.toHaveBeenCalled();
    expect(secondAllocate).not.toHaveBeenCalled();
  });

  it('allows equal allocation and turret values plus unrelated metadata and a current action replacement', () => {
    const store = createStore({
      turret,
      secondaryTurret: turret,
      armorAllocation: { ...allocation, [VehicleLocation.TURRET_2]: 6 },
    });
    const currentAllocate = jest.fn(store.getState().autoAllocateArmor);
    const view = render(tree(store));
    request();
    act(() =>
      store.setState({
        armorAllocation: { ...store.getState().armorAllocation },
        turret: { ...turret, currentWeight: 1 },
        secondaryTurret: { ...turret },
        name: 'Renamed Tank',
        lastModifiedAt: 99,
        autoAllocateArmor: currentAllocate,
      }),
    );
    view.rerender(tree(store));
    confirm();
    expect(currentAllocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation).toEqual({
      ...createEmptyVehicleArmorAllocation(),
      Front: 32,
      Left: 16,
      Right: 16,
      Rear: 8,
      Turret: 8,
      'Turret 2': 6,
    });
  });

  it('uses live getState admission before a store update has rendered', () => {
    const store = createStore();
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    act(() => {
      store.setState({ armorTonnage: 6 });
      confirm();
    });
    expect(store.getState().armorTonnage).toBe(6);
    expect(store.getState().armorAllocation).toEqual(allocation);
    expect(allocate).not.toHaveBeenCalled();
  });

  it('allocates immediately without a dialog when all locations are zero', () => {
    const store = createStore({
      armorAllocation: createEmptyVehicleArmorAllocation(),
    });
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    fireEvent.click(screen.getByTestId('vehicle-armor-auto-allocate'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation.Front).toBe(35);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it.each([0, 0.01])(
    'disables allocation when %s armor tons provides zero whole points',
    (armorTonnage) => {
      const store = createStore({ armorTonnage });
      const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
      render(tree(store));
      const button = screen.getByTestId('vehicle-armor-auto-allocate');
      fireEvent.click(button);
      expect(button).toBeDisabled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(allocate).not.toHaveBeenCalled();
    },
  );

  it('preserves hidden secondary turret armor when the original allocator is confirmed', () => {
    const store = createStore({
      armorAllocation: { ...allocation, [VehicleLocation.TURRET_2]: 6 },
    });
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    request();
    confirm();
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation[VehicleLocation.TURRET_2]).toBe(6);
    expect(store.getState().armorAllocation.Front).toBe(35);
  });

  it('cancels when the requester disappears without changing unit scope', () => {
    const store = createStore();
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    const view = render(tree(store));
    request();
    view.rerender(tree(store, false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().armorAllocation).toEqual(allocation);
    expect(allocate).not.toHaveBeenCalled();
  });
});
