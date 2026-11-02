/** @spec openspec/changes/preserve-combat-vehicle-turret-source-facts/specs/vehicle-unit-system/spec.md */
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { createDefaultVehicleState } from '../vehicleState';
import {
  clearAllVehicleStores,
  createAndRegisterVehicle,
  duplicateVehicle,
  hydrateOrCreateVehicle,
} from '../vehicleStoreRegistry';

const options = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Explicit turret context',
  tonnage: 60,
  techBase: TechBase.INNER_SPHERE,
  isOmni: true,
  baseChassisTurretWeight: 0.5,
  baseChassisSecondaryTurretWeight: 0,
};
const turret = { type: TurretType.SINGLE, rotationArc: 360 };
beforeEach(() => {
  clearAllVehicleStores();
  localStorage.clear();
});
afterEach(() => clearAllVehicleStores());

it('creates explicit Omni context without deriving installation from allowances', () => {
  expect(createDefaultVehicleState(options)).toMatchObject({
    isOmni: true,
    baseChassisTurretWeight: 0.5,
    baseChassisSecondaryTurretWeight: 0,
    turret: null,
    secondaryTurret: null,
  });
});

it('saves and reopens assigned zero independently of secondary installation', () => {
  const store = createAndRegisterVehicle(options);
  store.setState(options);
  store.getState().setTurretType(TurretType.SINGLE);
  const raw = localStorage.getItem(`megamek-vehicle-${options.id}`);
  if (raw === null) throw new Error('context was not persisted');
  const saved: unknown = JSON.parse(raw);
  expect(saved).toMatchObject({
    state: {
      isOmni: true,
      baseChassisTurretWeight: 0.5,
      baseChassisSecondaryTurretWeight: 0,
      secondaryTurret: null,
    },
  });
  clearAllVehicleStores();
  expect(
    hydrateOrCreateVehicle(options.id, {
      name: 'Fallback without context',
      tonnage: 60,
      techBase: options.techBase,
    }).getState(),
  ).toMatchObject({
    isOmni: true,
    baseChassisTurretWeight: 0.5,
    baseChassisSecondaryTurretWeight: 0,
    turret,
    secondaryTurret: null,
  });
});

it('duplicates independent turret context and mounted identities without sharing mutable records', () => {
  const source = createAndRegisterVehicle(options);
  source.getState().setTurretType(TurretType.SINGLE);
  source.getState().setHasSecondaryTurret(true);
  source.setState({
    equipment: [
      {
        id: 'primary-ac',
        equipmentId: 'ac-5',
        name: 'AC/5',
        location: VehicleLocation.TURRET,
        isTurretMounted: true,
        isRearMounted: false,
        isSponsonMounted: false,
      },
    ],
  });
  source.setState(options);
  const copiedStore = duplicateVehicle(options.id);
  if (!copiedStore) throw new Error('source store was not registered');
  const copy = copiedStore.getState();
  expect(copy).toMatchObject({
    isOmni: true,
    baseChassisTurretWeight: 0.5,
    baseChassisSecondaryTurretWeight: 0,
    turret,
    secondaryTurret: turret,
    equipment: source.getState().equipment,
  });
  expect(copy.id).not.toBe(options.id);
  expect(copy.secondaryTurret).not.toBe(source.getState().secondaryTurret);
  expect(copy.equipment).not.toBe(source.getState().equipment);
  expect(copy.equipment[0]).not.toBe(source.getState().equipment[0]);
});

it('does not reinterpret legacy saved capacity as an assigned Omni allowance', () => {
  const legacy = createDefaultVehicleState({ ...options, isOmni: false });
  localStorage.setItem(
    `megamek-vehicle-${options.id}`,
    JSON.stringify({
      state: {
        ...legacy,
        baseChassisTurretWeight: undefined,
        baseChassisSecondaryTurretWeight: undefined,
        turret: { ...turret, maxWeight: 99, currentWeight: 42 },
      },
      version: 0,
    }),
  );
  const restored = hydrateOrCreateVehicle(options.id, {
    name: options.name,
    tonnage: 60,
    techBase: options.techBase,
  }).getState();
  expect(restored).toMatchObject({
    isOmni: false,
    turret: { maxWeight: 99, currentWeight: 42 },
  });
  expect(restored.baseChassisTurretWeight).toBeUndefined();
  expect(restored.baseChassisSecondaryTurretWeight).toBeUndefined();
});
