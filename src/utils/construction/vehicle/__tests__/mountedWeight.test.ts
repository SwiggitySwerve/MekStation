/** Characterize the existing composition contract before moving mounted rules. */
import type { IEquipmentItem } from '@/types/equipment';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { createDefaultVehicleState } from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory as C } from '@/types/equipment/EquipmentCategory';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { computeVehicleWeightBreakdown } from '../weightComposition';

const item = (
  id: string,
  weight: number,
  category: C,
  special?: readonly string[],
): IEquipmentItem => ({
  id,
  name: id,
  weight,
  category,
  special,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 3025,
  criticalSlots: 1,
  costCBills: 0,
  battleValue: 0,
});
const catalog: Partial<Record<string, IEquipmentItem>> = {
  laser: item('laser', 2.5, C.ENERGY_WEAPON),
  ammo: item('ammo', 1, C.AMMUNITION),
  secondary: item('secondary', 3, C.BALLISTIC_WEAPON),
  'secondary-ammo': item('secondary-ammo', 0.5, C.AMMUNITION),
  'body-energy': item('body-energy', 4, C.ENERGY_WEAPON),
  chemical: item('chemical', 0.1, C.ENERGY_WEAPON, ['Requires ammo']),
  zero: item('zero', 0, C.ENERGY_WEAPON),
  missing: item('resolved zero-mass placeholder', 0, C.ENERGY_WEAPON),
};
const mount = (
  equipmentId: string,
  location: VehicleLocation,
  isTurretMounted: boolean,
): IVehicleMountedEquipment => ({
  id: `${equipmentId}-${location}`,
  equipmentId,
  name: equipmentId,
  location,
  isTurretMounted,
  isRearMounted: false,
  isSponsonMounted: false,
});
const equipment = [
  mount('laser', VehicleLocation.TURRET, true),
  mount('ammo', VehicleLocation.TURRET, true),
  mount('secondary', VehicleLocation.TURRET_2, false),
  mount('secondary-ammo', VehicleLocation.TURRET_2, true),
  mount('body-energy', VehicleLocation.BODY, true),
  mount('chemical', VehicleLocation.FRONT, false),
  mount('missing', VehicleLocation.TURRET, true),
  mount('zero', VehicleLocation.REAR, false),
];
const base = {
  ...createDefaultVehicleState({
    name: 'Mounted characterization',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  }),
  engineType: EngineType.ICE,
  powerAmpWeight: 0,
};
const turret = { type: TurretType.SINGLE, currentWeight: 0, rotationArc: 360 };

it('keeps mount flags, secondary location, ammunition and amplifier eligibility distinct', () => {
  const calls: string[] = [];
  const result = computeVehicleWeightBreakdown(
    { ...base, equipment, turret, secondaryTurret: turret },
    (id) => {
      calls.push(id);
      return catalog[id];
    },
  );
  expect(calls).toEqual([
    'laser',
    'ammo',
    'secondary',
    'secondary-ammo',
    'body-energy',
    'chemical',
    'missing',
    'zero',
  ]);
  expect(result).toMatchObject({
    turretEquipment: 6.5,
    secondaryTurretEquipment: 3,
    turretMounted: 7.5,
    energyWeapons: 6.5,
    turret: 1,
    secondaryTurret: 0.5,
    powerAmplifiers: 1,
  });
  expect(result.equipment).toBeCloseTo(11.1, 12);
  const empty = computeVehicleWeightBreakdown(
    { ...base, equipment: [], turret, secondaryTurret: turret },
    () => undefined,
  );
  if (empty.remaining === null)
    throw new Error('resolved characterization budget unavailable');
  expect(result.remaining).toBeCloseTo(empty.remaining - 13.6, 12);
});

it('groups equipment even when neither turret is installed, without charging mechanisms', () => {
  const result = computeVehicleWeightBreakdown(
    { ...base, equipment, turret: null, secondaryTurret: null },
    (id) => catalog[id],
  );
  expect(result).toMatchObject({
    turretEquipment: 6.5,
    secondaryTurretEquipment: 3,
    turretMounted: 7.5,
    turret: 0,
    secondaryTurret: 0,
    energyWeapons: 6.5,
    powerAmplifiers: 1,
  });
});

it('keeps unresolved equipment unknown despite a declared amplifier floor', () => {
  expect(
    computeVehicleWeightBreakdown(
      {
        ...base,
        equipment,
        turret,
        secondaryTurret: turret,
        powerAmpWeight: 2,
      },
      () => undefined,
    ),
  ).toMatchObject({
    equipment: null,
    turretEquipment: null,
    secondaryTurretEquipment: null,
    turretMounted: null,
    energyWeapons: null,
    turret: null,
    secondaryTurret: null,
    powerAmplifiers: null,
    remaining: null,
    isComplete: false,
  });
});

it('counts ammunition in equipment and mounted mass, but never mechanism or amplifier mass', () => {
  expect(
    computeVehicleWeightBreakdown(
      {
        ...base,
        equipment: [equipment[1], equipment[3]],
        turret,
        secondaryTurret: turret,
      },
      (id) => catalog[id],
    ),
  ).toMatchObject({
    equipment: 1.5,
    turretEquipment: 0,
    secondaryTurretEquipment: 0,
    turretMounted: 1,
    energyWeapons: 0,
    turret: 0,
    secondaryTurret: 0,
    powerAmplifiers: 0,
  });
});

it('resolves duplicate equipment IDs once per mount in original order', () => {
  const resolve = jest.fn((id: string) => catalog[id]);
  const result = computeVehicleWeightBreakdown(
    {
      ...base,
      equipment: [equipment[0], mount('laser', VehicleLocation.FRONT, false)],
      turret,
    },
    resolve,
  );
  expect(resolve.mock.calls).toEqual([['laser'], ['laser']]);
  expect(result).toMatchObject({
    equipment: 5,
    energyWeapons: 5,
    turretEquipment: 2.5,
    turretMounted: 2.5,
    turret: 0.5,
    powerAmplifiers: 0.5,
  });
});
