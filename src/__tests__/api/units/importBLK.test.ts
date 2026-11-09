import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { createHash } from 'node:crypto';

import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import type { UnitFamily } from '@/types/unit/UnitIndex';
import type { IUnitTypeHandler } from '@/types/unit/UnitTypeHandler';

import customHandler from '@/pages/api/units/custom/[id]';
import handler from '@/pages/api/units/import';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import locationFixtures from '@/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { createSupportVehicleHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { createVehicleHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { createVTOLHandler } from '@/services/units/handlers/VTOLUnitHandler';
import vehicleFixtures from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import fixtures from '../../../../scripts/__tests__/fixtures/protomechs.pinned.json';
import { parseImportResponse } from '../../helpers';

async function post(sourceText: unknown) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
  });
  req.body = { sourceFormat: 'blk', sourceText };
  await handler(req, res);
  return res;
}

async function reload<F extends UnitFamily>(family: F, id: string) {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id },
    });
    await customHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    return {
      ok: true,
      json: async () => JSON.parse(res._getData()),
    } as Response;
  });
  try {
    return await loadUnitDefinition(family, id, 'custom');
  } finally {
    global.fetch = originalFetch;
  }
}
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(123456789);
  getSQLiteService({ path: ':memory:' }).initialize();
});
afterEach(() => {
  resetSQLiteService();
  jest.restoreAllMocks();
});

it.each(fixtures)(
  'imports and reloads pinned $path without dropping source or handler facts',
  async (source) => {
    expect(createHash('sha256').update(source.blk).digest('hex')).toBe(
      source.sha256,
    );
    const parsed = new BlkParserService().parse(source.blk);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const expected = createProtoMechHandler().parse(parsed.data.document);
    if (!expected.success) throw new Error(expected.error.errors.join('; '));
    const res = await post(source.blk);
    expect(res._getStatusCode()).toBe(201);
    const id = parseImportResponse(res).data?.unitId;
    if (!id) throw new Error('Expected saved custom identity');
    expect(id).toMatch(/^custom-/);
    const loaded = await reload('protomechs', id);
    expect(loaded).toMatchObject({
      success: true,
      family: 'protomechs',
      reference: { source: 'custom', family: 'protomechs', id, version: 1 },
    });
    if (!loaded.success) throw new Error(loaded.error);
    expect(loaded.definition).toMatchObject({
      id,
      family: 'protomechs',
      unitType: 'ProtoMech',
      armor: { byLocation: expected.data.unit.armorByLocation },
      movement: {
        cruiseMP: expected.data.unit.cruiseMP,
        jumpMP: expected.data.unit.jumpMP,
      },
    });
    expect(
      loaded.definition.equipment?.map(({ id, name, location }) => ({
        id,
        name,
        location,
      })),
    ).toEqual(
      expected.data.unit.equipment.map((mount) => ({
        id: mount.equipmentId,
        name: mount.name,
        location: mount.location,
      })),
    );
    expect(loaded.definition.blkSource).toMatchObject(
      JSON.parse(
        JSON.stringify({
          text: source.blk,
          document: parsed.data.document,
          handlerUnit: expected.data.unit,
        }),
      ),
    );
  },
);

// Raw-byte SHA-256 values independently verified with git show mm-data 50f7efe.
// vehicles.pinned.json's existing hashes normalize CRLF; its content is original.
const vehicleSources = [
  [
    '2750 IS Land/Puma Assault Tank PAT-001.blk',
    'bee0871399a451f95ebb09a16a38c1a0fd68d86e0e48844245761f3056667e57',
    UnitType.VEHICLE,
    'Tracked',
  ],
  [
    '3085u/Cutting Edge/Ranger Armored Fighting Vehicle VV22.blk',
    'c669a3372977bcdb932e62f51d5ef82c5e64df98c33ea5fb51b355f5a27ec178',
    UnitType.VEHICLE,
    'Wheeled',
  ],
  [
    '3075/Tamerlane Strike Sled (Flamer).blk',
    '5ceb9843137d2eadd33866de3484c8f9f9f4570da60e134a2a088c8d4b7f83d3',
    UnitType.VEHICLE,
    'Hover',
  ],
  [
    '3145/Clans/Skadi Swift Attack VTOL.blk',
    'f0dfb188cfcddd624fbdf4a50460a05868b19e07bc832d45d36f1aa680012213',
    UnitType.VTOL,
    'VTOL',
  ],
  [
    'AToW Companion/Naval/Small Steamer.blk',
    'cfe001a95c9166ad26f788371589a743c6f2b0c2f1175da85daa02ff8721f62c',
    UnitType.SUPPORT_VEHICLE,
    'Naval',
  ],
  [
    'AToW Companion/Hover/Boreas Cavalry Hovercraft Prime.blk',
    '9c7a6cce4ed989563faadd8ce15febbaf7c9d15e30f9e14fec6556f8b8f47d33',
    UnitType.SUPPORT_VEHICLE,
    'Hover',
  ],
  [
    '3145/Steiner/Gulltoppr OmniMonitor (A).blk',
    'a2b9d49d48f46d85a8078cdbf00566215ee403a2827417473539e35f7e7d1346',
    UnitType.VEHICLE,
    'Tracked',
  ],
  [
    '3075 Support tanks/HMRV (Hazardous Materials Recovery Vehicle) Oppie O-65.blk',
    '997bcdf57f7e3942358811cec54ca6ce358b2d8623dd3aecf6463ea3704562b4',
    UnitType.SUPPORT_VEHICLE,
    'Tracked',
  ],
] as const;

