import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { UnitContract } from '@/types/contracts';
import { Era } from '@/types/enums/Era';
import { UNIT_FAMILIES } from '@/types/unit/UnitIndex';
import { logger } from '@/utils/logger';

import {
  CanonicalUnitService,
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '../CanonicalUnitService';
import { customUnitApiService } from '../CustomUnitApiService';
import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';
import { mapRawIndexRows, type RawUnitIndexEntry } from '../unitIndexMapper';
import { loadUnitDefinition } from '../unitLoaderService/loadUnitDefinition';
import { UnitLoaderService } from '../unitLoaderService/unitLoader';
import { UnitSearchService } from '../UnitSearchService';

jest.mock('../CustomUnitApiService', () => ({
  customUnitApiService: { list: async () => [], getById: jest.fn() },
}));
jest.mock('uuid', () => ({ v4: () => 'ul-10-fixed-editor' }));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

const shipped = JSON.parse(
  fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'),
) as { units: RawUnitIndexEntry[] };
const fixtures = 'scripts/__tests__/fixtures/unit-index';
let root: string;
let browser: CanonicalUnitService;
let node: NodeCanonicalUnitService;
let fetchMock: jest.Mock;

function writeIndex(family: string, units: unknown[]) {
  const directory = path.join(root, 'public/data/units', family);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'index.json'),
    JSON.stringify({ version: 'fixture', units }),
  );
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'ul-09b-'));
  const mech = shipped.units.find((row) => row.id === 'tomahawk-c')!;
  writeIndex('battlemechs', [mech]);
  const mechDestination = path.join(
    root,
    'public/data/units/battlemechs',
    mech.path,
  );
  fs.mkdirSync(path.dirname(mechDestination), { recursive: true });
  fs.copyFileSync(
    path.join('public/data/units/battlemechs', mech.path),
    mechDestination,
  );
  for (const family of ['vehicles', 'aerospace']) {
    const directory = path.join(root, 'public/data/units', family);
    fs.cpSync(path.join(fixtures, family), directory, { recursive: true });
    const rows = fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const unit = JSON.parse(
          fs.readFileSync(path.join(directory, file), 'utf8'),
        ) as RawUnitIndexEntry & { model: string };
        return { ...unit, path: file };
      });
    writeIndex(family, rows);
  }
  fetchMock = jest.fn(async (input: string) => {
    const relative = decodeURIComponent(
      new URL(input, 'http://localhost').pathname,
    ).replace(/^\//, '');
    const file = path.join(
      root,
      'public',
      relative.replace(/^data\//, 'data/'),
    );
    return fs.existsSync(file)
      ? {
          ok: true,
          status: 200,
          json: async () => JSON.parse(fs.readFileSync(file, 'utf8')),
        }
      : { ok: false, status: 404 };
  });
  global.fetch = fetchMock;
  resetCanonicalUnitService();
  browser = getCanonicalUnitService();
  node = new NodeCanonicalUnitService(root);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
  resetCanonicalUnitService();
});

it('lists identical entries for three families, tolerating absent families', async () => {
  const entries = await browser.getIndex({ family: 'all', strict: true });
  expect(entries).toEqual(await node.getIndex({ family: 'all', strict: true }));
  expect(entries).toHaveLength(10);
  expect(entries.filter((row) => row.id === 'tomahawk-c')).toHaveLength(2);
  expect(await browser.getIndex()).toEqual(await node.getIndex());
  expect(await browser.getIndex()).toHaveLength(1);
});

it('loads both Tomahawks independently and defaults family-less ids to the mech', async () => {
  for (const service of [browser, node]) {
    const mech = await service.getById('tomahawk-c');
    const fighter = await service.getById('tomahawk-c', {
      family: 'aerospace',
    });
    expect(mech?.unitType).toBe('BattleMech');
    expect(fighter?.unitType).toBe('Aerospace');
    expect(await service.getById('tomahawk-c')).toBe(mech);
    expect(
      await service.getByIds(['tomahawk-c'], { family: 'aerospace' }),
    ).toEqual([fighter]);
  }
});

it('captures unchanged BattleMech editor bytes', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(123456789);
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  const result = await new UnitLoaderService().loadCanonicalUnit('tomahawk-c');
  expect(result).toMatchObject({ success: true });
  if (process.env.UL10_CAPTURE_FILE)
    fs.writeFileSync(process.env.UL10_CAPTURE_FILE, JSON.stringify(result));
});

