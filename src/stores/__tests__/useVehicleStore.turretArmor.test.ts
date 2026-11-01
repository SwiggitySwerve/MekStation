/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { getTotalVehicleArmor } from '@/utils/construction/vehicle/armor';
import { toVehicleBVInput } from '@/utils/construction/vehicle/vehicleBVAdapter';

import { createVehicleStore } from '../useVehicleStore';
import { createDefaultVehicleState } from '../vehicleState';
import {
  clearAllVehicleStores,
  hydrateOrCreateVehicle,
} from '../vehicleStoreRegistry';

const OPTIONS = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Turret armor lifecycle',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
const turret = {
  type: TurretType.SINGLE,
  maxWeight: 5,
  currentWeight: 0,
  rotationArc: 360,
};
function makeStore() {
  const initial = createDefaultVehicleState(OPTIONS);
  return createVehicleStore({
    ...initial,
    turret: { ...turret, type: TurretType.DUAL },
    secondaryTurret: turret,
    armorAllocation: {
      ...initial.armorAllocation,
      [VehicleLocation.FRONT]: 8,
      [VehicleLocation.LEFT]: 6,
      [VehicleLocation.RIGHT]: 4,
      [VehicleLocation.REAR]: 2,
      [VehicleLocation.TURRET]: 7,
      [VehicleLocation.TURRET_2]: 9,
    },
  });
}
beforeEach(() => {
  clearAllVehicleStores();
  localStorage.clear();
});
afterEach(() => clearAllVehicleStores());

it('removes both turrets and their armor without mutating the old allocation or equipment', () => {
  const store = makeStore();
  const before = store.getState();
  store.getState().setTurretType(TurretType.NONE);
  const after = store.getState();
  expect(after.turret).toBeNull();
  expect(after.secondaryTurret).toBeNull();
  expect(after.armorAllocation).toEqual({
    ...before.armorAllocation,
    Turret: 0,
    'Turret 2': 0,
  });
  expect(before.armorAllocation.Turret).toBe(7);
  expect(before.armorAllocation['Turret 2']).toBe(9);
  expect(after.equipment).toBe(before.equipment);
  expect(after.isModified).toBe(true);
});

it('preserves body and rotor allocations when a chin turret is removed', () => {
  const store = makeStore();
  store.setState({
    turret: { ...turret, type: TurretType.CHIN },
    secondaryTurret: null,
    armorAllocation: {
      ...store.getState().armorAllocation,
      Body: 3,
      [VTOLLocation.ROTOR]: 2,
    },
  });
  store.getState().setTurretType(TurretType.NONE);
  expect(store.getState().armorAllocation).toMatchObject({
    Body: 3,
    Rotor: 2,
    Turret: 0,
    'Turret 2': 0,
  });
});

it('starts a newly installed primary turret at zero even with stale saved armor', () => {
  const store = makeStore();
  store.setState({ turret: null, secondaryTurret: null });
  store.getState().setTurretType(TurretType.SINGLE);
  expect(store.getState().armorAllocation.Turret).toBe(0);
  expect(store.getState().armorAllocation.Front).toBe(8);
});

it('starts a newly installed secondary turret at zero even with stale saved armor', () => {
  const store = makeStore();
  store.setState({ secondaryTurret: null });
  store.getState().setHasSecondaryTurret(true);
  expect(store.getState().armorAllocation['Turret 2']).toBe(0);
  expect(store.getState().armorAllocation.Turret).toBe(7);
});

it('preserves installed primary armor on a type edit and secondary armor on repeated enable', () => {
  const store = makeStore();
  store.getState().setTurretType(TurretType.SINGLE);
  expect(store.getState().armorAllocation.Turret).toBe(7);
  store.getState().setHasSecondaryTurret(true);
  expect(store.getState().armorAllocation['Turret 2']).toBe(9);
});

it('persists removal through real registry reopening and agrees with the BV armor input', () => {
  const store = makeStore();
  store.getState().setTurretType(TurretType.NONE);
  const reopened = hydrateOrCreateVehicle(OPTIONS.id, OPTIONS).getState();
  expect(reopened.turret).toBeNull();
  expect(reopened.secondaryTurret).toBeNull();
  expect(reopened.armorAllocation.Turret).toBe(0);
  expect(reopened.armorAllocation['Turret 2']).toBe(0);
  expect(getTotalVehicleArmor(reopened.armorAllocation)).toBe(20);
  expect(toVehicleBVInput(reopened).totalArmorPoints).toBe(20);
});
