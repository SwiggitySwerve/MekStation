import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IEquipmentItem } from '@/types/equipment';

import { computeVehicleWeightBreakdown as facade } from '@/components/customizer/vehicle/VehicleStatusBar.utils';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import vehicleSources from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createVehicleStore } from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import {
  computeSupportVehicleWeight,
  computeSupportStructureWeight,
  ceilSupportWeight,
} from '../supportWeight';
import {
  computeVehicleWeightBreakdown,
  type VehicleWeightState,
} from '../weightComposition';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

// TestEntity.java:1995-2003; InsulatedCargoBay.java:66-67,109-110 at 48fcb2f6.
it.each([
  'Coolant Truck (Hover)',
  'Coolant Truck (Tracked)',
  'Coolant Truck 135-K',
])('%s charges its native insulated cargo (Java 30 t)', async (name) => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
  const state = mapToVehicleState(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/vehicles', `${name}.json`),
        'utf8',
      ),
    ),
  );
  expect(
    computeVehicleWeightBreakdown(state, (id) =>
      getEquipmentLookupService().getById(id),
    ),
  ).toMatchObject({ remaining: 0, isComplete: true });
});

it('keeps carrying-space source facts through save, reopen and persistence', () => {
  const identity = {
    id: 'carrying-roundtrip',
    chassis: 'Carrying',
    variant: 'Test',
    era: Era.DARK_AGE,
  };
  const state = createDefaultVehicleState({
    name: 'Carrying Test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const saved = serializeCustomVehicleState(state, identity);
  const transporters = [
    'troopspace:3.0',
    'cargobay:2.0:0:1',
    'crewquarters:7.0:0:2',
  ];
  const loaded = mapToVehicleState({ ...saved, transporters });
  expect(loaded).toMatchObject({ transporters });
  const weights = computeVehicleWeightBreakdown(loaded, () => undefined);
  expect(weights).toMatchObject({ carryingSpace: 5, isComplete: true });
  const resaved = serializeCustomVehicleState(loaded, identity);
  expect(resaved.transporters).toEqual(transporters);
  expect(mapToVehicleState(resaved)).toMatchObject({ transporters });
  const store = createVehicleStore(loaded);
  store.setState({ transporters: [...transporters] });
  expect(
    JSON.parse(localStorage.getItem(`megamek-vehicle-${loaded.id}`)!),
  ).toMatchObject({ state: { transporters } });
});

it('keeps unsupported carrying-space mass unavailable', () => {
  expect(
    computeVehicleWeightBreakdown(
      {
        ...createDefaultVehicleState({
          name: 'Unknown bay',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        }),
        transporters: ['unsupportedbay:2.0'],
      },
      () => undefined,
    ),
  ).toMatchObject({ carryingSpace: null, remaining: null, isComplete: false });
});

it('preserves the facade and every support composition output', () => {
  const state: VehicleWeightState = {
    ...createDefaultVehicleState({
      name: 'Characterization',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    unitType: UnitType.SUPPORT_VEHICLE,
    engineRating: 25,
    armorTonnage: 0,
    turret: null,
  };
  const result = computeVehicleWeightBreakdown(state, () => undefined);
  expect(facade(state, () => undefined)).toEqual(result);
  // Every support engine goes through Engine.getWeightEngine's support branch
  // (Engine.java:396-404): tracked medium 0.013 x (4 + 4^2) x D multiplier 1 x
  // 50 t = 13 t. The rating field (25) plays no part.
  expect(result).toEqual({
    engine: 13,
    controls: 0,
    lift: 0,
    structure: 7.5,
    armor: 0,
    equipment: 0,
    turret: 0,
    secondaryTurret: 0,
    powerAmplifiers: 0,
    heatSinks: 0,
    turretEquipment: 0,
    secondaryTurretEquipment: 0,
    turretMounted: 0,
    energyWeapons: 0,
    remaining: 29.5,
    secondaryTurretMounted: 0,
    primaryAllowanceOverloaded: false,
    secondaryAllowanceOverloaded: false,
    unresolvedMountIds: [],
    issues: [],
    isComplete: true,
  });
});

// Test-first controls/lift acceptance: these fields are absent on the refactor head.

const base = createDefaultVehicleState({
  name: 'Controls/lift',
  tonnage: 20,
  techBase: TechBase.INNER_SPHERE,
});
const weights = (
  tonnage: number,
  motionType = M.TRACKED,
  hasNoControlSystems = false,
  unitType: VehicleWeightState['unitType'] = UnitType.VEHICLE,
) =>
  computeVehicleWeightBreakdown(
    { ...base, tonnage, motionType, hasNoControlSystems, unitType },
    () => undefined,
  );

it.each([
  [10, 0.5],
  [10.01, 1],
  [20, 1],
  [20.1, 1.5],
  [30, 1.5],
  [30.01, 2],
])('rounds %s-ton controls upward to %s', (tons, controls) => {
  expect(weights(tons)).toMatchObject({ controls, lift: 0 });
});
it.each([M.HOVER, M.VTOL, M.HYDROFOIL, M.SUBMARINE, M.WIGE])(
  '%s carries half-ton-rounded lift',
  (mode) => {
    expect(weights(20, mode)).toMatchObject({ controls: 1, lift: 2 });
    expect(weights(20.1, mode)).toMatchObject({ controls: 1.5, lift: 2.5 });
  },
);
it.each([M.TRACKED, M.WHEELED, M.NAVAL, M.RAIL, M.MAGLEV])(
  '%s carries no lift',
  (mode) => {
    expect(weights(20, mode)).toMatchObject({ controls: 1, lift: 0 });
  },
);
it('honors explicit no-controls without removing lift', () => {
  expect(weights(20, M.HOVER, true)).toMatchObject({ controls: 0, lift: 2 });
});
it('keeps support calculations outside combat controls/lift', () => {
  expect(weights(20, M.HOVER, false, UnitType.SUPPORT_VEHICLE)).toMatchObject({
    controls: 0,
    lift: 0,
  });
});

it.each(['0', '1', 'false'])(
  'accepts upstream no-controls presence despite BLK payload %s',
  (payload) => {
    const parsed = new BlkParserService().parse(
      `<UnitType>\nTank\n</UnitType>\n<Name>\nNo-controls\n</Name>\n<tonnage>\n20\n</tonnage>\n<year>\n3039\n</year>\n<hasNoControlSystems>\n${payload}\n</hasNoControlSystems>`,
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success)
      throw new Error('BLK presence fixture failed to parse');
    // Explicit adapter for the test: production tag-to-store wiring remains separate.
    const noControls = Object.hasOwn(
      parsed.data.document.rawTags,
      'hasNoControlSystems',
    );
    expect(noControls).toBe(true);
    expect(
      weights(parsed.data.document.tonnage, M.TRACKED, noControls),
    ).toMatchObject({ controls: 0, lift: 0 });
  },
);

// Spec scenario "Separate turrets round independently": each turret is 10% of
// its own equipment, rounded up to the half ton before the two are summed.
it('rounds the two turrets independently when composing weight', () => {
  const mount = (id: string, location: VehicleLocation) => ({
    id,
    equipmentId: id,
    name: id,
    location,
    isRearMounted: false,
    isTurretMounted: true,
    isSponsonMounted: false,
  });
  const turretConfig = {
    type: TurretType.SINGLE,
    maxWeight: 5,

    rotationArc: 360,
  };
  const result = computeVehicleWeightBreakdown(
    {
      ...base,
      tonnage: 50,
      turret: turretConfig,
      secondaryTurret: turretConfig,
      equipment: [
        mount('primary-gun', VehicleLocation.TURRET),
        mount('secondary-gun', VehicleLocation.TURRET_2),
      ],
    },
    () => ({ weight: 2.5 }) as IEquipmentItem,
  );
  // 0.25 t each rounds to 0.5 t each (1 t total); summing first would give 0.5 t.
  expect(result).toMatchObject({
    turretEquipment: 2.5,
    secondaryTurretEquipment: 2.5,
    turret: 0.5,
    secondaryTurret: 0.5,
  });
});

const supportSources = [
  {
    path: 'vehicles/3075 Support tanks/Dromedary Water Transport.blk',
    sha256: 'b05b8852e242a08b8e6c0cfa70bf4943ea41f695b834197881693952c3bb7a79',
    content:
      '<UnitType>\nLargeSupportTank\n</UnitType>\n\n<Name>\nDromedary Water Transport\n</Name>\n\n<Model>\n\n</Model>\n\n<year>\n2562\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<motion_type>\nWheeled\n</motion_type>\n\n<cruiseMP>\n2\n</cruiseMP>\n\n<engine_type>\n1\n</engine_type>\n\n<armor_type>\n46\n</armor_type>\n\n<armor_tech_rating>\n2\n</armor_tech_rating>\n\n<armor>\n15\n15\n15\n15\n15\n15\n10\n</armor>\n\n<Body Equipment>\nIS Machine Gun Ammo - Half\nISSVDuneBuggyChassis\n</Body Equipment>\n\n<Front Equipment>\n</Front Equipment>\n\n<Front Right Equipment>\n</Front Right Equipment>\n\n<Front Left Equipment>\n</Front Left Equipment>\n\n<Rear Right Equipment>\n</Rear Right Equipment>\n\n<Rear Left Equipment>\n</Rear Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<Turret Equipment>\nMachine Gun\n</Turret Equipment>\n\n<barrating>\n5\n</barrating>\n\n<structural_tech_rating>\n2\n</structural_tech_rating>\n\n<engine_tech_rating>\n2\n</engine_tech_rating>\n\n<tonnage>\n150.0\n</tonnage>\n\n<fuel>\n7.5\n</fuel>\n<transporters>\ncargobay:4.0:1:1::-1:0\nLiquidCargoBay:45.5:1:2::-1:0\n</transporters>',
    structure: 47.0,
    engine: 36.0,
    armor: 4.0,
    fuel: 7.5,
    subtotal: 150,
  },
  {
    path: 'vehicles/AToW Companion/Naval/Small Steamer.blk',
    sha256: 'cfe001a95c9166ad26f788371589a743c6f2b0c2f1175da85daa02ff8721f62c',
    content:
      '<UnitType>\nSupportTank\n</UnitType>\n\n<Name>\nSmall Steamer\n</Name>\n\n<Model>\n\n</Model>\n\n<year>\n2100\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<motion_type>\nNaval\n</motion_type>\n\n<cruiseMP>\n2\n</cruiseMP>\n\n<engine_type>\n10\n</engine_type>\n\n<armor_type>\n43\n</armor_type>\n\n<armor_tech_rating>\n1\n</armor_tech_rating>\n\n<armor>\n1\n1\n1\n1\n</armor>\n\n<Body Equipment>\n</Body Equipment>\n\n<Front Equipment>\n</Front Equipment>\n\n<Right Equipment>\n</Right Equipment>\n\n<Left Equipment>\n</Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<barrating>\n2\n</barrating>\n\n<structural_tech_rating>\n1\n</structural_tech_rating>\n\n<engine_tech_rating>\n1\n</engine_tech_rating>\n\n<tonnage>\n2.5\n</tonnage>\n\n<fuel>\n0.21\n</fuel>\n<transporters>\ncargobay:0.7:1:1::-1:0\nstandardseats:1.0:0:-1::-1:0\npillionseats:21.0:0:-1::-1:0\n</transporters>',
    structure: 0.39,
    engine: 0.28,
    armor: 0.1,
    fuel: 0.21,
    subtotal: 2.28,
  },
  {
    path: 'vehicles/TRO Vehicle Annex/Wheeled/Burro II Super Heavy Cargo Truck.blk',
    sha256: '951e6f7b5c655b9a4c23760ef0baccf89686411fdcfdf3202d816e613f16913d',
    content:
      '<UnitType>\nSupportTank\n</UnitType>\n\n<Name>\nBurro II Super Heavy Cargo Truck\n</Name>\n\n<Model>\n\n</Model>\n\n<year>\n3064\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<motion_type>\nWheeled\n</motion_type>\n\n<cruiseMP>\n3\n</cruiseMP>\n\n<engine_type>\n0\n</engine_type>\n\n<armor_type>\n50\n</armor_type>\n\n<armor_tech_rating>\n4\n</armor_tech_rating>\n\n<armor>\n25\n20\n20\n13\n</armor>\n\n<Body Equipment>\nEnvironmental Sealing\nArmored Chassis\nISOffRoadChassis\n</Body Equipment>\n\n<Front Equipment>\nSearchlight\n</Front Equipment>\n\n<Right Equipment>\n</Right Equipment>\n\n<Left Equipment>\n</Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<barrating>\n9\n</barrating>\n\n<structural_tech_rating>\n4\n</structural_tech_rating>\n\n<engine_tech_rating>\n4\n</engine_tech_rating>\n\n<tonnage>\n50.0\n</tonnage>\n\n<fuel>\n0.0\n</fuel>\n<transporters>\ncargobay:12.5:1:1::-1:0\n</transporters>',
    structure: 29.0,
    engine: 3.5,
    armor: 4.0,
    fuel: 0.0,
    subtotal: 49.5,
  },
  {
    path: 'vehicles/Turning Points/TP Vega 3039/Flatbed Railcar.blk',
    sha256: '9415760f7bd8346e0a571a85244db9c8023391be2ed0316dbd438f42ba02db77',
    content:
      '<UnitType>\nSupportTank\n</UnitType>\n\n<Name>\nFlatbed Railcar\n</Name>\n\n<Model>\n\n</Model>\n\n<year>\n2899\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<motion_type>\nRail\n</motion_type>\n\n<cruiseMP>\n0\n</cruiseMP>\n\n<engine_type>\n8\n</engine_type>\n\n<armor_type>\n44\n</armor_type>\n\n<armor_tech_rating>\n3\n</armor_tech_rating>\n\n<armor>\n16\n16\n16\n16\n</armor>\n\n<Body Equipment>\nSV Chassis Mod [Trailer]\n</Body Equipment>\n\n<Front Equipment>\n</Front Equipment>\n\n<Right Equipment>\n</Right Equipment>\n\n<Left Equipment>\n</Left Equipment>\n\n<Rear Equipment>\n</Rear Equipment>\n\n<barrating>\n3\n</barrating>\n\n<structural_tech_rating>\n3\n</structural_tech_rating>\n\n<engine_tech_rating>\n3\n</engine_tech_rating>\n\n<tonnage>\n120.0\n</tonnage>\n\n<fuel>\n0.0\n</fuel>\n<transporters>\ncargobay:99.0:1:1::-1:0\n</transporters>',
    structure: 19.5,
    engine: 0.0,
    armor: 1.5,
    fuel: 0.0,
    subtotal: 120.0,
  },
];

// Construction excerpts: mm-data 50f7efef, CC BY-NC-SA 4.0.
// Paths and hashes identify the complete pinned sources.
// Expected component values: MegaMek 48fcb2f6 UL-16 weightMethods.
describe('support construction components and represented total', () => {
  const handler = new SupportVehicleUnitHandler();
  it.each(supportSources)(
    '$path uses the pinned chassis, engine, BAR and source fuel',
    (row) => {
      const parsed = new BlkParserService().parse(row.content);
      expect(parsed.success).toBe(true);
      if (!parsed.success) throw new Error('fixture parse');
      const result = handler.parse(parsed.data.document);
      expect(result.success).toBe(true);
      if (!result.success) throw new Error('handler parse');
      expect(computeSupportVehicleWeight(result.data.unit)).toMatchObject({
        structure: row.structure,
        engine: row.engine,
        armor: row.armor,
        fuel: row.fuel,
      });
      expect(handler.calculateWeight(result.data.unit)).toBe(row.subtotal);
      expect(result.data.unit.totalWeight).toBe(row.subtotal);
    },
  );
  it('rejects when the represented components already exceed source tonnage', () => {
    const parsed = new BlkParserService().parse(supportSources[0].content);
    if (!parsed.success) throw new Error('fixture parse');
    const result = handler.parse({ ...parsed.data.document, fuel: 200 });
    if (!result.success) throw new Error('handler parse');
    expect(handler.validate(result.data.unit).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Total weight')]),
    );
  });
});

it.each([
  [M.TRACKED, 2, 0, 0.416],
  [M.WHEELED, 5, 3, 1],
  [M.HOVER, 5, 3, 1.5],
  [M.HOVER, 51, 3, 15.5],
  [M.NAVAL, 301, 3, 51.5],
  [M.VTOL, 31, 3, 9.5],
  [M.WIGE, 81, 3, 14],
  [M.RAIL, 301, 3, 90.5],
  [M.MAGLEV, 301, 3, 90.5],
  [M.HYDROFOIL, 301, 3, 51.5],
  [M.SUBMARINE, 301, 3, 51.5],
])(
  'chassis %s %s t tech %s weighs %s',
  (motionType, tonnage, structuralTechRating, weight) => {
    expect(
      computeSupportStructureWeight({
        tonnage,
        motionType,
        structuralTechRating,
        equipment: [],
      }),
    ).toBe(weight);
  },
);
it('rounds kilograms after removing sub-gram floating point noise', () => {
  expect(ceilSupportWeight(0.98 + Number.EPSILON, 2.5)).toBe(0.98);
  expect(ceilSupportWeight(0.980001, 2.5)).toBe(0.981);
  expect(ceilSupportWeight(0.501, 5)).toBe(1);
});
it.each([
  ['AmphibiousChassisMod', 1.75],
  ['Armored Chassis', 1.5],
  ['BicycleChassisMod', 0.75],
  ['ConvertibleChassisMod', 1.1],
  ['ClanSVDuneBuggyChassis', 1.5],
  ['Environmental Sealing', 2],
  ['ExternalPowerPickupChassisMod', 1.1],
  ['HydroFoilChassisMod', 1.7],
  ['MonocycleChassisMod', 0.5],
  ['ISOffRoadChassis', 1.5],
  ['OmniChassisMod', 1],
  ['PropChassisMod', 1.2],
  ['SnowmobileChassisMod', 1.75],
  ['STOLChassisMod', 1.5],
  ['SubmersibleChassisMod', 1.8],
  ['Tractor', 1.2],
  ['SV Chassis Mod [Trailer]', 0.8],
  ['UltraLightChassisMod', 0.5],
  ['VSTOLChassisMod', 2],
])('applies the pinned %s modifier', (equipmentId, multiplier) => {
  // A 1 t tracked D chassis is 0.13 t before the named modifier.
  expect(
    computeSupportStructureWeight({
      tonnage: 1,
      motionType: M.TRACKED,
      structuralTechRating: 3,
      equipment: [{ equipmentId }],
    }),
  ).toBe(Math.ceil(130 * multiplier) / 1000);
});
it('retains tech F rather than defaulting it to D', () => {
  expect(
    computeSupportStructureWeight({
      tonnage: 1,
      motionType: M.TRACKED,
      structuralTechRating: 5,
      equipment: [],
    }),
  ).toBe(0.086);
});

it('retains structural tech A through mapping and persistence', () => {
  const source = vehicleSources.rows.find((row) => row.kind === 'STEAM')!;
  const state = mapToVehicleState({
    ...source.definition,
    structuralTechRating: 0,
  });
  expect(state.structuralTechRating).toBe(0);
  const store = createVehicleStore(state);
  const { persist } = store as typeof store & {
    persist: {
      getOptions: () => {
        partialize: (value: typeof state) => Partial<typeof state>;
      };
    };
  };
  expect(
    persist.getOptions().partialize(store.getState()).structuralTechRating,
  ).toBe(0);
});

it('rounds the complete represented subtotal after adding fractional source fuel', () => {
  const parsed = new BlkParserService().parse(supportSources[0].content);
  if (!parsed.success) throw new Error('fixture parse');
  const handler = new SupportVehicleUnitHandler();
  const result = handler.parse({ ...parsed.data.document, fuel: 7.5001 });
  if (!result.success) throw new Error('handler parse');
  expect(handler.calculateWeight(result.data.unit)).toBe(150.5);
});
