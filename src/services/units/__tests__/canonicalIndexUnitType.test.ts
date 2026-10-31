/**
 * Browser and Node canonical services must map a raw index row the same way,
 * and take `unitType` from the row instead of assuming BattleMech.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { UnitType } from '@/types/unit/BattleMechInterfaces';

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

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ul09a-'));
    const dir = path.join(tempRoot, 'public/data/units/battlemechs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(INDEX));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => INDEX,
    });
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
});
