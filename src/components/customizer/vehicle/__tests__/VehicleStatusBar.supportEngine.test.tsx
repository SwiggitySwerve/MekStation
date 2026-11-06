/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { act, render } from '@testing-library/react';
import React from 'react';

import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import * as validation from '@/utils/construction/vehicle/vehicleValidation';

import { VehicleStatusBar } from '../VehicleStatusBar';

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false }),
}));
jest.mock('@/utils/construction/vehicle/vehicleValidation', () => {
  const actual = jest.requireActual<typeof validation>(
    '@/utils/construction/vehicle/vehicleValidation',
  );
  return {
    ...actual,
    validateVehicleConstruction: jest.fn(actual.validateVehicleConstruction),
  };
});

it('validates support engine mass with the current store technology', () => {
  const validate = jest.mocked(validation.validateVehicleConstruction);
  const store = createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Support engine context',
      tonnage: 20,
      techBase: TechBase.INNER_SPHERE,
      unitType: UnitType.SUPPORT_VEHICLE,
    }),
    cruiseMP: 1,
    engineTechRating: 2,
    turret: null,
    armorTonnage: 0,
  });
  render(
    <VehicleStoreContext.Provider value={store}>
      <VehicleStatusBar />
    </VehicleStoreContext.Provider>,
  );
  expect(validate).toHaveLastReturnedWith(
    expect.objectContaining({
      computedWeights: expect.objectContaining({ engine: 5 }),
    }),
  );
  act(() => store.setState({ engineTechRating: 3 }));
  expect(validate).toHaveLastReturnedWith(
    expect.objectContaining({
      computedWeights: expect.objectContaining({ engine: 1.5 }),
    }),
  );
});
