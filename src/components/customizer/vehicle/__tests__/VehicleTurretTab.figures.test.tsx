/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { act, render, screen, within } from '@testing-library/react';
import React from 'react';

import type { VehicleState } from '@/stores/vehicleState';
import type { IEquipmentItem } from '@/types/equipment';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleTurretTab } from '../VehicleTurretTab';

let mockReady = true;
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));
const catalog = new Map<string, IEquipmentItem>();
const item = (
  id: string,
  weight: number,
  category = EquipmentCategory.ENERGY_WEAPON,
): IEquipmentItem => ({
  id,
  name: id,
  weight,
  category,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3025,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
});
const mount = (
  id: string,
  equipmentId: string,
  location = VehicleLocation.TURRET,
) => ({
  id,
  equipmentId,
  name: id,
  location,
  isTurretMounted: true,
  isRearMounted: false,
  isSponsonMounted: false,
});
const make = (overrides: Partial<VehicleState> = {}) =>
  createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Figures',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    ...overrides,
  });
const tree = (store: ReturnType<typeof make>) => (
  <VehicleStoreContext.Provider value={store}>
    <VehicleTurretTab />
  </VehicleStoreContext.Provider>
);
const panel = (name = 'Primary Turret Figures') =>
  within(screen.getByRole('region', { name }));
const value = (label: string, name?: string) =>
  panel(name).getByText(label).nextElementSibling as HTMLElement;
beforeEach(() => {
  localStorage.clear();
  mockReady = true;
  catalog.clear();
  jest.restoreAllMocks();
  jest
    .spyOn(getEquipmentLookupService(), 'getById')
    .mockImplementation((id) => catalog.get(id));
});

describe.each([375, 768, 1280])('turret figures rendered at %ipx', (width) => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
    });
  });
  it('shows resolved independent figures with no capacity bar or denominator', () => {
    catalog.set('gun', item('gun', 5.1));
    catalog.set('ammo', item('ammo', 2, EquipmentCategory.AMMUNITION));
    const store = make();
    store.getState().setTurretType(TurretType.SINGLE);
    store.getState().setHasSecondaryTurret(true);
    store.setState({
      equipment: [
        mount('one', 'gun'),
        mount('rounds', 'ammo'),
        mount('two', 'gun', VehicleLocation.TURRET_2),
      ],
    });
    render(tree(store));
    expect(value('Mounted Equipment')).toHaveTextContent('7.1 t');
    expect(value('Qualifying Equipment')).toHaveTextContent('5.1 t');
    expect(value('Mechanism Weight')).toHaveTextContent('1.0 t');
    expect(
      value('Mounted Equipment', 'Secondary Turret Figures'),
    ).toHaveTextContent('5.1 t');
    expect(
      value('Mechanism Weight', 'Secondary Turret Figures'),
    ).toHaveTextContent('1.0 t');
    expect(value('Omni Allowance')).toHaveTextContent('Not applicable');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/capacity used|Max Capacity/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Primary Turret Figures' })
        .textContent,
    ).not.toMatch(/\d\s*\//);
    expect(value('Mechanism Weight').closest('dl')).toHaveClass(
      'grid-cols-1',
      'sm:grid-cols-2',
    );
  });
});

it('preserves explicit absent-turret charges, raw fractional allowances and zero', () => {
  const store = make({
    isOmni: true,
    baseChassisTurretWeight: 0.25,
    baseChassisSecondaryTurretWeight: 0,
  });
  render(tree(store));
  expect(value('Omni Allowance')).toHaveTextContent('0.25 t');
  expect(value('Mechanism Weight')).toHaveTextContent('0.5 t');
  expect(
    value('Mechanism Weight', 'Secondary Turret Figures'),
  ).toHaveTextContent('0.0 t');
  expect(value('Omni Allowance', 'Secondary Turret Figures')).toHaveTextContent(
    '0 t',
  );
  expect(panel().getByText('No turret installed.')).toBeInTheDocument();
  act(() => store.setState({ baseChassisTurretWeight: -1 }));
  expect(value('Omni Allowance')).toHaveTextContent('-1 t');
  expect(value('Mechanism Weight')).toHaveTextContent('0.0 t');
  act(() => store.setState({ baseChassisTurretWeight: undefined }));
  expect(value('Omni Allowance')).toHaveTextContent('Not supplied');
});

