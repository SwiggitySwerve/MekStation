import { act, fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { UnitRepository } from '@/services/units/UnitRepository';
import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { Era } from '@/types/temporal/Era';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { VehicleArmorTab } from '../VehicleArmorTab';
import { VehicleTurretTab } from '../VehicleTurretTab';

let mockReady = true;
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
const catalog = (name: string) =>
  mapToVehicleState(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
        'utf8',
      ),
    ),
  );
const tree = (
  store: ReturnType<typeof createVehicleStore>,
  tab: React.ReactNode,
) => (
  <VehicleStoreContext.Provider value={store}>
    <CustomizerConfirmationProvider
      scope={{
        unitId: store.getState().id,
        unitType: store.getState().unitType,
      }}
    >
      {tab}
    </CustomizerConfirmationProvider>
  </VehicleStoreContext.Provider>
);
const value = (panel: string, label: string) =>
  within(screen.getByRole('region', { name: panel + ' Figures' })).getByText(
    label,
  ).nextElementSibling;
function reopen(store: ReturnType<typeof createVehicleStore>) {
  getSQLiteService({ path: ':memory:' }).initialize();
  const state = store.getState();
  const data = serializeCustomVehicleState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: 'Panel Edit',
    era: Era.STAR_LEAGUE,
  });
  if (state.usesBarArmor)
    expect(data.armor).toMatchObject({
      type: 'BAR',
      barRating: state.barRating,
    });
  const repository = new UnitRepository();
  const result = repository.create({
    chassis: state.chassis,
    variant: 'Panel Edit',
    data: { ...data },
  });
  if (!result.success) throw Error(result.error.message);
  const saved = repository.getById(result.data.id);
  if (!saved) throw Error('Missing saved unit');
  return mapToVehicleState(JSON.parse(saved.data));
}
beforeAll(async () => {
  await getEquipmentLookupService().initialize();
});
beforeEach(() => {
  mockReady = true;
});
afterEach(() => {
  resetSQLiteService();
  localStorage.clear();
});
describe.each([390, 1440])('support and Omni panels at %ipx', (width) => {
  beforeEach(() =>
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: width,
    }),
  );
  it('centers each label on its actual armor polygon bounds', () => {
    const store = createVehicleStore(catalog('Burke II Superheavy Tank'));
    render(tree(store, <VehicleArmorTab />));
    const labels = screen.getAllByTestId('six-side-label');
    expect(labels).toHaveLength(6);
    for (const label of labels) {
      const polygon = label.closest('g')!.querySelector('polygon')!;
      const pairs = polygon
        .getAttribute('points')!
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number));
      const xs = pairs.map((p) => p[0]),
        ys = pairs.map((p) => p[1]);
      const frame = label.closest('foreignObject')!;
      expect(
        Number(frame.getAttribute('x')) +
          Number(frame.getAttribute('width')) / 2,
      ).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2, 6);
      expect(
        Number(frame.getAttribute('y')) +
          Number(frame.getAttribute('height')) / 2,
      ).toBeCloseTo((Math.min(...ys) + Math.max(...ys)) / 2, 6);
    }
  });
  it('shows Brunel six-side BAR armor with source tech C and preserves each edited side', () => {
    const store = createVehicleStore(catalog('Brunel Dump Truck'));
    render(tree(store, <VehicleArmorTab />));
    expect(
      screen.getByTestId('vehicle-six-side-armor-diagram'),
    ).toBeInTheDocument();
    const summary = within(screen.getByTestId('vehicle-armor-summary'));
    expect(screen.getByTestId('vehicle-armor-type-select')).toHaveValue('BAR');
    expect(screen.getByTestId('vehicle-armor-tonnage-input')).toHaveAttribute(
      'max',
      '15',
    );
    expect(
      summary.getByText('Available Points:').nextElementSibling,
    ).toHaveTextContent('83');
    expect(
      summary.getByText('Allocated:').nextElementSibling,
    ).toHaveTextContent('83');
    const diagram = within(screen.getByTestId('vehicle-armor-diagram'));
    expect(diagram.getByTestId('vehicle-armor-auto-allocate')).toBeEnabled();
    expect(
      diagram.queryByRole('spinbutton', { name: 'Body armor value' }),
    ).not.toBeInTheDocument();
    for (const [label, points] of [
      ['Front', 21],
      ['Front Right', 13],
      ['Front Left', 13],
      ['Rear Right', 13],
      ['Rear Left', 13],
      ['Rear', 10],
    ] as const) {
      const input = diagram.getByRole('spinbutton', {
        name: label + ' armor value',
      });
      expect(input).toHaveValue(points);
      act(() =>
        fireEvent.change(input, { target: { value: String(points - 1) } }),
      );
    }
    const loaded = reopen(store);
    expect(loaded).toMatchObject({
      usesBarArmor: true,
      barRating: 6,
      armorTechRating: 2,
      isSuperheavy: true,
    });
    const draft = JSON.parse(
      localStorage.getItem('megamek-vehicle-' + store.getState().id)!,
    ).state;
    expect(draft).toMatchObject({ usesBarArmor: true, armorTechRating: 2 });
    for (const [label, points] of [
      ['Front', 20],
      ['Front Right', 12],
      ['Front Left', 12],
      ['Rear Right', 12],
      ['Rear Left', 12],
      ['Rear', 9],
    ] as const)
      expect(loaded.armorAllocation[label]).toBe(points);
  });
  // Pinned 48fcb2f64: LongTomCannon.java:71 sets 20 t, so the primary
  // turret's 21 t of equipment rounds up to 2.5 t, matching its source allowance.
  it('shows independent Omni allowances, required masses and remaining values after a real mount edit and save', () => {
    const store = createVehicleStore(catalog('Gulltoppr OmniMonitor (Prime)'));
    const { unmount } = render(tree(store, <VehicleTurretTab />));
    expect(value('Primary Turret', 'Omni Allowance')).toHaveTextContent(
      '2.5 t',
    );
    expect(
      value('Primary Turret', 'Required Mechanism Mass'),
    ).toHaveTextContent('2.5 t');
    expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
      '0.0 t',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Primary Turret Figures' }),
      ).queryByText('Mechanism allowance exceeded.'),
    ).not.toBeInTheDocument();
    expect(value('Secondary Turret', 'Omni Allowance')).toHaveTextContent(
      '3 t',
    );
    expect(
      value('Secondary Turret', 'Required Mechanism Mass'),
    ).toHaveTextContent('3.0 t');
    expect(value('Secondary Turret', 'Remaining Allowance')).toHaveTextContent(
      '0.0 t',
    );
    const cannonMount = store
      .getState()
      .equipment.find(
        (m) =>
          m.location === VehicleLocation.TURRET &&
          /long.?tom/i.test(m.equipmentId),
      );
    if (!cannonMount) throw Error('Native primary Long Tom mount missing');
    const cannon = screen.getByText(cannonMount.name, {
      exact: true,
      selector: 'span',
    });
    act(() =>
      fireEvent.click(
        within(cannon.parentElement!.parentElement!).getByRole('button', {
          name: 'Remove',
        }),
      ),
    );
    expect(
      value('Primary Turret', 'Required Mechanism Mass'),
    ).toHaveTextContent('0.5 t');
    expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
      '2.0 t',
    );
    const loaded = reopen(store);
    unmount();
    const reopened = createVehicleStore(loaded);
    render(tree(reopened, <VehicleTurretTab />));
    expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
      '2.0 t',
    );
    expect(value('Secondary Turret', 'Remaining Allowance')).toHaveTextContent(
      '0.0 t',
    );
    act(() => reopened.setState({ baseChassisSecondaryTurretWeight: 0 }));
    expect(value('Secondary Turret', 'Remaining Allowance')).toHaveTextContent(
      '-3.0 t',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Secondary Turret Figures' }),
      ).getByText('Mechanism allowance exceeded.'),
    ).toBeInTheDocument();
    expect(value('Secondary Turret', 'Remaining Allowance')).toHaveClass(
      'text-red-400',
    );
  });
});
it('preserves independent allowance while catalog-dependent figures are Loading then Unknown', () => {
  const store = createVehicleStore(catalog('Gulltoppr OmniMonitor (Prime)'));
  store.setState({
    equipment: store
      .getState()
      .equipment.map((m) =>
        m.location === VehicleLocation.TURRET
          ? { ...m, equipmentId: 'missing-native-mount' }
          : m,
      ),
  });
  mockReady = false;
  const view = render(tree(store, <VehicleTurretTab />));
  expect(value('Primary Turret', 'Omni Allowance')).toHaveTextContent('2.5 t');
  expect(value('Primary Turret', 'Required Mechanism Mass')).toHaveTextContent(
    'Loading',
  );
  expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
    'Loading',
  );
  act(() => store.setState({ baseChassisTurretWeight: undefined }));
  expect(value('Primary Turret', 'Omni Allowance')).toHaveTextContent(
    'Unknown',
  );
  expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
    'Unknown',
  );
  act(() => store.setState({ baseChassisTurretWeight: 2.5 }));
  mockReady = true;
  view.rerender(tree(store, <VehicleTurretTab />));
  expect(value('Primary Turret', 'Required Mechanism Mass')).toHaveTextContent(
    'Unknown',
  );
  expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
    'Unknown',
  );
  act(() => store.setState({ baseChassisTurretWeight: -1 }));
  expect(value('Primary Turret', 'Omni Allowance')).toHaveTextContent(
    'Unknown',
  );
});
it('keeps independently known required mass when an explicit allowance is unavailable', () => {
  const store = createVehicleStore(catalog('Gulltoppr OmniMonitor (Prime)'));
  render(tree(store, <VehicleTurretTab />));
  for (const baseChassisTurretWeight of [undefined, -1, NaN]) {
    act(() => store.setState({ baseChassisTurretWeight }));
    expect(value('Primary Turret', 'Omni Allowance')).toHaveTextContent(
      'Unknown',
    );
    expect(
      value('Primary Turret', 'Required Mechanism Mass'),
    ).toHaveTextContent('2.5 t');
    expect(value('Primary Turret', 'Remaining Allowance')).toHaveTextContent(
      'Unknown',
    );
  }
});
it('offers four-side auto-allocation within the native BAR budget', () => {
  const store = createVehicleStore(catalog('Small Steamer'));
  render(tree(store, <VehicleArmorTab />));
  expect(screen.getByTestId('vehicle-armor-auto-allocate')).toBeEnabled();
  expect(screen.getByTestId('vehicle-armor-tonnage-input')).toHaveAttribute(
    'max',
    '0.1',
  );
  const summary = within(screen.getByTestId('vehicle-armor-summary'));
  expect(
    summary.getByText('Available Points:').nextElementSibling,
  ).toHaveTextContent('4');
  fireEvent.click(screen.getAllByRole('button', { name: 'Auto-Allocate' })[0]);
  expect(store.getState().armorAllocation).toMatchObject({
    Front: 2,
    Left: 1,
    Right: 1,
    Rear: 0,
    Body: 0,
  });
  expect(summary.getByText('Allocated:').nextElementSibling).toHaveTextContent(
    '4',
  );
});
