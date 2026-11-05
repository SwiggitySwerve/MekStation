/** Characterize the existing composition contract before moving mounted rules. */
import type { IEquipmentItem } from '@/types/equipment';
import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createVehicleStore } from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory as C } from '@/types/equipment/EquipmentCategory';
import { Era } from '@/types/temporal/Era';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

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
  heat: 0, // These fixtures isolate mounted mass from the heat-neutral sink term.
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
const turret = { type: TurretType.SINGLE, rotationArc: 360 };

// TestEntity.java:1995-2003 at 48fcb2f6: charge non-quarters carrying space.
it('retains carrying space through canonical save, reopen and store persistence', () => {
  const identity = {
    id: 'payload-roundtrip',
    chassis: 'Payload',
    variant: 'Test',
    era: Era.DARK_AGE,
  };
  const saved = serializeCustomVehicleState(
    { ...base, equipment: [] },
    identity,
  );
  const transporters = [
    'troopspace:3.0',
    'cargobay:2.0:0:1',
    'crewquarters:7.0:0:2',
  ];
  const loaded = mapToVehicleState({ ...saved, transporters });
  expect(loaded).toMatchObject({ transporters });
  const weights = computeVehicleWeightBreakdown(loaded, () => undefined);
  expect(weights).toMatchObject({ carryingSpace: 5, isComplete: true });
  const empty = computeVehicleWeightBreakdown(
    { ...loaded, transporters: [] },
    () => undefined,
  );
  expect(weights.remaining).toBe(empty.remaining! - 5);
  const resaved = serializeCustomVehicleState(loaded, identity);
  expect(resaved.transporters).toEqual(transporters);
  expect(mapToVehicleState(resaved)).toMatchObject({ transporters });
  const store = createVehicleStore(loaded);
  store.setState({ transporters: [...transporters] });
  expect(
    JSON.parse(localStorage.getItem(`megamek-vehicle-${loaded.id}`)!),
  ).toMatchObject({ state: { transporters } });
});

it('keeps unrepresented transporter mass unavailable', () => {
  expect(
    computeVehicleWeightBreakdown(
      { ...base, transporters: ['unrepresentedbay:2.0'] },
      () => undefined,
    ),
  ).toMatchObject({
    carryingSpace: null,
    remaining: null,
    isComplete: false,
  });
});

// MegaMek 48fcb2f6 MiscType.java:614-616,12532-12543;
// WeaponType.java:2925-2926: direct fire except tasers, plus RISC modules.
it.each([
  [TechBase.INNER_SPHERE, 'targeting-computer-is', 4],
  [TechBase.CLAN, 'targeting-computer-clan', 3],
])(
  'charges %s targeting-computer mass before turret mechanism mass',
  (techBase, formula, tons) => {
    const items: Partial<Record<string, IEquipmentItem>> = {
      'large-laser': item('large-laser', 5, C.ENERGY_WEAPON),
      ppc: item('ppc', 7, C.ENERGY_WEAPON),
      risclaserpulsemodule: item('risclaserpulsemodule', 1, C.MISC_EQUIPMENT),
      tag: item('tag', 1, C.ENERGY_WEAPON),
      'lrm-20': item('lrm-20', 10, C.MISSILE_WEAPON),
      'mek-taser': item('mek-taser', 4, C.ENERGY_WEAPON),
      ammo: item('ammo', 1, C.AMMUNITION),
      'machine-gun': item('machine-gun', 0.5, C.BALLISTIC_WEAPON),
      'targeting-computer': {
        ...item('targeting-computer', 0, C.MISC_EQUIPMENT),
        techBase,
        variableEquipmentId: formula,
      },
    };
    const equipment = Object.keys(items).map((id) =>
      mount(
        id,
        id === 'ppc' || id === 'targeting-computer'
          ? VehicleLocation.TURRET
          : VehicleLocation.FRONT,
        id === 'ppc' || id === 'targeting-computer',
      ),
    );
    expect(
      computeVehicleWeightBreakdown(
        { ...base, equipment, turret },
        (id) => items[id],
      ),
    ).toMatchObject({
      equipment: 29.5 + tons,
      turretEquipment: 7 + tons,
      turret: techBase === TechBase.CLAN ? 1 : 1.5,
    });
  },
);

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