it('shows Loading then Unknown and resolves after a real mount edit', () => {
  mockReady = false;
  const store = make();
  store.getState().setTurretType(TurretType.SINGLE);
  store.setState({ equipment: [mount('source', 'missing')] });
  const view = render(tree(store));
  expect(value('Qualifying Equipment')).toHaveTextContent('Loading');
  expect(value('Mechanism Weight')).toHaveTextContent('Loading');
  expect(value('Mechanism Weight')).toHaveClass('text-amber-400');
  expect(
    value('Mechanism Weight', 'Secondary Turret Figures'),
  ).toHaveTextContent('0.0 t');
  mockReady = true;
  view.rerender(tree(store));
  expect(value('Mounted Equipment')).toHaveTextContent('Unknown');
  expect(value('Mechanism Weight')).toHaveTextContent('Unknown');
  catalog.set('zero', item('zero', 0));
  act(() => store.setState({ equipment: [mount('source', 'zero')] }));
  expect(value('Mechanism Weight')).toHaveTextContent('0.0 t');
});

it('retains a known assigned charge while its basis is Loading', () => {
  mockReady = false;
  const store = make({ isOmni: true, baseChassisTurretWeight: 0.25 });
  store.getState().setTurretType(TurretType.SINGLE);
  store.setState({ equipment: [mount('source', 'missing')] });
  render(tree(store));
  expect(value('Qualifying Equipment')).toHaveTextContent('Loading');
  expect(value('Mechanism Weight')).toHaveTextContent('0.5 t');
  expect(value('Omni Allowance')).toHaveTextContent('0.25 t');
});

it('keeps invalid source allowance Unknown during catalog startup', () => {
  mockReady = false;
  render(tree(make({ isOmni: true, baseChassisTurretWeight: NaN })));
  expect(value('Mechanism Weight')).toHaveTextContent('Unknown');
  expect(value('Omni Allowance')).toHaveTextContent('Unknown');
  expect(value('Qualifying Equipment')).toHaveTextContent('0.0 t');
});

it('keeps per-turret overload colours reactive at an unchanged rounded charge', () => {
  catalog.set('gun', item('gun', 2.5));
  const store = make({
    isOmni: true,
    baseChassisTurretWeight: 1,
    baseChassisSecondaryTurretWeight: 0.25,
  });
  store.getState().setTurretType(TurretType.SINGLE);
  store.getState().setHasSecondaryTurret(true);
  store.setState({
    equipment: [
      mount('one', 'gun'),
      mount('two', 'gun', VehicleLocation.TURRET_2),
    ],
  });
  render(tree(store));
  expect(value('Mechanism Weight')).not.toHaveClass('text-red-400');
  expect(value('Qualifying Equipment', 'Secondary Turret Figures')).toHaveClass(
    'text-red-400',
  );
  expect(
    panel('Secondary Turret Figures').getByText(
      'Mechanism allowance exceeded.',
    ),
  ).toBeInTheDocument();
  expect(
    value('Mechanism Weight', 'Secondary Turret Figures'),
  ).toHaveTextContent('0.5 t');
  act(() => store.setState({ baseChassisSecondaryTurretWeight: 0.5 }));
  expect(
    value('Mechanism Weight', 'Secondary Turret Figures'),
  ).toHaveTextContent('0.5 t');
  expect(
    value('Qualifying Equipment', 'Secondary Turret Figures'),
  ).not.toHaveClass('text-red-400');
  expect(
    screen.queryByText('Mechanism allowance exceeded.'),
  ).not.toBeInTheDocument();
});

it('uses the support diagnostic owner rather than claiming a known mechanism', () => {
  render(
    tree(
      make({
        unitType: UnitType.SUPPORT_VEHICLE,
        isOmni: true,
        baseChassisTurretWeight: 1,
      }),
    ),
  );
  expect(value('Mechanism Weight')).toHaveTextContent('Unknown');
});

it('shows only chin figures for VTOL and preserves empty zero before readiness', () => {
  mockReady = false;
  const store = make({ motionType: GroundMotionType.VTOL });
  store.getState().setTurretType(TurretType.CHIN);
  render(tree(store));
  expect(value('Mechanism Weight', 'Chin Turret Figures')).toHaveTextContent(
    '0.0 t',
  );
  expect(
    screen.queryByRole('region', { name: 'Secondary Turret Figures' }),
  ).not.toBeInTheDocument();
});
