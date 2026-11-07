import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { createHash } from 'node:crypto';

import customHandler from '@/pages/api/units/custom/[id]';
import handler from '@/pages/api/units/import';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';

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
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      const { req, res: saved } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id },
      });
      await customHandler(req, saved);
      return {
        ok: saved._getStatusCode() === 200,
        json: async () => JSON.parse(saved._getData()),
      } as Response;
    });
    try {
      const loaded = await loadUnitDefinition('protomechs', id, 'custom');
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
    } finally {
      global.fetch = originalFetch;
    }
  },
);

it.each(['Tank', 'Aero', 'DropShip', 'BattleArmor', 'Infantry', 'BattleMech'])(
  'explicitly rejects unsupported BLK type %s without a write',
  async (type) => {
    const res = await post(fixtures[0].blk.replace('ProtoMek', type));
    expect(res._getStatusCode()).toBe(400);
    expect(parseImportResponse(res).error?.message).toMatch(/only protomechs/i);
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
