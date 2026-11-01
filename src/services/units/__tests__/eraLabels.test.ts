import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Era, getEraForYear } from '@/types/temporal/Era';
import { UNIT_FAMILIES } from '@/types/unit/UnitIndex';

import { CanonicalUnitService } from '../CanonicalUnitService';
import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';
import { mapRawIndexEntry } from '../unitIndexMapper';
import { UnitSearchService } from '../UnitSearchService';

jest.mock('../CustomUnitApiService', () => ({
  customUnitApiService: { list: async () => [] },
}));

const mech = {
  id: 'year-test',
  chassis: 'EraProbe',
  model: 'A',
  tonnage: 50,
  techBase: 'INNER_SPHERE',
  year: 3069,
  path: '5-civil-war/medium/probe.json',
};

// mm-data 50f7efef: data/universe/eras.xml:34-135 (inclusive end years).
it.each([
  [1950, 'Pre-Spaceflight'],
  [1951, 'Early Spaceflight'],
  [2004, 'Early Spaceflight'],
  [2005, 'Age of War'],
  [2570, 'Age of War'],
  [2571, 'Star League'],
  [2780, 'Star League'],
  [2781, 'Early Succession Wars'],
  [2900, 'Early Succession Wars'],
  [2901, 'Late Succession Wars'],
  [3019, 'Late Succession Wars'],
  [3020, 'Renaissance'],
  [3049, 'Renaissance'],
  [3050, 'Clan Invasion'],
  [3061, 'Clan Invasion'],
  [3062, 'Civil War'],
  [3067, 'Civil War'],
  [3068, 'Jihad'],
  [3080, 'Jihad'],
  [3081, 'Early Republic'],
  [3100, 'Early Republic'],
  [3101, 'Late Republic'],
  [3130, 'Late Republic'],
  [3131, 'Dark Age'],
  [3150, 'Dark Age'],
  [3151, 'ilClan'],
  [10000, 'ilClan'],
])('maps year %i to %s at the pinned boundary', (year, era) => {
  expect(getEraForYear(Number(year))).toBe(era);
});

it('labels a 3069 mech Jihad', () => {
  expect(mapRawIndexEntry(mech).era).toBe(Era.JIHAD);
});

it('ignores a mech folder bucket that disagrees with its year', () => {
  expect(mapRawIndexEntry({ ...mech, year: 2750 }).era).toBe(Era.STAR_LEAGUE);
});

it('keeps a row with no year without assigning an era', () => {
  const { year: _year, ...undated } = mech;
  expect(mapRawIndexEntry(undated).era).toBeUndefined();
});

describe('canonical era labels, search and filters', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'era-labels-'));
    global.fetch = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        JSON.parse(fs.readFileSync(path.join(root, 'public', url), 'utf8')),
    }));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('uses identical year labels across every family in both services and search', async () => {
    for (const family of UNIT_FAMILIES) {
      const directory = path.join(root, 'public/data/units', family);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, 'index.json'),
        JSON.stringify({
          units: [
            mech,
            ...[undefined, null, '', '3069', NaN, Infinity, 0, -1, 3069.5].map(
              (year, i) => ({ ...mech, id: `undated-${i}`, year }),
            ),
          ],
        }),
      );
    }
    const browser = new CanonicalUnitService();
    const node = new NodeCanonicalUnitService(root);
    for (const family of UNIT_FAMILIES) {
      const entries = await browser.getIndex({ family, strict: true });
      expect(entries).toEqual(node.getIndexSync({ family, strict: true }));
      expect(entries).toHaveLength(10);
      expect(entries.map((row) => row.era)).toEqual([
        Era.JIHAD,
        ...Array(9).fill(undefined),
      ]);
      for (const service of [browser, node]) {
        expect(
          (await service.query({ family, era: Era.JIHAD })).map(
            (row) => row.id,
          ),
        ).toEqual([mech.id]);
        expect(await service.query({ family, era: Era.CIVIL_WAR })).toEqual([]);
        expect(await service.query({ family, era: Era.IL_CLAN })).toEqual([]);
      }
    }
    const search = new UnitSearchService();
    await search.initialize();
    expect(
      search.search('EraProbe', { family: 'all', limit: 100 }),
    ).toHaveLength(60);
    expect(search.getUnitById(mech.id)?.era).toBe(Era.JIHAD);
    expect(search.getUnitById('undated-0', 'vehicles')?.era).toBeUndefined();
  });
});
