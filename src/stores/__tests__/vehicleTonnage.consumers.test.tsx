import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MOTION_TYPE_OPTIONS } from '@/components/customizer/vehicle/vehicleStructureOptions';
import { VehicleStructureTab } from '@/components/customizer/vehicle/VehicleStructureTab';
import {
  getTankMaxTonnage,
  getVehicleMaxTonnage,
  getVehicleMinTonnage,
} from '@/services/construction/constructionConstants';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { formatTons } from '@/utils/formatting';

import { createVehicleStore, VehicleStoreContext } from '../useVehicleStore';
import { createDefaultVehicleState } from '../vehicleState';

// C2's FU-55 contract: limits follow the construction owner, independently of
// the current superheavy flag. BLKTankFile.java:94-123 and VTOL.java:729-730
// (MegaMek 48fcb2f64) select superheavy vehicles from the entered weight.
function mountVehicle(
  motionType: GroundMotionType,
  support: boolean,
  isSuperheavy: boolean,
  tonnage = 20,
) {
  const store = createVehicleStore({
    ...createDefaultVehicleState({
      name: 'Tonnage Consumer',
      tonnage,
      techBase: TechBase.INNER_SPHERE,
    }),
    motionType,
    unitType: support
      ? UnitType.SUPPORT_VEHICLE
      : motionType === GroundMotionType.VTOL
        ? UnitType.VTOL
        : UnitType.VEHICLE,
    isSuperheavy,
  });
  render(
    <VehicleStoreContext.Provider value={store}>
      <VehicleStructureTab />
    </VehicleStoreContext.Provider>,
  );
  return store;
}

afterEach(() => localStorage.clear());

describe.each([false, true])('vehicle bounds: support=%s', (support) => {
  describe.each([false, true])('initial superheavy=%s', (isSuperheavy) => {
    it.each(Object.values(GroundMotionType))(
      '%s input bounds and stored clamps equal the construction owner',
      (motionType) => {
        const store = mountVehicle(motionType, support, isSuperheavy);
        const input = screen.getByTestId('vehicle-tonnage-input');
        const minimum = getVehicleMinTonnage(support);
        const maximum = getVehicleMaxTonnage(motionType, support);

        expect(input).toHaveAttribute('min', String(minimum));
        expect(input).toHaveAttribute('max', String(maximum));
        expect(input).toHaveAttribute('step', String(minimum));
        fireEvent.change(input, { target: { value: String(maximum + 1) } });
        expect(store.getState().tonnage).toBe(maximum);
        expect(input).toHaveValue(maximum);
        fireEvent.change(input, { target: { value: '0' } });
        expect(store.getState().tonnage).toBe(minimum);
        expect(input).toHaveValue(minimum);

        const validWeight = support ? 0.04 : 10;
        fireEvent.change(input, { target: { value: String(validWeight) } });
        expect(store.getState().tonnage).toBe(validWeight);
        expect(input).toHaveValue(validWeight);
        expect(input).toBeValid();
      },
    );

    it.each(MOTION_TYPE_OPTIONS.map(({ value }) => value))(
      'changing motion to %s clamps the stored weight to the owner',
      (motionType) => {
        const store = mountVehicle(
          GroundMotionType.TRACKED,
          support,
          isSuperheavy,
          800,
        );
        fireEvent.change(screen.getByTestId('vehicle-motion-type-select'), {
          target: { value: motionType },
        });
        const maximum = getVehicleMaxTonnage(motionType, support);
        expect(store.getState().motionType).toBe(motionType);
        expect(store.getState().tonnage).toBe(maximum);
        expect(screen.getByTestId('vehicle-tonnage-input')).toHaveValue(
          maximum,
        );
        expect(store.getState().unitType === UnitType.SUPPORT_VEHICLE).toBe(
          support,
        );
      },
    );

    it('labels every offered motion with its current owner limit', () => {
      mountVehicle(GroundMotionType.TRACKED, support, isSuperheavy);
      for (const { value, label } of MOTION_TYPE_OPTIONS) {
        expect(
          screen.getByRole('option', {
            name: `${label} (max ${formatTons(getVehicleMaxTonnage(value, support))})`,
          }),
        ).toHaveValue(value);
      }
    });
  });
});

it.each([
  GroundMotionType.TRACKED,
  GroundMotionType.WHEELED,
  GroundMotionType.HOVER,
  GroundMotionType.VTOL,
  GroundMotionType.NAVAL,
  GroundMotionType.SUBMARINE,
  GroundMotionType.WIGE,
])(
  'allows %s to cross its ordinary ceiling into the superheavy range',
  (motion) => {
    const ordinaryMaximum = getTankMaxTonnage(motion, false);
    const store = mountVehicle(motion, false, false, ordinaryMaximum);
    const input = screen.getByTestId('vehicle-tonnage-input');
    const superheavyMaximum = getTankMaxTonnage(motion, true);
    fireEvent.change(input, { target: { value: String(superheavyMaximum) } });
    expect(store.getState().tonnage).toBe(superheavyMaximum);
    fireEvent.change(input, { target: { value: String(ordinaryMaximum) } });
    expect(store.getState().tonnage).toBe(ordinaryMaximum);
  },
);
