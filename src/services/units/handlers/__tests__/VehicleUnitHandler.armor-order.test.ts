import { createHash } from 'crypto';

import { formatVehicleArmor } from '@/services/conversion/BlkExportServiceCore.formatters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import { VehicleUnitHandler } from '../VehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';
import sources from './fixtures/armor-order-sources.json';

/**
 * MegaMek BLK `<armor>` order, pinned 48fcb2f64a1b3f2d575707ce5653dad64927b587:
 * `BLKTankFile.java:195-200` copies the array to locations 1.. and
 * `Tank.java:123-130` numbers them Front=1, Right=2, Left=3, Rear=4, Turret=5.
 * `BLKVTOLFile.java:134-139` + `VTOL.java:79-80` give a VTOL Rotor=5, Turret=6.
 * The fixtures are the original mm-data 50f7efef bytes.
 */
const parser = new BlkParserService();
const source = (name: string) => {
  const found = sources.find((entry) => entry.path.endsWith(name));
  if (!found) throw new Error(`missing fixture ${name}`);
  expect(createHash('sha256').update(found.content).digest('hex')).toBe(
    found.sha256,
  );
  const parsed = parser.parse(found.content);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data.document;
};

describe('BLK vehicle armor order (Front, Right, Left, Rear, ...)', () => {
  it('loads Maxim Flanker with its 46 points on the right', () => {
    const document = source('Maxim Flanker.blk');
    expect(document.armor).toEqual([20, 46, 10, 12]);
    const loaded = new VehicleUnitHandler().parse(document);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const armor = loaded.data.unit.armorByLocation;
    expect(armor[VehicleLocation.FRONT]).toBe(20);
    expect(armor[VehicleLocation.RIGHT]).toBe(46);
    expect(armor[VehicleLocation.LEFT]).toBe(10);
    expect(armor[VehicleLocation.REAR]).toBe(12);
  });

  it('loads Gun Trailer (Mjolnir) with 5 on the right and 4 on the left', () => {
    const loaded = new VehicleUnitHandler().parse(
      source('Gun Trailer (Mjolnir).blk'),
    );
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const armor = loaded.data.unit.armorByLocation;
    expect(armor[VehicleLocation.RIGHT]).toBe(5);
    expect(armor[VehicleLocation.LEFT]).toBe(4);
  });

  // MegaMek writes four values for a turretless Tank (BLKFile.java:947-965); a
  // fifth makes it add a turret when the file is reloaded.
  it('exports turretless Maxim Flanker back in BLK order, four values', () => {
    const loaded = new VehicleUnitHandler().parse(source('Maxim Flanker.blk'));
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    expect(
      formatVehicleArmor(loaded.data.unit.armorByLocation, false, false).split(
        '\n',
      ),
    ).toEqual(['20', '46', '10', '12']);
  });

  it('loads Red Kite with the rotor before the chin turret', () => {
    const document = source('Red Kite Attack VTOL.blk');
    expect(document.armor).toEqual([16, 10, 10, 8, 2, 16]);
    const loaded = new VTOLUnitHandler().parse(document);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const armor = loaded.data.unit.armorByLocation;
    expect(armor[VTOLLocation.ROTOR]).toBe(2);
    expect(armor[VTOLLocation.TURRET]).toBe(16);
    // MegaMek totals every location, turret and rotor included.
    expect(Object.values(armor).reduce((sum, value) => sum + value, 0)).toBe(
      62,
    );
  });

  it('exports a VTOL in the order it loaded, rotor before turret', () => {
    const handler = new VTOLUnitHandler();
    const document = source('Red Kite Attack VTOL.blk');
    const loaded = handler.parse(document);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const exported = formatVehicleArmor(
      loaded.data.unit.armorByLocation,
      true,
      true,
    ).split('\n');
    expect(exported).toEqual(document.armor?.map(String));
  });
});
