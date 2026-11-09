import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import customHandler from '@/pages/api/units/custom/[id]';
import handler from '@/pages/api/units/import';
import fixtures from '@/services/conversion/__tests__/MTFParser.pinned-sources.json';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { GyroType } from '@/types/construction/GyroType';
import { UnitContract } from '@/types/contracts';
import { getEraForYear } from '@/types/enums';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { parseImportResponse } from '../../helpers';

const source = fixtures.rows.find((row) =>
  row.path.endsWith('/Annihilator ANH-3A.mtf'),
)!;
const text = Buffer.from(source.base64, 'base64').toString('utf8');

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

async function post(body: unknown) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
  });
  req.body = body;
  await handler(req, res);
  return res;
}

beforeEach(() => getSQLiteService({ path: ':memory:' }).initialize());
afterEach(() => resetSQLiteService());

it('retains a declared XL gyro through real API persistence and loading', async () => {
  const sourceText = /^gyro:/im.test(text)
    ? text.replace(/^gyro:.*$/im, 'gyro:XL Gyro')
    : `${text}\ngyro:XL Gyro`;
  const response = await post({ sourceFormat: 'mtf', sourceText });
  expect(response._getStatusCode()).toBe(201);
  const id = parseImportResponse(response).data?.unitId;
  if (!id) throw new Error('Expected persisted XL source');
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
    query: { id },
  });
  await customHandler(req, res);
  expect(res._getStatusCode()).toBe(200);
  const definition = parseUnit(JSON.parse(res._getData()).parsedData);
  expect(definition.gyro?.type).toBe('XL');
  expect(
    new UnitLoaderService().mapToUnitState(definition, false).gyroType,
  ).toBe(GyroType.XL);
});

it('persists a crit-only variable mount through API import, GET and custom save/reload', async () => {
  const sourceText =
    text.replace(/^mass:.*$/im, 'mass:80') +
    `\nLeft Arm:\n${Array(8).fill('Mace (R) (OMNIPOD)').join('\n')}\n`;
  const response = await post({ sourceFormat: 'mtf', sourceText });
  expect(response._getStatusCode()).toBe(201);
  const id = parseImportResponse(response).data?.unitId;
  if (!id) throw new Error('Expected custom identity');
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
    query: { id },
  });
  await customHandler(req, res);
  expect(res._getStatusCode()).toBe(200);
  const stored = getUnitRepository().getById(id);
  if (!stored) throw new Error('Expected SQLite data');
  const definition = UnitContract.parse(JSON.parse(stored.data));
  expect(JSON.parse(res._getData()).parsedData).toEqual(definition);
  expect(definition.equipment?.filter((item) => item.id === 'mace')).toEqual([
    {
      id: 'mace',
      location: 'LEFT_ARM',
      slots: [0, 1, 2, 3, 4, 5, 6, 7],
      isRearMounted: true,
      isOmniPodMounted: true,
    },
  ]);
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(parseUnit(definition), false);
  const saved = serializeCustomUnitState(state, {
    id: 'custom-slot-copy',
    chassis: state.chassis,
    variant: 'Slot copy',
    era: getEraForYear(state.year),
  });
  const savedResponse = await post(saved);
  expect(savedResponse._getStatusCode()).toBe(201);
  const copyId = parseImportResponse(savedResponse).data?.unitId;
  if (!copyId) throw new Error('Expected saved copy');
  const copy = getUnitRepository().getById(copyId);
  if (!copy) throw new Error('Expected SQLite copy');
  const reloaded = loader.mapToUnitState(
    parseUnit(JSON.parse(copy.data)),
    false,
  );
  for (const equipment of [state.equipment, reloaded.equipment]) {
    expect(
      equipment.filter((item) => item.equipmentId === 'mace'),
    ).toMatchObject([
      {
        weight: 8,
        criticalSlots: 8,
        slots: [0, 1, 2, 3, 4, 5, 6, 7],
        isRearMounted: true,
        isOmniPodMounted: true,
      },
    ]);
    expect(
      equipment.filter((item) => item.equipmentId === 'mace'),
    ).toHaveLength(1);
  }
});