function vehicleText(path: string): string {
  const text =
    vehicleFixtures.rows.find((row) => row.path === path)?.content ??
    locationFixtures.rows.find(
      (row) => row.path === `data/mekfiles/vehicles/${path}`,
    )?.content;
  if (!text) throw new Error(`Missing committed vehicle fixture: ${path}`);
  return text;
}

function parseExpected<T extends IBaseUnit>(
  document: IBlkDocument,
  handler: IUnitTypeHandler<T>,
) {
  const result = handler.parse(document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return { ...result.data, diagnostics: handler.validate(result.data.unit) };
}

async function expectVehicleImport(
  text: string,
  unitType: UnitType,
  motionType: string,
  invalid = false,
) {
  const parsed = new BlkParserService().parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const expected =
    unitType === UnitType.VTOL
      ? parseExpected(parsed.data.document, createVTOLHandler())
      : unitType === UnitType.SUPPORT_VEHICLE
        ? parseExpected(parsed.data.document, createSupportVehicleHandler())
        : parseExpected(parsed.data.document, createVehicleHandler());
  const { unit } = expected;
  if (invalid) {
    expect(expected.diagnostics.isValid).toBe(false);
    expect(expected.diagnostics.errors.length).toBeGreaterThan(0);
  }
  const res = await post(text);
  expect(res._getStatusCode()).toBe(201);
  const id = parseImportResponse(res).data?.unitId;
  if (!id) throw new Error('Expected saved custom identity');
  expect(id).toMatch(/^custom-/);
  expect(id).not.toBe(unit.id);
  expect(getUnitRepository().list()).toHaveLength(1);
  const loaded = await reload('vehicles', id);
  expect(loaded).toMatchObject({
    success: true,
    family: 'vehicles',
    reference: { source: 'custom', family: 'vehicles', id, version: 1 },
  });
  if (!loaded.success) throw new Error(loaded.error);
  expect(loaded.definition).toMatchObject({
    id,
    family: 'vehicles',
    unitType,
    motionType,
    chassis: parsed.data.document.name,
    model: parsed.data.document.model,
    armor: { byLocation: unit.armorByLocation },
    movement: unit.movement,
    isValid: unit.isValid,
    validationErrors: unit.validationErrors,
    equipment: unit.equipment.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: mount.location,
    })),
  });
  expect(loaded.definition.blkSource).toEqual(
    JSON.parse(
      JSON.stringify({
        text,
        document: parsed.data.document,
        handlerUnit: unit,
        diagnostics: expected.diagnostics,
        warnings: [...parsed.data.warnings, ...expected.warnings],
      }),
    ),
  );
}

it.each(vehicleSources)(
  'saves and reloads original vehicle bytes %s',
  async (path, sha256, unitType, motionType) => {
    const text = vehicleText(path);
    expect(createHash('sha256').update(text).digest('hex')).toBe(sha256);
    await expectVehicleImport(text, unitType, motionType);
  },
);

it('saves and reloads a loadable construction-invalid vehicle with diagnostics', async () => {
  const source = vehicleText(vehicleSources[3][0]);
  const text = source.replace(
    /<cruiseMP>[\s\S]*?<\/cruiseMP>/i,
    '<cruiseMP>\n0\n</cruiseMP>',
  );
  expect(text).not.toBe(source);
  await expectVehicleImport(text, UnitType.VTOL, 'VTOL', true);
});

it('rejects a vehicle name conflict without overwriting its saved source', async () => {
  const text = vehicleText(vehicleSources[0][0]);
  expect((await post(text))._getStatusCode()).toBe(201);
  const before = getUnitRepository().list();
  const saved = getUnitRepository().getById(before[0].id);
  const res = await post(`# conflicting source\n${text}`);
  expect(res._getStatusCode()).toBe(409);
  expect(parseImportResponse(res).error?.suggestedName).toBeTruthy();
  expect(getUnitRepository().list()).toEqual(before);
  expect(getUnitRepository().getById(before[0].id)).toEqual(saved);
});

it('rejects an unrepresentable vehicle armor code without defaulting or writing', async () => {
  const text = vehicleText(vehicleSources[0][0]).replace(
    /<armor_type>[\s\S]*?<\/armor_type>/i,
    '<armor_type>999</armor_type>',
  );
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /armor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});

it('preserves the existing ProtoMech armor admission boundary', async () => {
  const text = fixtures[0].blk.replace(
    /<armor_type>[\s\S]*?<\/armor_type>/i,
    '<armor_type>4</armor_type>',
  );
  expect(text).not.toBe(fixtures[0].blk);
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /armor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});

it.each(['Aero', 'DropShip', 'BattleArmor', 'Infantry', 'BattleMech'])(
  'explicitly rejects unsupported BLK type %s without a write',
  async (type) => {
    const res = await post(fixtures[0].blk.replace('ProtoMek', type));
    expect(res._getStatusCode()).toBe(400);
    expect(parseImportResponse(res).error?.message).toMatch(
      /unsupported BLK unit type/i,
    );
    expect(getUnitRepository().list()).toHaveLength(0);
  },
);
it.each([
  undefined,
  42,
  'not BLK',
  fixtures[0].blk.replace(
    /<cruiseMP>[\s\S]*?<\/cruiseMP>/,
    '<cruiseMP>bad</cruiseMP>',
  ),
])('rejects malformed source %# without a write', async (text) => {
  expect((await post(text))._getStatusCode()).toBe(400);
  expect(getUnitRepository().list()).toHaveLength(0);
});
