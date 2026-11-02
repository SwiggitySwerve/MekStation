/**
 * BA and conventional infantry BLKs carry no Tonnage tag, so the parser gives
 * them tonnage 0. The handler must accept that (Java gets BA weight from the
 * trooper count and infantry weight from TestInfantry), while every other
 * family still rejects tonnage 0.
 *
 * Real sources: mm-data 50f7efef, tag sets below (fluff prose and equipment removed).
 *
 * @spec MegaMek 48fcb2f64 BLKBattleArmorFile.java:90, TestInfantry.java:550
 */

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { BattleArmorUnitHandler } from '../BattleArmorUnitHandler';
import { InfantryUnitHandler } from '../InfantryUnitHandler';
import { VehicleUnitHandler } from '../VehicleUnitHandler';

const tags = (pairs: string[][]): string =>
  pairs
    .map(
      ([k, v]) => `<${k}>
${v}
</${k}>
`,
    )
    .join('');

// Tag set of battlearmor/3058Uu/Achileus BA (Sqd 4) [David].blk
const BA_BLK = tags([
  ['UnitType', 'BattleArmor'],
  ['Name', 'Achileus Light Battle Armor'],
  ['Model', '[David](Sqd4)'],
  ['year', '3064'],
  ['type', 'IS Level 2'],
  ['motion_type', 'Jump'],
  ['cruiseMP', '1'],
  ['chassis', 'biped'],
  ['jumpingMP', '3'],
  ['armor', '6'],
  ['Trooper Count', '4'],
  ['weightclass', '1'],
]);

// Tag set of infantry/AFFS/Field Artillery Platoon (AFFS) (Motorized Arrow IV 3067+).blk
const INFANTRY_BLK = tags([
  ['UnitType', 'Infantry'],
  ['Name', 'Field Artillery Platoon (AFFS)'],
  ['Model', '(Motorized Arrow IV 3067+)'],
  ['year', '3067'],
  ['type', 'IS Level 3'],
  ['motion_type', 'Motorized'],
  ['squad_size', '7'],
  ['squadn', '4'],
  ['Primary', 'Submachine Gun'],
]);

function parseDocument(blk: string): IBlkDocument {
  const parsed = new BlkParserService().parse(blk);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  return parsed.data.document;
}

describe('tonnage-less BLK sources reach the handler', () => {
  it('loads a real battle armor BLK (parser tonnage 0)', () => {
    const document = parseDocument(BA_BLK);
    expect(document.tonnage).toBe(0);

    const result = new BattleArmorUnitHandler().parse(document);

    expect(result).toMatchObject({ success: true });
  });

  it('loads a real conventional infantry BLK (parser tonnage 0)', () => {
    const document = parseDocument(INFANTRY_BLK);
    expect(document.tonnage).toBe(0);

    const result = new InfantryUnitHandler().parse(document);

    expect(result).toMatchObject({ success: true });
  });

  it('still rejects tonnage 0 for a vehicle', () => {
    const result = new VehicleUnitHandler().parse({
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Tank',
      mappedUnitType: UnitType.VEHICLE,
      name: 'Zero Tank',
      model: 'Z-0',
      year: 3050,
      type: 'IS Level 2',
      tonnage: 0,
      armor: [10, 10, 10, 10, 10],
      equipmentByLocation: {},
      rawTags: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toContain('Invalid tonnage: 0');
    }
  });
});
