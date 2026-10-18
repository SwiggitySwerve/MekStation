/**
 * Mojibake guard (v2.1.0 L0-07).
 *
 * UTF-8 text that was decoded as Windows-1252/Latin-1 and re-encoded shows up
 * as sequences like an a-circumflex followed by a euro sign (an em dash gone
 * wrong), or a capital A-tilde followed by a Latin-1 continuation character.
 * The needles below are built from code points so this file never contains the
 * sequences itself.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve(__dirname, '../../..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

// a-circumflex + euro / a-circumflex + dagger-ish arrow remnants, A-tilde and
// A-circumflex followed by a Latin-1 continuation character.
const MOJIBAKE_PATTERN = new RegExp(
  [
    '\\u00e2\\u20ac', // em/en dash, bullet, quotes, ellipsis
    '\\u00e2\\u2020', // arrows
    '\\u00e2[\\u0080-\\u00bf]', // Latin-1 misread punctuation (B7)
    '\\u00c3[\\u0080-\\u00bf\\u0152-\\u0178\\u02c6\\u02dc\\u2013-\\u203a\\u20ac\\u2122]', // accented letters
    '\\u00c2[\\u00a0-\\u00bf]', // section sign, middle dot, nbsp ...
  ].join('|'),
);

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(full, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('source text encoding', () => {
  it('has no double-encoded UTF-8 (mojibake) sequences under src/', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_ROOT)) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (MOJIBAKE_PATTERN.test(line)) {
          offenders.push(
            `${path.relative(SRC_ROOT, file)}:${index + 1}: ${line.trim().slice(0, 80)}`,
          );
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the L0-07 player-facing strings as real UTF-8', () => {
    const quickGame = read(
      'components/quickgame/QuickGameSetupScenarioConfig.tsx',
    );
    expect(quickGame).toContain('Annihilation \u2014 destroy all enemies');
    expect(quickGame).toContain('Elite \u2014 gunnery 2 / piloting 3');

    const helpers = read('components/gameplay/EventLogDisplay.helpers.ts');
    expect(helpers).toContain("'\u2192 structure breach'");
  });
});

const DATA_ROOT = path.resolve(SRC_ROOT, '../public/data');
const BATTLEMECH_ROOT = path.join(DATA_ROOT, 'units/battlemechs');
// These index keys have shipped and can be persisted as campaign unitRef.
// Preserve both the index keys and the distinct ASCII IDs in the unit files.
const LEGACY_INDEX_IDS = new Map([
  ['alfar-al-d1-d\u00e3\u00b6kk\u00e3\u00a1lfar', 'alfar-al-d1-dakkalfar'],
  ['ara\u00e3\u00b1a-ara-s-1-militiamech', 'araaa-ara-s-1-militiamech'],
  ['g\u00e3\u00b6tterd\u00e3\u00a4mmerung-gtd-20c', 'gatterdammerung-gtd-20c'],
  ['g\u00e3\u00b6tterd\u00e3\u00a4mmerung-gtd-20s', 'gatterdammerung-gtd-20s'],
  ['g\u00e3\u00b6tterd\u00e3\u00a4mmerung-gtd-30s', 'gatterdammerung-gtd-30s'],
  ['g\u00e3\u00b9n-gn-2o', 'ga1n-gn-2o'],
  ['g\u00e3\u00b9n-gn-2oa', 'ga1n-gn-2oa'],
  ['g\u00e3\u00b9n-gn-2ob', 'ga1n-gn-2ob'],
]);

describe('shipped data text encoding (B7)', () => {
  it('has no mojibake in JSON text or filenames, except frozen legacy ID keys', () => {
    const offenders: string[] = [];
    const dataPattern = new RegExp(
      `${MOJIBAKE_PATTERN.source}|\\u00e3[\\u0080-\\u00bf]|\\u00c2[\\u0080-\\u00bf]|\\u00c2(?:$|\\s)`,
    );
    function inspect(value: unknown, location: string): void {
      if (typeof value === 'string') {
        if (dataPattern.test(value)) offenders.push(location);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => inspect(item, `${location}[${index}]`));
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          inspect(key, `${location} (key)`);
          inspect(item, `${location}.${key}`);
        }
      }
    }
    function inspectJsonFile(full: string): void {
      const value: unknown = JSON.parse(fs.readFileSync(full, 'utf8'));
      // The exact eight compatibility keys are the sole exceptions.
      if (full === path.join(BATTLEMECH_ROOT, 'index.json')) {
        const index = value as { units: { id: string }[] };
        for (const unit of index.units) {
          if (LEGACY_INDEX_IDS.has(unit.id)) unit.id = 'preserved-legacy-id';
        }
      }
      inspect(value, path.relative(DATA_ROOT, full));
    }
    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        inspect(entry.name, full);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.json')) {
          inspectJsonFile(full);
        }
      }
    }
    walk(DATA_ROOT);
    expect(offenders).toEqual([]);
  });

  it('resolves every index path with matching display text and stable legacy IDs', () => {
    const index = JSON.parse(
      fs.readFileSync(path.join(BATTLEMECH_ROOT, 'index.json'), 'utf8'),
    ) as {
      totalUnits: number;
      units: { id: string; path: string; chassis: string; model: string }[];
    };
    const seenLegacyIds: string[] = [];
    expect(index.units).toHaveLength(index.totalUnits);
    expect(new Set(index.units.map((unit) => unit.id)).size).toBe(
      index.totalUnits,
    );
    for (const entry of index.units) {
      const unit = JSON.parse(
        fs.readFileSync(path.join(BATTLEMECH_ROOT, entry.path), 'utf8'),
      ) as {
        id: string;
        chassis: string;
        model: string;
      };
      expect(unit.chassis).toBe(entry.chassis);
      expect(unit.model).toBe(entry.model);
      expect(unit.id).toBe(LEGACY_INDEX_IDS.get(entry.id) ?? entry.id);
      if (LEGACY_INDEX_IDS.has(entry.id)) seenLegacyIds.push(entry.id);
    }
    expect(seenLegacyIds.sort()).toEqual([...LEGACY_INDEX_IDS.keys()].sort());
  });
});
