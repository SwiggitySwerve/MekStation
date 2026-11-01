import { BlkParserService } from '@/services/conversion/BlkParserService';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';
import { createVehicleStore } from '@/stores/useVehicleStore';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { createVehicleSession } from '../createVehicleSession';
import { loadUnitDefinition } from '../loadUnitDefinition';
import { UnsupportedUnitConfigurationError } from '../movementConfiguration';
import {
  mapToVehicleState,
  normalizeVehicleConfiguration,
  UnsupportedVehicleConfigurationError,
} from '../vehicleMapping';
import fixtures from './fixtures/vehicles.pinned.json';

const supported = fixtures.rows.filter(
  (row) => !['NONE', 'STEAM'].includes(row.kind),
);

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
      equipment: [],
      isModified: false,
    });
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
  if (state.turret) {
    const reference = createVehicleStore({ ...state, turret: null });
    reference.getState().setTurretType(type!);
    expect(state.turret.maxWeight).toBe(reference.getState().turret?.maxWeight);
  }
});

it.each(['NONE', 'STEAM'])(
  'rejects %s with a typed configuration error',
  (kind) => {
    const row = fixtures.rows.find((row) => row.kind === kind)!;
    expect(() => mapToVehicleState(row.definition)).toThrow(
      UnsupportedUnitConfigurationError,
    );
    try {
      mapToVehicleState(row.definition);
      throw new Error('Expected unsupported engine');
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedVehicleConfigurationError);
      expect(error).toMatchObject({
        code: 'unsupported-configuration',
        field: 'engine.type',
        value: kind,
      });
    }
  },
);

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
  expect(() =>
    mapToVehicleState({ ...source, engine: { type: 'BATTERY' } }),
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
