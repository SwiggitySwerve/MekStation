/**
 * Browser and Node canonical services must map a raw index row the same way,
 * and take `unitType` from the row instead of assuming BattleMech.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import { CanonicalUnitService } from '../CanonicalUnitService';
import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';
import { mapRawIndexEntry } from '../unitIndexMapper';

const MECH_ROW = {
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  techBase: 'INNER_SPHERE',
  year: 2750,
  path: '3-succession-wars/assault/Atlas AS7-D.json',
};

const VEHICLE_ROW = {
  id: 'demolisher-ii',
  chassis: 'Demolisher II',
  model: 'Heavy Tank',
  tonnage: 100,
  techBase: 'INNER_SPHERE',
  year: 3075,
  unitType: 'Vehicle',
  path: '3-succession-wars/Demolisher II.json',
};

const INDEX = {
  version: '1.0.0',
  totalUnits: 2,
  units: [MECH_ROW, VEHICLE_ROW],
};

describe('canonical index unitType', () => {
  let tempRoot: string;

  function writeIndex(index: { units: readonly object[] }): void {
    const dir = path.join(tempRoot, 'public/data/units/battlemechs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => index,
    });
  }

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ul09a-'));
    writeIndex(INDEX);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('browser service keeps BattleMech for rows without unitType and reads Vehicle', async () => {
    const entries = await new CanonicalUnitService().getIndex();
    expect(entries.map((e) => e.unitType)).toEqual([
      UnitType.BATTLEMECH,
      UnitType.VEHICLE,
    ]);
  });

  it('Node service keeps BattleMech for rows without unitType and reads Vehicle', () => {
    const entries = new NodeCanonicalUnitService(tempRoot).getIndexSync();
    expect(entries.map((e) => e.unitType)).toEqual([
      UnitType.BATTLEMECH,
      UnitType.VEHICLE,
    ]);
  });

  it('both services return identical entries for the same raw index', async () => {
    const browser = await new CanonicalUnitService().getIndex();
    const node = new NodeCanonicalUnitService(tempRoot).getIndexSync();
    expect(node).toEqual(browser);
  });

  it('rejects a unitType that is not a known UnitType instead of defaulting to BattleMech', () => {
    expect(() =>
      mapRawIndexEntry({ ...VEHICLE_ROW, unitType: 'Hovercraft' }),
    ).toThrow(/demolisher-ii.*Hovercraft/);
  });

  it.each(['', null])(
    'rejects unitType %p instead of treating it as absent',
    (unitType) => {
      expect(() =>
        mapRawIndexEntry({
          ...VEHICLE_ROW,
          unitType: unitType as unknown as string,
        }),
      ).toThrow(/demolisher-ii/);
    },
  );

  it('maps a mech row to the exact entry, including its site-root filePath', () => {
    expect(mapRawIndexEntry({ ...MECH_ROW, techBase: 'MIXED' })).toEqual({
      id: 'atlas-as7-d',
      name: 'Atlas AS7-D',
      chassis: 'Atlas',
      variant: 'AS7-D',
      tonnage: 100,
      techBase: TechBase.INNER_SPHERE,
      era: Era.LATE_SUCCESSION_WARS,
      weightClass: WeightClass.ASSAULT,
      unitType: UnitType.BATTLEMECH,
      filePath:
        '/data/units/battlemechs/3-succession-wars/assault/Atlas AS7-D.json',
      year: 2750,
      role: undefined,
      rulesLevel: undefined,
      cost: undefined,
      bv: undefined,
    });
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'falls back to Inner Sphere for the inherited object key %s',
    (techBase) => {
      expect(mapRawIndexEntry({ ...MECH_ROW, techBase }).techBase).toBe(
        TechBase.INNER_SPHERE,
      );
    },
  );

  describe('an index row with an unknown unitType', () => {
    const BAD_ROW = { ...VEHICLE_ROW, id: 'bad-row', unitType: 'Hovercraft' };

    beforeEach(() => {
      writeIndex({ units: [MECH_ROW, BAD_ROW, VEHICLE_ROW] });
    });

    it('is skipped and logged by the browser service, keeping the other rows', async () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const entries = await new CanonicalUnitService().getIndex();
      expect(entries.map((e) => e.id)).toEqual([
        'atlas-as7-d',
        'demolisher-ii',
      ]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/bad-row.*Hovercraft/),
      );
      warn.mockRestore();
    });

    it('fails a strict browser load, even after a lenient one', async () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const service = new CanonicalUnitService();
      await service.getIndex();
      await expect(service.getIndex({ strict: true })).rejects.toThrow(
        /bad-row.*Hovercraft/,
      );
      warn.mockRestore();
    });

    it('is skipped and logged by the Node service, keeping the other rows', () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const service = new NodeCanonicalUnitService(tempRoot);
      expect(service.getIndexSync().map((e) => e.id)).toEqual([
        'atlas-as7-d',
        'demolisher-ii',
      ]);
      expect(service.getByIdSync('atlas-as7-d')).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(/bad-row.*Hovercraft/),
      );
      warn.mockRestore();
    });
  });
});
