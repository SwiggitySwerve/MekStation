/**
 * BLK vehicle location model: LargeSupportTank, six-side (SuperHeavy and
 * LargeSupport) armor, dual-turret (Turret 2) and VTOL Rotor armor.
 *
 * Fixtures are pinned mm-data sources; the expected per-location armor is
 * MegaMek's own `Entity.getOArmor(i)` at the pinned commit (see the JSON).
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md
 */

import {
  getBlkParserService,
  resetBlkParserService,
} from '../BlkParserService';
import { resolveBlkVehicleArmor } from '../blkVehicleArmorLayout';
import fixtures from './BlkVehicleLocations.pinned-sources.json';

/** MegaMek names the dual-turret pair Rear Turret / Front Turret (Tank.java). */
const JAVA_TO_KEY: Record<string, string> = {
  'Rear Turret': 'Turret',
  'Front Turret': 'Turret 2',
};

function javaArmorByKey(row: (typeof fixtures.rows)[number]) {
  const expected: Record<string, number> = {};
  row.javaLocationNames.forEach((name, index) => {
    if (index === 0) return; // Body carries no armor
    expected[JAVA_TO_KEY[name] ?? name] = row.javaOArmor[index];
  });
  return expected;
}

describe('BLK vehicle location model', () => {
  const parser = (() => {
    resetBlkParserService();
    return getBlkParserService();
  })();

  describe.each(fixtures.rows)('$path', (row) => {
    it('parses and projects armor per location like MegaMek getOArmor', () => {
      const result = parser.parseByUnitType(row.content);
      expect(result.success).toBe(true);
      if (!result.success || result.result.kind !== 'vehicle') {
        throw new Error('expected a vehicle result');
      }
      expect(result.result.data.armorByLocation).toEqual(javaArmorByKey(row));
    });
  });

  it('parses LargeSupportTank as a support vehicle', () => {
    const row = fixtures.rows.find((r) => r.family === 'LargeSupportTank')!;
    const parsed = parser.parse(row.content);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.document.unitType).toBe('LargeSupportTank');
    expect(parsed.data.document.mappedUnitType).toBe('Support Vehicle');
  });

  it('keeps six-side and dual-turret equipment blocks by their own locations', () => {
    const superHeavyDual = fixtures.rows.find((r) =>
      r.path.includes('Gulltoppr OmniMonitor (A)'),
    )!;
    const parsed = parser.parse(superHeavyDual.content);
    if (!parsed.success) throw new Error('parse failed');
    const equipment = parsed.data.document.equipmentByLocation;
    expect(Object.keys(equipment)).toEqual(
      expect.arrayContaining([
        'Front',
        'Front Right',
        'Front Left',
        'Rear Right',
        'Rear Left',
        'Rear',
        'Rear Turret',
        'Front Turret',
        'Body',
      ]),
    );
  });

  describe('resolveBlkVehicleArmor', () => {
    it('rejects an armor length MegaMek would refuse to load', () => {
      expect(
        resolveBlkVehicleArmor('Tank', 'Tracked', 50, [1, 2, 3]),
      ).toBeUndefined();
      expect(
        resolveBlkVehicleArmor(
          'LargeSupportTank',
          'Tracked',
          150,
          [1, 2, 3, 4, 5],
        ),
      ).toBeUndefined();
      expect(
        resolveBlkVehicleArmor('VTOL', 'VTOL', 20, [1, 2, 3, 4]),
      ).toBeUndefined();
    });

    it.each([
      ['Hover', 50, false],
      ['Hover', 51, true],
      ['Tracked', 100, false],
      ['Tracked', 101, true],
      ['Wheeled', 80, false],
      ['Wheeled', 81, true],
      ['WiGE', 81, true],
      ['Naval', 300, false],
      ['Naval', 301, true],
      ['Submarine', 301, true],
    ])(
      'Tank %s at %d t is six-side=%s (BLKTankFile.java:107-132)',
      (motion, tons, six) => {
        const armor = six ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
        const layout = resolveBlkVehicleArmor('Tank', motion, tons, armor);
        expect(Object.keys(layout ?? {}).includes('Front Right')).toBe(six);
      },
    );
  });
});