it('UL-10 resolves the family-less mech and explicit aerospace Tomahawks independently', async () => {
  const mech = await loadUnitDefinition('tomahawk-c');
  const fighter = await loadUnitDefinition('aerospace', 'tomahawk-c');
  expect(mech).toMatchObject({
    success: true,
    definition: { unitType: 'BattleMech', tonnage: 100 },
  });
  expect(fighter).toMatchObject({
    success: true,
    definition: { unitType: 'Aerospace', tonnage: 45 },
    reference: { family: 'aerospace' },
  });
  if (mech.success) {
    const configuration: string = mech.definition.configuration;
    expect(configuration).toBe('Biped');
  }
  if (fighter.success) {
    const type:
      | 'Aerospace'
      | 'Conventional Fighter'
      | 'ConventionalFighter'
      | 'Small Craft'
      | 'SmallCraft' = fighter.definition.unitType;
    expect(type).toBe('Aerospace');
  }
});

it('UL-10 loads every fixture definition without creating non-mech stores', async () => {
  for (const [family, unitType] of [
    ['capital', 'DropShip'],
    ['battlearmor', 'Battle Armor'],
    ['infantry', 'Infantry'],
  ] as const) {
    const definition = { id: `${family}-fixture`, unitType };
    fs.mkdirSync(path.join(root, 'public/data/units', family), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, 'public/data/units', family, 'unit.json'),
      JSON.stringify(definition),
    );
    writeIndex(family, [
      { ...shipped.units[0], ...definition, path: 'unit.json' },
    ]);
  }
  const loader = new UnitLoaderService();
  const map = jest.spyOn(loader, 'mapToUnitState');
  for (const family of UNIT_FAMILIES) {
    for (const entry of await browser.getIndex({ family, strict: true })) {
      const result = await loadUnitDefinition(family, entry.id);
      expect(result).toMatchObject({
        success: true,
        definition: UnitContract.parse(
          await browser.getById(entry.id, { family }),
        ),
      });
      if (family !== 'battlemechs') {
        expect(
          await loader.loadUnit(entry.id, 'canonical', family),
        ).toMatchObject({
          success: false,
          errorCode: 'unsupported-store-family',
        });
      }
    }
  }
  expect(map).not.toHaveBeenCalled();
});

it('UL-10 distinguishes unknown families, missing family catalogs and missing ids', async () => {
  expect(await loadUnitDefinition('unknown', 'tomahawk-c')).toMatchObject({
    success: false,
    code: 'unknown-family',
  });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(await loadUnitDefinition('capital', 'missing')).toMatchObject({
    success: false,
    code: 'family-not-found',
  });
  writeIndex('capital', []);
  expect(await loadUnitDefinition('capital', 'missing')).toMatchObject({
    success: false,
    code: 'not-found',
  });
  expect(await loadUnitDefinition('vehicles', 'missing')).toMatchObject({
    success: false,
    code: 'not-found',
  });
});

it('UL-10 distinguishes a vehicle definition from its unavailable store mapper', async () => {
  const [entry] = await browser.getIndex({ family: 'vehicles', strict: true });
  const vehicle = await browser.getById(entry.id, {
    family: 'vehicles',
    strict: true,
  });
  jest.spyOn(browser, 'getById').mockResolvedValue(vehicle);
  expect(
    await new UnitLoaderService().loadCanonicalUnit(entry.id, 'vehicles'),
  ).toMatchObject({ success: false, errorCode: 'unsupported-store-family' });
});

