/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { act, render, screen } from '@testing-library/react';
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
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeSupportStructureWeight } from '@/utils/construction/vehicle/supportWeight';

import { VehicleStatusBar } from '../VehicleStatusBar';

let mockReady = true;
const catalog = new Map<string, IEquipmentItem>();
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));
const item = (id: string, weight: number): IEquipmentItem => ({
  id,
  name: id,
  weight,
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3025,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
});
const mount = (id: string, location = VehicleLocation.BODY) => ({
  id,
  equipmentId: 'gun',
  name: id,
  location,
  isTurretMounted: location !== VehicleLocation.BODY,
  isRearMounted: false,
  isSponsonMounted: false,
});
const make = (overrides: Partial<VehicleState> = {}) =>
  createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Availability',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    armorTonnage: 0,
    crewSize: 4,
    ...overrides,
  });
const tree = (store: ReturnType<typeof make>, compact = false) => (
  <VehicleStoreContext.Provider value={store}>
    <VehicleStatusBar compact={compact} />
  </VehicleStoreContext.Provider>
);
const value = (label: string) =>
  screen.getByText(label).parentElement?.children[1].textContent;
beforeEach(() => {
  localStorage.clear();
  mockReady = true;
  catalog.clear();
  jest.restoreAllMocks();
  jest
    .spyOn(getEquipmentLookupService(), 'getById')
    .mockImplementation((id) => catalog.get(id));
});

it('shows Loading then Unknown, and recovers to known zero after a real equipment edit', () => {
  mockReady = false;
  const store = make({ equipment: [mount('source-instance')] });
  const view = render(tree(store));
  expect(value('Weight Free')).toBe('Loading');
  expect(value('Valid')).toBe('Loading');
  expect(
    screen.getByText('Weight Free').parentElement?.textContent,
  ).not.toContain('%');
  mockReady = true;
  view.rerender(tree(store));
  expect(value('Weight Free')).toBe('Unknown');
  expect(value('Valid')).toBe('Incomplete');
  catalog.set('zero', item('zero', 0));
  act(() =>
    store.setState({
      equipment: [{ ...mount('source-instance'), equipmentId: 'zero' }],
    }),
  );
  expect(value('Weight Free')).toBe('29.5 t');
  expect(value('Valid')).toBe('OK');
});
it('keeps an empty load numeric before readiness', () => {
  mockReady = false;
  render(tree(make()));
  expect(value('Weight Free')).toBe('29.5 t');
});
it('reacts to explicit Omni allowances independently of installation', () => {
  mockReady = false;
  const store = make({
    baseChassisTurretWeight: 1,
    baseChassisSecondaryTurretWeight: 0.25,
  });
  render(tree(store));
  expect(value('Weight Free')).toBe('29.5 t');
  act(() => store.getState().setIsOmni(true));
  expect(value('Weight Free')).toBe('28.0 t');
  act(() =>
    store.setState({
      baseChassisTurretWeight: 0,
      baseChassisSecondaryTurretWeight: 0,
    }),
  );
  expect(value('Weight Free')).toBe('29.5 t');
  expect(store.getState()).toMatchObject({
    turret: null,
    secondaryTurret: null,
  });
});
it('keeps invalid source mass Unknown when no mount depends on catalog loading', () => {
  mockReady = false;
  render(tree(make({ isOmni: true, baseChassisTurretWeight: NaN })));
  expect(value('Weight Free')).toBe('Unknown');
});
it('shows independent secondary overload and removes the synthetic denominator', () => {
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
      mount('primary', VehicleLocation.TURRET),
      mount('secondary', VehicleLocation.TURRET_2),
    ],
  });
  render(tree(store));
  expect(value('Weight Free')).toBe('23.0 t');
  expect(value('Valid')).toBe('1 err');
  expect(value('Turret')).toBe('2.5 t');
  expect(screen.getByText('Turret').parentElement?.textContent).not.toContain(
    '/',
  );
  act(() => store.setState({ baseChassisSecondaryTurretWeight: 0.5 }));
  expect(value('Weight Free')).toBe('23.0 t');
  expect(value('Valid')).toBe('OK');
  act(() => store.setState({ baseChassisSecondaryTurretWeight: 1.5 }));
  expect(value('Weight Free')).toBe('22.0 t');
  act(() => store.setState({ baseChassisSecondaryTurretWeight: 0 }));
  expect(value('Weight Free')).toBe('23.5 t');
  expect(value('Valid')).toBe('1 err');
});
it('keeps compact unavailable weight warning-coloured', () => {
  render(tree(make({ equipment: [mount('unresolved')] }), true));
  expect(screen.getByText('Unknown free')).toHaveClass('text-warning');
});
it('retains compact overweight error colour', () => {
  render(tree(make({ armorTonnage: 100 }), true));
  expect(screen.getByText('-70.5 t free')).toHaveClass('text-red-400');
});

it('keeps balanced free weight known zero and success-coloured', () => {
  render(tree(make({ armorTonnage: 29.5 })));
  expect(value('Weight Free')).toBe('0.0 t');
  expect(
    screen.getByText('Weight Free').parentElement?.children[1],
  ).toHaveClass('text-green-400');
});
it('retains independent known errors while mass is still loading', () => {
  mockReady = false;
  render(tree(make({ crewSize: 0, equipment: [mount('pending')] })));
  expect(value('Weight Free')).toBe('Loading');
  expect(value('Valid')).toBe('1 err');
  expect(screen.getByText('Valid').parentElement?.children[1]).toHaveClass(
    'text-red-400',
  );
});
it('transports structural tech zero to the existing support chassis owner', () => {
  const store = make({
    unitType: UnitType.SUPPORT_VEHICLE,
    structuralTechRating: 5,
  });
  render(tree(store));
  const before = parseFloat(value('Weight Free') ?? 'NaN');
  const expectedDelta =
    computeSupportStructureWeight(store.getState()) -
    computeSupportStructureWeight({
      ...store.getState(),
      structuralTechRating: 0,
    });
  act(() => store.setState({ structuralTechRating: 0 }));
  expect(parseFloat(value('Weight Free') ?? 'NaN') - before).toBeCloseTo(
    expectedDelta,
    5,
  );
});
