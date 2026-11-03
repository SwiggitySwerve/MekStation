import { act, fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
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
import { Era } from '@/types/temporal/Era';
import { getTotalVehicleArmor } from '@/utils/construction/vehicle/armor';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { VehicleArmorTab } from '../VehicleArmorTab';

const catalog = (name: string) =>
  mapToVehicleState(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/vehicles', name + '.json'),
        'utf8',
      ),
    ),
  );
const tree = (store: ReturnType<typeof createVehicleStore>) => (
  <VehicleStoreContext.Provider value={store}>
    <CustomizerConfirmationProvider
      scope={{
        unitId: store.getState().id,
        unitType: store.getState().unitType,
      }}
    >
      <VehicleArmorTab />
    </CustomizerConfirmationProvider>
  </VehicleStoreContext.Provider>
);
function reopen(store: ReturnType<typeof createVehicleStore>) {
  getSQLiteService({ path: ':memory:' }).initialize();
  const state = store.getState();
  const data = serializeCustomVehicleState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: 'Panel Edit',
    era: Era.STAR_LEAGUE,
  });
  const repository = new UnitRepository();
  const result = repository.create({
    chassis: state.chassis,
    variant: 'Panel Edit',
    data: { ...data },
  });
  if (!result.success) throw Error(result.error.message);
  const saved = repository.getById(result.data.id);
  if (!saved) throw Error('Saved unit missing');
  return mapToVehicleState(JSON.parse(saved.data));
}
afterEach(() => {
  resetSQLiteService();
  localStorage.clear();
});

describe.each([390, 1440])(
  'catalog vehicle subtype panels at %ipx',
  (width) => {
    beforeEach(() =>
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      }),
    );
    it('renders and edits all six Burke sides, then preserves their actual SQLite save', () => {
      const store = createVehicleStore(catalog('Burke II Superheavy Tank'));
      render(tree(store));
      const diagram = within(screen.getByTestId('vehicle-armor-diagram'));
      expect(
        diagram.getByTestId('vehicle-six-side-armor-diagram'),
      ).toBeInTheDocument();
      const sides = [
        ['Front', 22],
        ['Front Right', 14],
        ['Front Left', 14],
        ['Rear Right', 14],
        ['Rear Left', 14],
        ['Rear', 11],
      ] as const;
      expect(
        getTotalVehicleArmor(store.getState().armorAllocation, true, false),
      ).toBe(107);
      expect(
        within(screen.getByTestId('vehicle-armor-summary')).getByText(
          'Allocated:',
        ).nextElementSibling,
      ).toHaveTextContent('107');
      for (const [label, value] of sides) {
        const input = diagram.getByRole('spinbutton', {
          name: label + ' armor value',
        });
        expect(input).toHaveValue(value);
        act(() =>
          fireEvent.change(input, { target: { value: String(value - 1) } }),
        );
        expect(input).toHaveValue(value - 1);
      }
      const loaded = reopen(store);
      for (const [label, value] of sides)
        expect(loaded.armorAllocation[label]).toBe(value - 1);
      expect(getTotalVehicleArmor(loaded.armorAllocation, true, false)).toBe(
        101,
      );
      expect(
        diagram.queryByRole('spinbutton', { name: 'Left Side armor value' }),
      ).not.toBeInTheDocument();
    });
    it('binds rear and front turret identities independently and preserves both saved values', () => {
      const store = createVehicleStore(catalog('Arrow IV Assault Vehicle'));
      render(tree(store));
      const diagram = within(screen.getByTestId('vehicle-armor-diagram'));
      const rear = diagram.getByRole('spinbutton', {
        name: 'Rear Turret armor value',
      });
      const front = diagram.getByRole('spinbutton', {
        name: 'Front Turret armor value',
      });
      expect(rear).toHaveValue(52);
      expect(front).toHaveValue(32);
      expect(
        diagram
          .getByLabelText(/^Rear Turret armor:/)
          .querySelector('.text-amber-400'),
      ).not.toBeNull();
      expect(
        diagram
          .getByLabelText(/^Front Turret armor:/)
          .querySelector('.text-orange-400'),
      ).not.toBeNull();
      act(() => fireEvent.change(rear, { target: { value: '17' } }));
      act(() => fireEvent.change(front, { target: { value: '16' } }));
      const loaded = reopen(store);
      expect(loaded.armorAllocation.Turret).toBe(17);
      expect(loaded.armorAllocation['Turret 2']).toBe(16);
      expect(getTotalVehicleArmor(loaded.armorAllocation, true, true)).toBe(
        216,
      );
      expect(
        within(
          screen.getByTestId('vehicle-armor-allocation-section'),
        ).getByRole('spinbutton', { name: 'Front Turret armor allocation' }),
      ).toHaveValue(16);
    });
  },
);
