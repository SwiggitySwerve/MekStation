import { act, render, renderHook } from '@testing-library/react';
import React from 'react';

import { useOverviewBuildSummary } from '@/components/customizer/tabs/overview/useOverviewBuildSummary';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { UnitEditorWithRouting } from '@/components/customizer/UnitEditorWithRouting';
import { useUnitEditorRoutingStats } from '@/components/customizer/UnitEditorWithRoutingStats';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useWeightValidation } from '@/hooks/validation/useWeightValidation';
import { UnitStoreContext, createUnitStore } from '@/stores/unit/useUnitStore';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums/TechBase';
import {
  calculateInternalStructure,
  calculateStructuralWeight as buildWeight,
  validateConstruction,
} from '@/utils/construction/constructionRules';
import { calculateStructureWeight } from '@/utils/construction/structureCalculations';
import {
  calculateStructuralWeight as validationWeight,
  getStructureWeight,
} from '@/utils/validation/weightValidationUtils';

// Spy on the real owning rule; consumers must retain its native result.
jest.mock('@/utils/construction/structureCalculations', () => ({
  calculateStructureWeight: jest.fn(
    jest.requireActual<
      typeof import('@/utils/construction/structureCalculations')
    >('@/utils/construction/structureCalculations').calculateStructureWeight,
  ),
}));
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false }),
}));
jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: () => ({
    status: 'valid',
    errorCount: 0,
    warningCount: 0,
  }),
}));
jest.mock('@/hooks/useDeviceType', () => ({
  useDeviceType: () => ({ isMobile: false }),
}));
jest.mock('@/hooks/useValidationToast', () => ({
  useValidationToast: () => {},
}));
jest.mock('@/components/customizer/UnitEditorWithRoutingLoadout', () => ({
  useUnitEditorLoadout: () => ({
    loadoutEquipment: [],
    availableLocations: [],
  }),
}));
jest.mock('@/components/customizer/UnitEditorWithRoutingTabContent', () => ({
  UnitEditorWithRoutingTabContent: () => null,
}));
jest.mock('@/components/customizer/campaign/CampaignRefitCommandBar', () => ({
  CampaignRefitCommandBar: () => null,
}));
jest.mock('@/components/customizer/equipment/ResponsiveLoadoutTray', () => ({
  ResponsiveLoadoutTray: () => null,
}));
jest.mock('@/components/customizer/shared/UnitSaveSummary', () => ({
  UnitSaveDetails: () => null,
  UnitSaveSummary: () => null,
}));
jest.mock('@/components/customizer/shared/UnitEditStatusSlot', () => ({
  UnitEditStatusSlot: () => null,
}));
jest.mock('@/components/customizer/shared/ValidationSummary', () => ({
  ValidationSummary: () => null,
}));
// These presentational children do not own the mass projection under test.
jest.mock('@/components/customizer/tabs/StructureTabChassisSection', () => ({
  StructureTabChassisSection: () => null,
}));
jest.mock('@/components/customizer/tabs/StructureTabCoolingSection', () => ({
  StructureTabCoolingSection: () => null,
}));
jest.mock('@/components/customizer/tabs/StructureTabMovementSection', () => ({
  StructureTabMovementSection: () => null,
}));

