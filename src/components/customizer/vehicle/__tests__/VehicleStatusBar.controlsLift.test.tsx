import { act, render, screen } from '@testing-library/react';
import React from 'react';

import {
  createVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import {
  createAndRegisterVehicle,
  duplicateVehicle,
  hydrateOrCreateVehicle,
  clearAllVehicleStores,
} from '@/stores/vehicleStoreRegistry';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';
import { validateVehicleConstruction } from '@/utils/construction/vehicle/vehicleValidation';

import { VehicleStatusBar } from '../VehicleStatusBar';

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false }),
}));
const free = () =>
  screen.getByText('Weight Free').parentElement?.children[1].textContent;
const makeState = () => ({
  ...createDefaultVehicleState({
    name: 'Reactive controls',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
  }),
  armorTonnage: 0,
  turret: null,
});

it('reacts through real store actions and preserves no-controls across persistence', () => {
  const store = createVehicleStore(makeState());
  render(
    <VehicleStoreContext.Provider value={store}>
      <VehicleStatusBar />
    </VehicleStoreContext.Provider>,
  );
  // Tracked 20t, rating80: installed engine4, structure2, controls1.
  expect(free()).toBe('13.0 t');
  act(() => store.getState().setHasNoControlSystems(true));
  expect(free()).toBe('14.0 t');
  act(() => store.getState().setMotionType(M.HOVER));
  // Rating10 hover engine floor4, structure2, lift2; no controls.
  expect(free()).toBe('12.0 t');
  act(() => store.getState().setHasNoControlSystems(false));
  expect(free()).toBe('11.0 t');
  act(() => store.getState().setTonnage(21));
  expect(free()).toBe('10.0 t');
  act(() => store.setState({ unitType: UnitType.SUPPORT_VEHICLE }));
  // Family alone drops the combat-only controls1.5/lift2.5 terms.
  expect(free()).toBe('14.0 t');
  act(() => store.getState().setHasNoControlSystems(true));
  const restored = hydrateOrCreateVehicle(store.getState().id, {
    name: 'Fallback',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(restored.getState().hasNoControlSystems).toBe(true);
  expect(restored.getState().unitType).toBe(UnitType.SUPPORT_VEHICLE);
});

it('validation reports the same controls/lift context, including support exclusion', () => {
  const state = makeState();
  const input = {
    ...state,
    turretType: TurretType.NONE,
    turretEquipmentWeight: 0,
    turretStructureWeight: 0,
    secondaryTurretEquipmentWeight: 0,
    secondaryTurretStructureWeight: 0,
    energyWeaponWeight: 0,
    armorType: ArmorTypeEnum.STANDARD,
    structureType: VehicleStructureType.STANDARD,
    motionType: M.HOVER,
  };
  expect(validateVehicleConstruction(input).computedWeights).toMatchObject({
    controls: 1,
    lift: 2,
  });
  expect(
    validateVehicleConstruction({ ...input, hasNoControlSystems: true })
      .computedWeights,
  ).toMatchObject({ controls: 0, lift: 2 });
  expect(
    validateVehicleConstruction({
      ...input,
      unitType: UnitType.SUPPORT_VEHICLE,
    }).computedWeights,
  ).toMatchObject({ controls: 0, lift: 0 });
});

it('preserves the explicit source fact when creating and duplicating a vehicle', () => {
  const original = createAndRegisterVehicle({
    name: 'No-controls trailer',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    hasNoControlSystems: true,
  });
  expect(original.getState().hasNoControlSystems).toBe(true);
  const copy = duplicateVehicle(original.getState().id);
  expect(copy?.getState().hasNoControlSystems).toBe(true);
  clearAllVehicleStores(true);
});
