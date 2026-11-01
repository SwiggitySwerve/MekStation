import { act, render, screen } from '@testing-library/react';
import React from 'react';

import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import {
  createDefaultVehicleState,
  createEmptyVehicleArmorAllocation,
} from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { VehicleStatusBar } from '../VehicleStatusBar';

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false }),
}));

/** @spec establish-all-unit-data-parity/battle-value-system */
it('recomputes displayed defense for chassis flags and support identity', () => {
  const store = createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Type modifier',
      tonnage: 20,
      techBase: TechBase.INNER_SPHERE,
    }),
    armorAllocation: {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 100,
    },
  });
  render(
    <VehicleStoreContext.Provider value={store}>
      <VehicleStatusBar />
    </VehicleStoreContext.Provider>,
  );
  const bv = () =>
    screen.getByRole('button', { name: 'Show Battle Value breakdown' });
  // Pool 250 armor + 36 structure, factor 1.1; offense remains 11.2.
  expect(bv()).toHaveTextContent('283D / 11O');
  act(() => store.getState().setEnvironmentalSealing(true));
  expect(bv()).toHaveTextContent('315D / 11O');
  act(() => store.getState().setFlotationHull(true));
  expect(bv()).toHaveTextContent('346D / 11O');
  act(() => store.setState({ unitType: UnitType.SUPPORT_VEHICLE }));
  expect(bv()).toHaveTextContent('283D / 11O');
});