const owner = jest.mocked(calculateStructureWeight);
const stateFor = (): UnitState => ({
  ...createDefaultUnitState({
    name: 'Donor transport',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  }),
  configuration: MechConfiguration.BIPED,
  frankenStructure: {
    type: 'STANDARD',
    locationTonnage: {
      HEAD: 50,
      CENTER_TORSO: 50,
      RIGHT_TORSO: 50,
      LEFT_TORSO: 50,
      RIGHT_ARM: 50,
      LEFT_ARM: 50,
      RIGHT_LEG: 50,
      LEFT_LEG: 50,
    },
    typeByLocation: {
      HEAD: 'ENDO_STEEL',
      CENTER_TORSO: 'ENDO_STEEL',
      RIGHT_TORSO: 'ENDO_STEEL_CLAN',
      LEFT_TORSO: 'ENDO_STEEL_CLAN',
      RIGHT_ARM: 'STANDARD',
      LEFT_ARM: 'STANDARD',
      RIGHT_LEG: 'STANDARD',
      LEFT_LEG: 'STANDARD',
    },
  },
});
const statsInput = (state: UnitState) => ({
  ...state,
  unitName: state.name,
  validation: { status: 'valid' as const, errorCount: 0, warningCount: 0 },
});
const expectContext = (state: UnitState) => {
  expect(owner).toHaveBeenCalled();
  for (const args of owner.mock.calls) {
    expect(args).toEqual([
      50,
      InternalStructureType.STANDARD,
      expect.objectContaining({
        configuration: state.configuration,
        frankenStructure: state.frankenStructure,
      }),
    ]);
  }
};
const withStore = (state = stateFor()) => {
  const store = createUnitStore(state);
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <UnitStoreContext.Provider value={store}>
      {children}
    </UnitStoreContext.Provider>
  );
  return { store, Wrapper };
};

beforeEach(() => {
  localStorage.clear();
  owner.mockClear();
});

test('control: the hook keeps the mass returned by its existing owner', () => {
  const state = stateFor();
  const { result } = renderHook(() =>
    useUnitCalculations(50, state, 0, state.configuration),
  );
  expect(result.current.structureWeight).toBe(3.5);
});

test('the calculation hook forwards effective configuration and donor metadata', () => {
  const state = stateFor();
  renderHook(() => useUnitCalculations(50, state, 0, state.configuration));
  expectContext(state);
});

test.each([
  ['weight-validation consumer', useWeightValidation],
  ['overview consumer', useOverviewBuildSummary],
] as const)(
  '%s forwards metadata through the real calculation hook',
  (_name, hook) => {
    const { store, Wrapper } = withStore();
    renderHook(
      () => {
        hook();
      },
      { wrapper: Wrapper },
    );
    expectContext(store.getState());
  },
);

test('editor statistics forwards metadata through the real calculation hook', () => {
  const state = stateFor();
  renderHook(() => useUnitEditorRoutingStats(statsInput(state)));
  expectContext(state);
});

test('Structure tab forwards metadata through the real calculation hook', () => {
  const { store, Wrapper } = withStore();
  render(
    <Wrapper>
      <StructureTab />
    </Wrapper>,
  );
  expectContext(store.getState());
});

test.each([
  ['weight-validation', useWeightValidation],
  ['overview', useOverviewBuildSummary],
] as const)(
  'a map-only store edit refreshes the %s owner input',
  (_name, hook) => {
    const { store, Wrapper } = withStore();
    renderHook(
      () => {
        hook();
      },
      { wrapper: Wrapper },
    );
    const initialCalls = owner.mock.calls.length;
    owner.mockClear();
    act(() =>
      store.setState({
        frankenStructure: {
          ...store.getState().frankenStructure,
          type: 'STANDARD',
          locationTonnage: { LEFT_ARM: 90 },
        },
      }),
    );
    expectContext(store.getState());
    expect(owner).toHaveBeenCalledTimes(initialCalls);
  },
);

test.each([
  ['Structure tab', () => <StructureTab />],
  [
    'routed editor',
    () => (
      <UnitEditorWithRouting activeTabId="overview" onTabChange={() => {}} />
    ),
  ],
] as const)(
  '%s forwards metadata and refreshes after a map-only store edit',
  (_name, Consumer) => {
    const { store, Wrapper } = withStore();
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    expectContext(store.getState());
    owner.mockClear();
    act(() =>
      store.setState({
        frankenStructure: {
          type: 'STANDARD',
          typeByLocation: { LEFT_ARM: 'ENDO_STEEL' },
        },
      }),
    );
    expectContext(store.getState());
  },
);

test('a map-only props edit refreshes the editor-statistics memo', () => {
  const state = stateFor();
  const { rerender } = renderHook(
    (input: ReturnType<typeof statsInput>) => useUnitEditorRoutingStats(input),
    { initialProps: statsInput(state) },
  );
  owner.mockClear();
  const changed = {
    ...state,
    frankenStructure: {
      ...state.frankenStructure,
      type: 'STANDARD',
      locationTonnage: { LEFT_ARM: 90 },
    },
  };
  rerender(statsInput(changed));
  expectContext(changed);
});

