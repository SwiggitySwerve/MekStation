import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { createHash } from 'node:crypto';

import customHandler from '@/pages/api/units/custom/[id]';
import handler from '@/pages/api/units/import';
import fixtures from '@/services/conversion/__tests__/MTFParser.pinned-sources.json';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { UnitContract } from '@/types/contracts';

import { parseImportResponse } from '../../helpers';

const source = fixtures.rows.find((row) =>
  row.path.endsWith('/Annihilator ANH-3A.mtf'),
)!;
const text = Buffer.from(source.base64, 'base64').toString('utf8');

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

it('imports pinned MTF through the API, persists source facts and reloads its custom identity', async () => {
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
    expect(String(input)).toBe(`/api/units/custom/${id}`);
    const { req, res: response } = createMocks<NextApiRequest, NextApiResponse>(
      {
        method: 'GET',
        query: { id },
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
  } finally {
    global.fetch = originalFetch;
  }
  const duplicate = await post({ sourceFormat: 'mtf', sourceText: text });
  expect(duplicate._getStatusCode()).toBe(409);
  expect(getUnitRepository().list()).toHaveLength(1);
  expect(getUnitRepository().getById(id)?.data).toBe(saved.data);
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
