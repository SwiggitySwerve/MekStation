/**
 * Unit tests for AerospaceArmorDiagram.
 *
 * Validates:
 *  - All 4 arc labels rendered (Nose / Left Wing / Right Wing / Aft)
 *  - SI bar rendered with data-testid
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Scenario: Arcs match aerospace-unit-system
 *       Scenario: SI bar rendered separately
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

import type { AerospaceState } from '@/stores/aerospaceState';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import {
  useAerospaceStore,
  useAerospaceStoreApi,
  AerospaceStore,
} from '@/stores/useAerospaceStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { AerospaceArmorDiagram } from '../AerospaceArmorDiagram';

jest.mock('@/stores/useAerospaceStore');
const mockUseAerospaceStore = useAerospaceStore as jest.MockedFunction<
  typeof useAerospaceStore
>;

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    tonnage: 50,
    armorAllocation: {
      [AerospaceLocation.NOSE]: 8,
      [AerospaceLocation.LEFT_WING]: 6,
      [AerospaceLocation.RIGHT_WING]: 6,
      [AerospaceLocation.AFT]: 4,
    } as Record<string, number>,
    setArcArmor: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseAerospaceStore.mockImplementation((selector) =>
    selector(makeState() as unknown as AerospaceStore),
  );
});

describe('AerospaceArmorDiagram', () => {
  it('renders all 4 arc labels matching aerospace-unit-system names', () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByText('Nose')).toBeInTheDocument();
    expect(screen.getByText('Left Wing')).toBeInTheDocument();
    expect(screen.getByText('Right Wing')).toBeInTheDocument();
    expect(screen.getByText('Aft')).toBeInTheDocument();
  });

  it('renders the SI bar element', () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByTestId('aerospace-si-bar')).toBeInTheDocument();
  });

  it('renders SI bar above arc sections', () => {
    const { container } = render(<AerospaceArmorDiagram />);
    const diagram = container.querySelector(
      '[data-testid="aerospace-armor-diagram"]',
    ) as HTMLElement;
    const siBar = diagram.querySelector(
      '[data-testid="aerospace-si-bar"]',
    ) as HTMLElement;
    // SI bar must appear before the arc inputs in the DOM
    const allChildren = Array.from(diagram.children);
    const siIndex = allChildren.indexOf(siBar);
    expect(siIndex).toBeGreaterThanOrEqual(0);
    // At least one arc input element follows it
    const arcInput = diagram.querySelector(
      '[data-testid^="aerospace-arc-diagram-input-"]',
    );
    expect(arcInput).toBeInTheDocument();
  });

  it('renders SI label containing Structural Integrity text', () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByText('Structural Integrity')).toBeInTheDocument();
  });
});

describe('AerospaceArmorDiagram — subType propagation', () => {
  // Regression guard (council audit 2026-05-15): the diagram's per-arc caps
  // must be driven by the store's aerospaceSubType. If the subType wire is
  // lost or hardcoded, arc caps silently diverge from the unit's actual type.
  function lwInput() {
    return screen.getByTestId(
      `aerospace-arc-diagram-input-${AerospaceLocation.LEFT_WING}`,
    );
  }

  it('applies the ASF wing factor when the store subType is AEROSPACE_FIGHTER', () => {
    mockUseAerospaceStore.mockImplementation((selector) =>
      selector(
        makeState({
          aerospaceSubType: AerospaceSubType.AEROSPACE_FIGHTER,
        }) as unknown as AerospaceStore,
      ),
    );
    render(<AerospaceArmorDiagram />);
    // 50t × 0.20 wing factor = 10
    expect(lwInput()).toHaveAttribute('max', '10');
  });

  it('drops the wing cap to 0 when the store subType is SMALL_CRAFT', () => {
    // Small craft carry side arcs, not wings — the wing location yields 0
    // through the enum bridge. A non-zero here would mean the diagram ignored
    // the store subType.
    mockUseAerospaceStore.mockImplementation((selector) =>
      selector(
        makeState({
          aerospaceSubType: AerospaceSubType.SMALL_CRAFT,
        }) as unknown as AerospaceStore,
      ),
    );
    render(<AerospaceArmorDiagram />);
    expect(lwInput()).toHaveAttribute('max', '0');
  });
});

describe('AerospaceArmorDiagram app confirmation with the real store', () => {
  const actualStore = jest.requireActual<
    typeof import('@/stores/useAerospaceStore')
  >('@/stores/useAerospaceStore');
  const { createDefaultAerospaceState, createEmptyAerospaceArmorAllocation } =
    jest.requireActual<typeof import('@/stores/aerospaceState')>(
      '@/stores/aerospaceState',
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
    ...createEmptyAerospaceArmorAllocation(),
    Nose: 8,
    'Left Wing': 6,
    'Right Wing': 6,
    Aft: 4,
  };

  function createStore(overrides: Partial<AerospaceState> = {}) {
    return actualStore.createAerospaceStore({
      ...createDefaultAerospaceState({
        id: 'armor-confirmation-aerospace',
        name: 'Confirmation Fighter',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      armorTonnage: 5,
      armorAllocation: { ...allocation },
      ...overrides,
    });
  }

  function tree(store: StoreApi<AerospaceStore>, mounted = true) {
    const state = store.getState();
    return (
      <CustomizerConfirmationProvider
        scope={{ unitId: state.id, unitType: state.unitType }}
      >
        <actualStore.AerospaceStoreContext.Provider value={store}>
          {mounted && <AerospaceArmorDiagram />}
        </actualStore.AerospaceStoreContext.Provider>
      </CustomizerConfirmationProvider>
    );
  }

  function request() {
    fireEvent.click(screen.getByTestId('aerospace-armor-auto-allocate'));
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
    localStorage.removeItem('megamek-aerospace-armor-confirmation-aerospace');
    mockUseAerospaceStore.mockImplementation(actualStore.useAerospaceStore);
    jest
      .mocked(useAerospaceStoreApi)
      .mockImplementation(actualStore.useAerospaceStoreApi);
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    localStorage.removeItem('megamek-aerospace-armor-confirmation-aerospace');
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
      Nose: 28,
      'Left Wing': 20,
      'Right Wing': 20,
      Aft: 12,
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
      store.getState().setArcArmor(AerospaceLocation.NOSE, 9);
      store.getState().setArcArmor(AerospaceLocation.LEFT_WING, 5);
    });
    const changed = store.getState();
    confirm();
    expect(
      changed.armorAllocation.Nose + changed.armorAllocation['Left Wing'],
    ).toBe(14);
    expect(store.getState()).toBe(changed);
    expect(allocate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([AerospaceLocation.FUSELAGE, 'Imported arc'])(
    'refuses changes to the undisplayed allocation key %s',
    (location) => {
      const store = createStore();
      const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
      render(tree(store));
      request();
      act(() =>
        store.setState({
          armorAllocation: {
            ...store.getState().armorAllocation,
            [location]: 3,
          },
        }),
      );
      const changed = store.getState();
      confirm();
      expect(store.getState()).toBe(changed);
      expect(allocate).not.toHaveBeenCalled();
    },
  );

  it('refuses a removed dynamic allocation key even when total armor is unchanged', () => {
    const store = createStore({
      armorAllocation: { ...allocation, 'Imported arc': 0 },
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

  it.each([
    ['tonnage', { tonnage: 60 }],
    ['subtype', { aerospaceSubType: AerospaceSubType.SMALL_CRAFT }],
    ['armorType', { armorType: ArmorTypeEnum.FERRO_FIBROUS_IS }],
    ['armorTonnage', { armorTonnage: 6 }],
    ['unit ID', { id: 'replaced-aerospace' }],
    ['unit type', { unitType: UnitType.CONVENTIONAL_FIGHTER }],
  ] satisfies ReadonlyArray<readonly [string, Partial<AerospaceState>]>)(
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

  it('allows equal allocation values plus unrelated metadata and a current action replacement', () => {
    const store = createStore();
    const currentAllocate = jest.fn(store.getState().autoAllocateArmor);
    const view = render(tree(store));
    request();
    act(() =>
      store.setState({
        armorAllocation: { ...store.getState().armorAllocation },
        name: 'Renamed Fighter',
        lastModifiedAt: 99,
        autoAllocateArmor: currentAllocate,
      }),
    );
    view.rerender(tree(store));
    confirm();
    expect(currentAllocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation).toEqual({
      Nose: 28,
      'Left Wing': 20,
      'Right Wing': 20,
      Aft: 12,
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

  it('allocates immediately without a dialog when all arcs are zero', () => {
    const store = createStore({
      armorAllocation: createEmptyAerospaceArmorAllocation(),
    });
    const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
    render(tree(store));
    fireEvent.click(screen.getByTestId('aerospace-armor-auto-allocate'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(allocate).toHaveBeenCalledTimes(1);
    expect(store.getState().armorAllocation.Nose).toBe(28);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it.each([0, 0.01])(
    'disables allocation when %s armor tons provides zero whole points',
    (armorTonnage) => {
      const store = createStore({ armorTonnage });
      const allocate = jest.spyOn(store.getState(), 'autoAllocateArmor');
      render(tree(store));
      const button = screen.getByTestId('aerospace-armor-auto-allocate');
      fireEvent.click(button);
      expect(button).toBeDisabled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(allocate).not.toHaveBeenCalled();
    },
  );

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