it('imports pinned MTF, renames a conflict and reloads its custom identity without rewriting source', async () => {
  expect(createHash('sha256').update(text).digest('hex')).toBe(source.sha256);
  const res = await post({ sourceFormat: 'mtf', sourceText: text });
  expect(res._getStatusCode()).toBe(201);
  const result = parseImportResponse(res);
  const id = result.data?.unitId;
  expect(id).toMatch(/^custom-/);
  if (!id) throw new Error('Expected saved custom identity');
  const saved = getUnitRepository().getById(id);
  if (!saved) throw new Error('Expected persisted unit');
  const parsed = new MTFParserService().parse(text);
  const savedDefinition: unknown = JSON.parse(saved.data);
  expect(savedDefinition).toEqual(UnitContract.parse(parsed.unit));
  expect(savedDefinition).toHaveProperty('mtfSource.text', text);
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async (input) => {
    expect(String(input)).toMatch(/^\/api\/units\/custom\/custom-/);
    const requestedId = String(input).split('/').pop();
    const { req, res: response } = createMocks<NextApiRequest, NextApiResponse>(
      {
        method: 'GET',
        query: { id: requestedId },
      },
    );
    await customHandler(req, response);
    return {
      ok: response._getStatusCode() === 200,
      json: async () => JSON.parse(response._getData()),
    } as Response;
  });
  try {
    expect(await loadUnitDefinition('battlemechs', id, 'custom')).toMatchObject(
      {
        success: true,
        family: 'battlemechs',
        reference: { source: 'custom', id, version: 1 },
        definition: {
          id,
          unitType: 'BattleMech',
          mtfSource: { text },
          engine: parsed.unit?.engine,
          armor: parsed.unit?.armor,
          criticalSlots: parsed.unit?.criticalSlots,
        },
      },
    );
    const duplicate = await post({ sourceFormat: 'mtf', sourceText: text });
    expect(duplicate._getStatusCode()).toBe(409);
    expect(parseImportResponse(duplicate).error?.suggestedName).toBe(
      'ANH-3A-Custom-1',
    );
    expect(getUnitRepository().list()).toHaveLength(1);
    expect(getUnitRepository().getById(id)?.data).toBe(saved.data);
    const renamed = await post({
      sourceFormat: 'mtf',
      sourceText: text,
      variant: '  ANH-3A-Renamed  ',
    });
    expect(renamed._getStatusCode()).toBe(201);
    const renamedId = parseImportResponse(renamed).data?.unitId;
    if (!renamedId) throw new Error('Expected renamed custom identity');
    expect(renamedId).not.toBe(id);
    const renamedUnit = getUnitRepository().getById(renamedId);
    expect(renamedUnit?.variant).toBe('ANH-3A-Renamed');
    const renamedDefinition = await loadUnitDefinition(
      'battlemechs',
      renamedId,
      'custom',
    );
    expect(renamedDefinition).toMatchObject({
      success: true,
      reference: { source: 'custom', id: renamedId, version: 1 },
      definition: {
        id: renamedId,
        model: 'ANH-3A-Renamed',
        variant: 'ANH-3A-Renamed',
        mtfSource: { text },
      },
    });
    expect(getUnitRepository().getById(id)?.data).toBe(saved.data);
  } finally {
    global.fetch = originalFetch;
  }
});

it.each([
  ['missing text', { sourceFormat: 'mtf' }],
  ['non-string text', { sourceFormat: 'mtf', sourceText: 42 }],
  ['invalid source', { sourceFormat: 'mtf', sourceText: 'not a unit' }],
  [
    'invalid contract',
    { sourceFormat: 'mtf', sourceText: text.replace(/^mass:.*$/m, 'mass:-1') },
  ],
  ['unknown format', { sourceFormat: 'bfs', sourceText: text }],
  ['primitive body', 42],
  ['array body', []],
  [
    'empty MTF variant',
    { sourceFormat: 'mtf', sourceText: text, variant: ' ' },
  ],
  [
    'non-string MTF variant',
    { sourceFormat: 'mtf', sourceText: text, variant: 42 },
  ],
])(
  'rejects %s with client diagnostics and no persisted unit',
  async (_name, body) => {
    const res = await post(body);
    expect(res._getStatusCode()).toBe(400);
    expect(parseImportResponse(res)).toMatchObject({
      success: false,
      error: { message: expect.any(String) },
    });
    expect(getUnitRepository().list()).toHaveLength(0);
  },
);

it('retains unsupported source diagnostics rather than admitting substituted fields', async () => {
  const unsupported = fixtures.rows.find((row) =>
    row.fields.Config.includes('FrankenMek'),
  )!;
  const res = await post({
    sourceFormat: 'mtf',
    sourceText: Buffer.from(unsupported.base64, 'base64').toString('utf8'),
  });
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error).toMatchObject({
    validationErrors: expect.arrayContaining([
      expect.stringContaining('configuration'),
    ]),
    warnings: expect.arrayContaining([expect.stringContaining('FrankenMek')]),
  });
  expect(getUnitRepository().list()).toHaveLength(0);
});

it('retains structurally representable construction-invalid armor without a new validity gate', async () => {
  const overArmored = text.replace(/^HD armor:.*$/m, 'HD armor:99');
  expect(overArmored).not.toBe(text);
  const res = await post({ sourceFormat: 'mtf', sourceText: overArmored });
  expect(res._getStatusCode()).toBe(201);
  const id = parseImportResponse(res).data?.unitId;
  if (!id) throw new Error('Expected imported unit');
  const saved = getUnitRepository().getById(id);
  if (!saved) throw new Error('Expected persisted unit');
  expect(JSON.parse(saved.data)).toHaveProperty('armor.allocation.HEAD', 99);
});
