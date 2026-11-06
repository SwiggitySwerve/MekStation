import {
  parseWeaponQuirksFromBLK,
  parseWeaponQuirksFromMTF,
} from '@/utils/gameplay/quirkModifiers';

import { BlkParserService } from '../BlkParserService';
import { MTFParserService } from '../MTFParserService';
import fixture from './fixtures/weaponQuirks.pinned.json';

type SourceLine = readonly [string, string, string, string, number];
function sourceLines(
  rows: readonly (readonly (string | number)[])[],
): SourceLine[] {
  return rows.map((row): SourceLine => {
    const [text, mount, quirk, path, number] = row;
    if (
      row.length !== 5 ||
      typeof text !== 'string' ||
      typeof mount !== 'string' ||
      typeof quirk !== 'string' ||
      typeof path !== 'string' ||
      typeof number !== 'number'
    ) {
      throw new Error('Invalid pinned source fixture');
    }
    return [text, mount, quirk, path, number];
  });
}
const mtf = sourceLines(fixture.mtf.lines);
const blk = sourceLines(fixture.blk.lines);
const mtfHeader = 'chassis:Pinned\nmodel:Source\nmass:80\n';
const blkHeader =
  '<UnitType>\nTank\n</UnitType>\n<Name>\nPinned\n</Name>\n<year>\n3050\n</year>\n<tonnage>\n80\n</tonnage>\n';

function parseBlk(entries: readonly string[], tag = 'weaponQuirks') {
  const result = new BlkParserService().parse(
    `${blkHeader}<${tag}>\n${entries.join('\n')}\n</${tag}>`,
  );
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return result.data.document.weaponQuirks;
}

// MegaMek 48fcb2f64: MtfFile.java:639-649; BLKFile.java:225-230.
// Exact mm-data 50f7efef lines, paths, line numbers and hashes are in the fixture.
describe('pinned native weapon quirk sources', () => {
  it.each(mtf)('imports MTF %s', (line, mount, quirk) => {
    const expected = { [mount]: [quirk] };
    expect(
      new MTFParserService().parse(mtfHeader + line).unit?.weaponQuirks,
    ).toEqual(expected);
    expect(parseWeaponQuirksFromMTF([line])).toEqual(expected);
  });

  it.each(blk)('imports BLK %s', (line, mount, quirk) => {
    const expected = { [mount]: [quirk] };
    expect(parseBlk([line])).toEqual(expected);
    expect(parseWeaponQuirksFromBLK([line])).toEqual(expected);
  });

  it.each(['mtf', 'blk'] as const)(
    'covers every pinned %s name and location',
    (format) => {
      const rows = format === 'mtf' ? mtf : blk;
      expect([...new Set(rows.map((row) => row[2]))].sort()).toEqual(
        fixture[format].names,
      );
      expect(
        [...new Set(rows.map((row) => row[1].split(':')[0]))].sort(),
      ).toEqual(fixture[format].locations);
      expect(
        [...new Set(rows.map((row) => Number(row[1].split(':')[1])))].sort(
          (a, b) => a - b,
        ),
      ).toEqual(fixture[format].slots);
    },
  );

  it('retains source order, multiple quirks and repeated entries on one MTF mount', () => {
    const rows = mtf
      .filter((row) => row[3].endsWith('Enforcer ENF-5A Enforcer II.mtf'))
      .sort((a, b) => a[4] - b[4]);
    const lines = rows.map((row) => row[0]);
    expect(
      new MTFParserService().parse(mtfHeader + [...lines, lines[0]].join('\n'))
        .unit?.weaponQuirks,
    ).toEqual({
      'RA:3:Autocannon/10': [
        'imp_cooling',
        'ammo_feed_problems',
        'fast_reload',
        'imp_cooling',
      ],
    });
  });

  it('keeps the same BLK weapon name separate by both location and slot', () => {
    const rows = blk
      .filter((row) => row[3].endsWith('Starfire SF-1X.blk'))
      .sort((a, b) => a[4] - b[4]);
    expect(parseBlk(rows.map((row) => row[0]))).toEqual({
      'NOS:0:ISUltraAC5': ['mod_weapons'],
      'LWG:0:Medium Laser': ['mod_weapons'],
      'LWG:1:Medium Laser': ['mod_weapons'],
      'RWG:0:Medium Laser': ['mod_weapons'],
      'RWG:1:Medium Laser': ['mod_weapons'],
      'AFT:0:Small Laser': ['mod_weapons'],
    });
  });

  it('preserves repeated BLK entries without overwriting', () => {
    const [line, mount, quirk] = blk[0];
    expect(parseBlk([line, line])).toEqual({ [mount]: [quirk, quirk] });
  });

  it('keeps old underscored BLK imports readable', () => {
    expect(parseBlk(['accurate:Medium Laser'], 'weapon_quirks')).toEqual({
      'Medium Laser': ['accurate'],
    });
  });

  it('does not turn malformed native MTF locators into name-only quirks', () => {
    expect(
      parseWeaponQuirksFromMTF([
        'weaponquirk:accurate:RA:-1:Medium Laser',
        'weaponquirk:accurate:RA:1.5:Medium Laser',
        'weaponquirk:accurate:RA:bad:Medium Laser',
        'weaponquirk:accurate:RA:3:',
      ]),
    ).toEqual({});
  });
});
