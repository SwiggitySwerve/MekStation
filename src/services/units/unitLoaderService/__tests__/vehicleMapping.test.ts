import * as fs from 'fs';
import * as path from 'path';

import type { VehicleStore } from '@/stores/vehicleState';

import { exportVehicle } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';
import { createVehicleStore } from '@/stores/useVehicleStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { VehicleOnlyEngineType } from '@/types/construction/EngineType';
import { Era } from '@/types/temporal/Era';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeVehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { createVehicleSession } from '../createVehicleSession';
import { loadUnitDefinition } from '../loadUnitDefinition';
import {
  mapToVehicleState,
  normalizeVehicleConfiguration,
  UnsupportedVehicleConfigurationError,
} from '../vehicleMapping';
import fixtures from './fixtures/vehicles.pinned.json';

const supported = fixtures.rows;

it.each(supported)(
  'maps pinned $kind into the existing vehicle store',
  (row) => {
    const state = mapToVehicleState(row.definition);
    const store = createVehicleStore(state);
    expect(store.getState()).toMatchObject({
      chassis: row.definition.chassis,
      model: row.definition.model,
      tonnage: row.definition.tonnage,
      year: row.definition.year,
      motionType: row.definition.motionType,
      engineRating: row.definition.engine.rating,
      cruiseMP: row.definition.movement.cruiseMP,
      flankMP: row.definition.movement.flankMP,
      isTrailer: row.definition.isTrailer ?? false,
      isModified: false,
    });
    expect(store.getState().equipment).toHaveLength(
      row.definition.equipment.length,
    );
    const parsed = new BlkParserService().parse(row.content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const doc = parsed.data.document;
    const result =
      doc.mappedUnitType === UnitType.SUPPORT_VEHICLE
        ? new SupportVehicleUnitHandler().parse(doc)
        : doc.mappedUnitType === UnitType.VTOL
          ? new VTOLUnitHandler().parse(doc)
          : new VehicleUnitHandler().parse(doc);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    const unit = result.data.unit;
    expect(state.weightClass).toBe(unit.weightClass);
    expect(state.motionType).toBe(unit.motionType);
    expect(state.cruiseMP).toBe(unit.movement.cruiseMP);
    expect(state.flankMP).toBe(unit.movement.flankMP);
    for (const [location, points] of Object.entries(unit.armorByLocation)) {
      expect(state.armorAllocation[location] ?? 0).toBe(points);
    }
  },
);

it.each([
  ['Tank', TurretType.SINGLE, false],
  ['SuperHeavy', TurretType.SINGLE, false],
  ['dual turret', TurretType.DUAL, true],
  ['VTOL chin', TurretType.CHIN, false],
  ['SupportTank', undefined, false],
  ['trailer', undefined, false],
] as const)('preserves %s turret configuration', (kind, type, secondary) => {
  const row = fixtures.rows.find((row) => row.kind === kind)!;
  const state = mapToVehicleState(row.definition);
  expect(state.turret?.type).toBe(type);
  expect(state.secondaryTurret !== null).toBe(secondary);
  // No turret capacity cap to compare: owner ruling 5, removed in #2479.
});

it.each([
  // MegaMek 48fcb2f6 getWeightEngine from the UL-16 coord-r3 oracle.
  ['NONE', VehicleOnlyEngineType.NONE, 8, 0],
  ['STEAM', VehicleOnlyEngineType.STEAM, 10, 0.28],
] as const)(
  'maps pinned %s engines with Java weight, rating and BLK code',
  (kind, engineType, code, javaEngineTons) => {
    const row = fixtures.rows.find((row) => row.kind === kind)!;
    const state = mapToVehicleState(row.definition);
    expect(state.engineType).toBe(engineType);
    expect(state.engineTechRating).toBe(row.definition.engineTechRating);
    expect(computeVehicleWeightBreakdown(state, () => undefined).engine).toBe(
      javaEngineTons,
    );
    const store = createVehicleStore(state);
    for (const edit of [
      () => store.getState().setCruiseMP(state.cruiseMP),
      () => store.getState().setMotionType(state.motionType),
      // setTonnage still clamps every support rating to 10 or more.
      () => kind === 'NONE' && store.getState().setTonnage(state.tonnage),
    ]) {
      edit();
      expect(store.getState().engineRating).toBe(row.definition.engine.rating);
    }
    // createVehicleStore wraps persist but returns a plain StoreApi type.
    const { persist } = store as typeof store & {
      persist: {
        getOptions: () => {
          partialize: (state: VehicleStore) => Partial<VehicleStore>;
        };
      };
    };
    expect(
      persist.getOptions().partialize(store.getState()).engineTechRating,
    ).toBe(row.definition.engineTechRating);
    expect(exportVehicle(state).content).toContain(
      `<engine_type>\n${code}\n</engine_type>`,
    );
  },
);

it('falls back from engine to structural tech rating (Entity.java:17870-17875)', () => {
  const { engineTechRating: _omitted, ...definition } = fixtures.rows.find(
    (row) => row.kind === 'STEAM',
  )!.definition;
  expect(
    mapToVehicleState({ ...definition, structuralTechRating: 2 })
      .engineTechRating,
  ).toBe(2);
});

it('keeps explicit engine technology independent of chassis technology', () => {
  const source = supported[0].definition;
  const innerSphere = mapToVehicleState({
    ...source,
    techBase: 'CLAN',
    clanEngine: false,
    engine: { type: 'XL' },
  });
  const clan = mapToVehicleState({
    ...source,
    techBase: 'INNER_SPHERE',
    clanEngine: true,
    engine: { type: 'XL' },
  });
  expect(innerSphere.engineType).toBe('XL Engine (IS)');
  expect(clan.engineType).toBe('XL Engine (Clan)');
  expect(
    mapToVehicleState({ ...source, engine: { type: 'BATTERY' } }).engineType,
  ).toBe(VehicleOnlyEngineType.BATTERY);
  expect(() =>
    mapToVehicleState({ ...source, engine: { type: 'FLYWHEEL' } }),
  ).toThrow(UnsupportedVehicleConfigurationError);
});

it('uses zero armor entries as turret presence and preserves a chin arc without equipment', () => {
  const source = supported.find((row) => row.kind === 'VTOL chin')!.definition;
  const state = mapToVehicleState({
    ...source,
    equipment: [],
    armor: {
      ...source.armor,
      byLocation: { ...source.armor.byLocation, TURRET: 0 },
    },
  });
  expect(state.turret).toMatchObject({
    type: TurretType.CHIN,
    rotationArc: 180,
  });
  expect(state.armorAllocation.Turret).toBe(0);
});

it('creates independent clean sessions from a validated vehicle definition', async () => {
  const row = supported[0];
  const loaded = await loadUnitDefinition(
    { read: async () => row.definition },
    { family: 'vehicles', source: 'canonical', id: row.definition.id },
  );
  if (!loaded.success) throw new Error(loaded.error);
  const configuration = normalizeVehicleConfiguration(loaded.definition);
  expect(configuration).toEqual(
    normalizeVehicleConfiguration(loaded.definition),
  );
  expect(configuration).not.toHaveProperty('id');
  expect(configuration).not.toHaveProperty('createdAt');
  expect(configuration).toMatchObject({
    armorTonnage: 3,
    mulId: String(row.definition.mulId ?? -1),
  });
  const one = createVehicleSession(configuration, { id: 'one', createdAt: 10 });
  const two = createVehicleSession(configuration, { id: 'two', createdAt: 20 });
  expect(one).toMatchObject({
    id: 'one',
    createdAt: 10,
    lastModifiedAt: 10,
    isModified: false,
  });
  one.armorAllocation.Front = 999;
  expect(two.armorAllocation.Front).toBe(row.definition.armor.byLocation.FRONT);
  expect(one.turret).not.toBe(two.turret);
  expect(mapToVehicleState(row.definition).id).not.toBe(
    mapToVehicleState(row.definition).id,
  );
});

it.each([
  // TestSupportVehicle BAR weight per point (ArmorType.java:1840-2100): BAR 8
  // tech F is 0.042 t, tech E 0.045 t; small support (< 5 t) rounds to a
  // kilogram, others to a half ton.
  ['SupportTank', 0.168],
  ['LargeSupportTank', 13.5],
])('weighs %s BAR armor by its armor tech rating', (kind, tons) => {
  const row = supported.find((candidate) => candidate.kind === kind)!;
  expect(normalizeVehicleConfiguration(row.definition).armorTonnage).toBe(tons);
});

it('derives missing engine rating and ignores a stale flank value through the movement owner', () => {
  const row = supported[0];
  expect(
    mapToVehicleState({
      ...row.definition,
      engine: { type: 'FUSION' },
      movement: { cruiseMP: 12, flankMP: 0 },
    }),
  ).toMatchObject({ engineRating: 155, cruiseMP: 12, flankMP: 18 });
});

it('rejects another family, missing movement, and unknown armor locations', () => {
  const source = supported[0].definition;
  for (const invalid of [
    { ...source, unitType: 'Aerospace' },
    { ...source, movement: {} },
    { ...source, armor: { type: 'STANDARD', byLocation: { MADE_UP: 1 } } },
  ])
    expect(() => mapToVehicleState(invalid)).toThrow();
});

// MegaMek 48fcb2f6 getWeightArmor from the UL-16 coord-r3 oracle. Points per
// ton are 16 x pptMultiplier (ArmorType.java:301-303): Ferro-Lamellor 0.875
// (ArmorType.java:1043), Ballistic-Reinforced 0.75 (ArmorType.java:1163).
const JAVA_ARMOR_TONS: Readonly<Record<string, [ArmorTypeEnum, number]>> = {
  'aithon-assault-transport': [ArmorTypeEnum.FERRO_LAMELLOR, 12.5],
  'chalchiuhtotolin-support-tank-xl': [ArmorTypeEnum.FERRO_LAMELLOR, 9],
  'eurus-mbt-a': [ArmorTypeEnum.FERRO_LAMELLOR, 11.5],
  'eurus-mbt-b': [ArmorTypeEnum.FERRO_LAMELLOR, 11.5],
  'eurus-mbt-c': [ArmorTypeEnum.FERRO_LAMELLOR, 11.5],
  'eurus-mbt-d': [ArmorTypeEnum.FERRO_LAMELLOR, 11.5],
  'eurus-mbt-prime': [ArmorTypeEnum.FERRO_LAMELLOR, 11.5],
  'gurzil-support-tank': [ArmorTypeEnum.FERRO_LAMELLOR, 12.5],
  'behemoth-heavy-tank-kurita-upgrade': [
    ArmorTypeEnum.BALLISTIC_REINFORCED,
    17,
  ],
  'demolisher-heavy-tank-reinforced': [
    ArmorTypeEnum.BALLISTIC_REINFORCED,
    15.5,
  ],
  'sm-tank-destroyer-sm1b': [ArmorTypeEnum.BALLISTIC_REINFORCED, 8],
  'sm5-field-commander-prime': [ArmorTypeEnum.BALLISTIC_REINFORCED, 8],
};

it('maps every committed Ferro-Lamellor and Ballistic-Reinforced vehicle with Java armor weight', () => {
  const directory = path.join(process.cwd(), 'public/data/units/vehicles');
  const index = JSON.parse(
    fs.readFileSync(path.join(directory, 'index.json'), 'utf8'),
  ) as { units: { id: string; path: string }[] };
  const mapped: Record<string, [ArmorTypeEnum, number]> = {};
  for (const row of index.units) {
    const definition = JSON.parse(
      fs.readFileSync(path.join(directory, row.path), 'utf8'),
    );
    if (
      ['FERRO_LAMELLOR', 'BALLISTIC_REINFORCED'].includes(
        definition.armor?.type,
      )
    ) {
      const state = normalizeVehicleConfiguration(definition);
      mapped[row.id] = [state.armorType, state.armorTonnage];
    }
  }
  expect(mapped).toEqual(JAVA_ARMOR_TONS);
});

it.each([
  [
    'armor',
    { armor: { type: 'HEAVY_INDUSTRIAL', byLocation: { FRONT: 1 } } },
    'The vehicle editor cannot open vehicles with heavy industrial armor yet.',
  ],
  [
    'motion',
    { motionType: 'Aerodyne' },
    'The vehicle editor cannot open vehicles with aerodyne motion yet.',
  ],
  [
    'engine',
    { engine: { type: 'FLYWHEEL', rating: 100 } },
    'The vehicle editor cannot open vehicles with flywheel engines yet.',
  ],
  [
    'unit type',
    { unitType: 'Aerospace' },
    'The vehicle editor cannot open Aerospace units.',
  ],
] as const)(
  'explains an unsupported %s in plain words',
  (_label, change, message) => {
    const error = (() => {
      try {
        mapToVehicleState({ ...supported[0].definition, ...change });
      } catch (caught) {
        return caught;
      }
    })();
    expect(error).toBeInstanceOf(UnsupportedVehicleConfigurationError);
    expect((error as Error).message).toBe(message);
  },
);

it('maps independent normalized Omni allowances without changing installed geometry', () => {
  const row = fixtures.rows.find((entry) => entry.kind === 'dual turret');
  if (!row) throw new Error('missing pinned dual-turret fixture');
  const state = mapToVehicleState({
    ...row.definition,
    isOmni: true,
    baseChassisTurretWeight: 0.5,
    baseChassisTurret2Weight: 0,
  });
  expect(state).toMatchObject({
    isOmni: true,
    baseChassisTurretWeight: 0.5,
    baseChassisSecondaryTurretWeight: 0,
  });
  expect(state.turret?.type).toBe(TurretType.DUAL);
  expect(state.secondaryTurret).not.toBeNull();
});

it('does not materialize a normalized VTOL secondary allowance', () => {
  const row = fixtures.rows.find((entry) => entry.kind === 'VTOL chin');
  if (!row) throw new Error('missing pinned VTOL fixture');
  const state = mapToVehicleState({
    ...row.definition,
    isOmni: true,
    baseChassisTurretWeight: 0,
    baseChassisTurret2Weight: 5,
  });
  expect(state).toMatchObject({
    isOmni: true,
    baseChassisTurretWeight: 0,
    baseChassisSecondaryTurretWeight: undefined,
    secondaryTurret: null,
  });
});

it.each([
  [0.5, 0],
  [0, 0.5],
] as const)(
  'preserves independent allowances %s / %s through library serialization and JSON reopen',
  (primary, secondary) => {
    const row = fixtures.rows.find((entry) => entry.kind === 'dual turret');
    if (!row) throw new Error('missing pinned dual-turret fixture');
    const state = mapToVehicleState({
      ...row.definition,
      isOmni: true,
      baseChassisTurretWeight: primary,
      baseChassisTurret2Weight: secondary,
    });
    const saved = serializeCustomVehicleState(state, {
      id: 'omni-context-roundtrip',
      chassis: state.chassis,
      variant: state.model,
      era: Era.DARK_AGE,
    });
    expect(saved).toMatchObject({
      isOmni: true,
      baseChassisTurretWeight: primary,
      baseChassisTurret2Weight: secondary,
    });
    const decoded: unknown = JSON.parse(JSON.stringify(saved));
    expect(mapToVehicleState(decoded)).toMatchObject({
      isOmni: true,
      baseChassisTurretWeight: primary,
      baseChassisSecondaryTurretWeight: secondary,
    });
  },
);