it('loads a family-qualified custom definition without requiring a canonical catalog', async () => {
  const [entry] = await browser.getIndex({ family: 'vehicles', strict: true });
  const vehicle = await browser.getById(entry.id, { family: 'vehicles' });
  if (!vehicle) throw new Error('Missing vehicle fixture');
  jest
    .mocked(customUnitApiService.getById)
    .mockResolvedValue({ ...vehicle, currentVersion: 7 });
  fetchMock.mockClear();
  expect(
    await loadUnitDefinition('vehicles', 'saved-vehicle', 'custom'),
  ).toMatchObject({
    success: true,
    family: 'vehicles',
    definition: { id: vehicle.id },
    reference: {
      source: 'custom',
      id: 'saved-vehicle',
      family: 'vehicles',
      version: 7,
    },
  });
  expect(
    await new UnitLoaderService().loadCustomUnit('saved-vehicle', 'vehicles'),
  ).toMatchObject({ success: false, errorCode: 'unsupported-store-family' });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('searches, updates and removes by family without hiding the other Tomahawk', async () => {
  const search = new UnitSearchService();
  await search.initialize();
  expect(search.search('Tomahawk', { family: 'all' })).toHaveLength(2);
  expect(search.search('Tomahawk')).toHaveLength(1);
  expect(search.search('Tomahawk', { family: 'aerospace' })).toHaveLength(1);
  const fighter = search.getUnitById('tomahawk-c', 'aerospace')!;
  expect(fighter.unitType).toBe('Aerospace');
  expect(search.getUnitById('tomahawk-c')?.unitType).toBe('BattleMech');
  search.addToIndex({ ...fighter, name: 'Renamed Tomahawk' });
  expect(search.search('Renamed', { family: 'aerospace' })[0].family).toBe(
    'aerospace',
  );
  search.removeFromIndex('tomahawk-c', 'aerospace');
  expect(search.search('Tomahawk', { family: 'all' })).toHaveLength(1);
});

it('derives converted-family eras from year', async () => {
  writeIndex('capital', [
    { ...shipped.units[0], id: 'era-test', year: 3069, path: 'flat.json' },
  ]);
  for (const service of [browser, node]) {
    expect((await service.getIndex({ family: 'capital' }))[0].era).toBe(
      Era.JIHAD,
    );
  }
});

it('shares a cold in-flight index across getByIds', async () => {
  await browser.getByIds(['tomahawk-c', 'tomahawk-c']);
  expect(
    fetchMock.mock.calls.filter(([url]: [string]) =>
      url.endsWith('/index.json'),
    ),
  ).toHaveLength(1);
});

it('keeps the mech-only BV report and enriched caches within their family', () => {
  const report = path.join(root, 'bv.json');
  fs.writeFileSync(
    report,
    JSON.stringify({
      allResults: [{ unitId: 'tomahawk-c', calculatedBV: 999 }],
    }),
  );
  const entries = node.getIndexSyncWithBV({
    family: 'all',
    bvReportPath: report,
  });
  expect(
    entries.find((row) => row.id === 'tomahawk-c' && !row.family)?.bv,
  ).toBe(999);
  expect(
    entries.find((row) => row.id === 'tomahawk-c' && row.family === 'aerospace')
      ?.bv,
  ).toBeUndefined();
  expect(
    node.getIndexSyncWithBV({ family: 'aerospace', bvReportPath: report }),
  ).toHaveLength(4);
  expect(node.getIndexSyncWithBV({ bvReportPath: report })).toHaveLength(1);
});

it('a failed non-strict BV load cannot hide a later strict index failure', () => {
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  writeIndex('battlemechs', [null]);
  expect(node.getIndexSyncWithBV()).toEqual([]);
  expect(() => node.getIndexSyncWithBV({ strict: true })).toThrow(
    /no usable rows/i,
  );
});

it('skips null and invalid rows identically and never loads skipped rows', async () => {
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  writeIndex('battlemechs', [
    null,
    { ...shipped.units[0], id: 'invalid', unitType: 'Unknown' },
    shipped.units.find((row) => row.id === 'tomahawk-c'),
  ]);
  expect(await browser.getIndex()).toEqual(await node.getIndex());
  for (const service of [browser, node])
    expect(await service.getById('invalid')).toBeNull();
  expect(
    warn.mock.calls.filter(([message]) =>
      String(message).includes('row 0 "?"'),
    ),
  ).toHaveLength(2);
  expect(
    warn.mock.calls.filter(([message]) =>
      String(message).includes('row 1 "invalid"'),
    ),
  ).toHaveLength(2);
});

it('rejects all-skipped indexes in strict mode without caching them', async () => {
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  writeIndex('battlemechs', [null]);
  for (const service of [browser, node]) {
    await expect(service.getIndex({ strict: true })).rejects.toThrow(
      /no usable rows/i,
    );
    await expect(service.getIndex({ strict: true })).rejects.toThrow(
      /no usable rows/i,
    );
    await expect(service.getIndex()).resolves.toEqual([]);
  }
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(warn).toHaveBeenCalledTimes(6);
});

it('maps every shipped mech row with zero skips and opens all eight non-ASCII index ids', async () => {
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  expect(mapRawIndexRows(shipped.units)).toHaveLength(shipped.units.length);
  expect(warn).not.toHaveBeenCalled();
  const realNode = new NodeCanonicalUnitService();
  global.fetch = jest.fn().mockImplementation(async (input: string) => ({
    ok: true,
    json: async () =>
      JSON.parse(
        fs.readFileSync(
          path.join(
            process.cwd(),
            'public',
            decodeURIComponent(new URL(input, 'http://localhost').pathname),
          ),
          'utf8',
        ),
      ),
  }));
  const realBrowser = new CanonicalUnitService();
  const unusual = shipped.units.filter((row) => /[^\x00-\x7F]/.test(row.id));
  expect(unusual).toHaveLength(8);
  for (const row of unusual) {
    const unit = await realNode.getById(row.id);
    expect(unit).not.toBeNull();
    expect(unit?.chassis).toBe(row.chassis);
    expect(await realBrowser.getById(row.id)).toEqual(unit);
  }
});