test('the public validation weight aggregate forwards context', () => {
  const state = stateFor();
  validationWeight(state);
  expectContext(state);
});

test('legacy selections forward configuration without inventing donor metadata', () => {
  const state = { ...stateFor(), frankenStructure: undefined };
  renderHook(() => useUnitCalculations(50, state, 0, state.configuration));
  expectContext(state);
});

test.each([
  [35, InternalStructureType.STANDARD, 3.5, 3.5],
  [50, InternalStructureType.ENDO_STEEL_IS, 2.5, 2.5],
  [105, InternalStructureType.ENDO_STEEL_IS, 5.5, 10.5],
  [135, InternalStructureType.ENDO_COMPOSITE, 10.5, 20.5],
  [150, InternalStructureType.STANDARD, 15, 30],
  [200, InternalStructureType.INDUSTRIAL, 40, 80],
])(
  'keeps %st %s legacy mass %st while enabling native mass %st',
  (tonnage, type, expected, native) => {
    const actual = jest.requireActual<
      typeof import('@/utils/construction/structureCalculations')
    >('@/utils/construction/structureCalculations');
    expect(actual.calculateStructureWeight(tonnage, type)).toBe(expected);
    expect(
      actual.calculateStructureWeight(tonnage, type, {
        configuration: MechConfiguration.BIPED,
      }),
    ).toBe(native);
  },
);

test('the public structure lookup forwards context', () => {
  const state = stateFor();
  getStructureWeight(50, state.internalStructureType, state);
  expectContext(state);
});

test('the construction step forwards context and preserves the owner mass', () => {
  const state = stateFor();
  const step = calculateInternalStructure(
    50,
    state.internalStructureType,
    state,
  );
  expect(step.weight).toBe(3.5);
  expectContext(state);
});

test.each([
  ['construction weight aggregate', buildWeight],
  ['construction validation steps', validateConstruction],
] as const)('%s forwards the complete build context', (_name, calculate) => {
  const state = stateFor();
  calculate({ ...state, totalArmorPoints: 0, totalHeatSinks: 10 });
  expectContext(state);
});

test('all four editor consumers share native mass and refresh their totals on a donor-only edit', () => {
  const { store, Wrapper } = withStore();
  const weight = renderHook(() => useWeightValidation(), { wrapper: Wrapper });
  const overview = renderHook(() => useOverviewBuildSummary(), {
    wrapper: Wrapper,
  });
  const stats = renderHook(
    () => useUnitEditorRoutingStats(statsInput(store.getState())),
    { wrapper: Wrapper },
  );
  const tab = render(
    <Wrapper>
      <StructureTab />
    </Wrapper>,
  );
  const before = overview.result.current.calculations.totalStructuralWeight;
  expect(overview.result.current.calculations.structureWeight).toBe(3.5);
  expect(weight.result.current.allocatedWeight).toBe(before);
  expect(overview.result.current.stats.weightUsed).toBe(before);
  expect(stats.result.current.unitStats.weightUsed).toBe(before);
  expect(tab.getByText('3.5 t')).toBeInTheDocument();
  const structure = store.getState().frankenStructure;
  if (!structure) throw new Error('Expected donor metadata');
  act(() =>
    store.setState({
      frankenStructure: {
        ...structure,
        locationTonnage: { ...structure.locationTonnage, RIGHT_LEG: 90 },
      },
    }),
  );
  stats.rerender();
  expect(overview.result.current.calculations.structureWeight).toBe(4);
  expect(weight.result.current.allocatedWeight).toBe(before + 0.5);
  expect(overview.result.current.stats.weightUsed).toBe(before + 0.5);
  expect(stats.result.current.unitStats.weightUsed).toBe(before + 0.5);
  expect(tab.getByText('4.0 t')).toBeInTheDocument();
});
