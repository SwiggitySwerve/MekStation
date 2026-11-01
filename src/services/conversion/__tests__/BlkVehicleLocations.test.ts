/**
 * BLK vehicle location model: LargeSupportTank, six-side (SuperHeavy and
 * LargeSupport) armor, dual-turret (Turret 2) and VTOL Rotor armor.
 *
 * Fixtures are pinned mm-data sources; the expected per-location armor is
 * MegaMek's own `Entity.getOArmor(i)` at the pinned commit (see the JSON).
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md
 */

import {
  BLK_SUPERHEAVY_ARMOR_LOCATIONS,
  BLK_VEHICLE_ARMOR_LOCATIONS,
} from '@/types/formats/BlkFormat';

import {
  getBlkParserService,
  resetBlkParserService,
} from '../BlkParserService';
import {
  blkEquipmentBlockLocation,
  isSuperHeavyTank,
  resolveBlkVehicleArmor,
} from '../blkVehicleArmorLayout';
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

    it.each(['LargeSupportTank', 'Tank'])(
      'maps a %s six-side array position by position (armor[i] is location i + 1)',
      (unitType) => {
        // Distinct values pin the left/right order, which no corpus unit can:
        // every pinned six-side source has equal left and right armor.
        // SuperHeavyTank.java:66-70 / LargeSupportTank.java:65-69: Front Right
        // 2, Front Left 3, Rear Right 4, Rear Left 5.
        expect(
          resolveBlkVehicleArmor(
            unitType,
            'Tracked',
            150,
            [1, 2, 3, 4, 5, 6, 7, 8],
          ),
        ).toEqual({
          Front: 1,
          'Front Right': 2,
          'Front Left': 3,
          'Rear Right': 4,
          'Rear Left': 5,
          Rear: 6,
          Turret: 7,
          'Turret 2': 8,
        });
      },
    );

    it('lays out a 4-value Tank without turrets and a 5-value VTOL without a chin turret', () => {
      expect(
        resolveBlkVehicleArmor('Tank', 'Tracked', 50, [1, 2, 3, 4]),
      ).toEqual({ Front: 1, Right: 2, Left: 3, Rear: 4 });
      expect(
        resolveBlkVehicleArmor('VTOL', 'VTOL', 20, [1, 2, 3, 4, 5]),
      ).toEqual({ Front: 1, Right: 2, Left: 3, Rear: 4, Rotor: 5 });
    });

    it('rejects an armor length above the maximum MegaMek accepts', () => {
      // BLKTankFile.java:182,188 (4-6 / 6-8), BLKLargeSupportTankFile.java:124,
      // BLKVTOLFile.java:129.
      expect(
        resolveBlkVehicleArmor('Tank', 'Tracked', 50, [1, 2, 3, 4, 5, 6, 7]),
      ).toBeUndefined();
      expect(
        resolveBlkVehicleArmor(
          'Tank',
          'Tracked',
          150,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ),
      ).toBeUndefined();
      expect(
        resolveBlkVehicleArmor(
          'LargeSupportTank',
          'Tracked',
          150,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
        ),
      ).toBeUndefined();
      expect(
        resolveBlkVehicleArmor('VTOL', 'VTOL', 20, [1, 2, 3, 4, 5, 6, 7]),
      ).toBeUndefined();
    });

    it.each([
      ['WiGE', 80, false],
      ['Glider', 81, true],
      ['Submarine', 300, false],
      ['Hydrofoil', 150, false],
    ])(
      'isSuperHeavyTank(%s, %d t) is %s (BLKTankFile.java:94-123)',
      (motion, tons, expected) => {
        expect(isSuperHeavyTank(motion, tons)).toBe(expected);
      },
    );

    it('names the dual-turret pair Turret / Turret 2 in armor and Rear Turret / Front Turret in equipment (Tank.java:127-130)', () => {
      expect(blkEquipmentBlockLocation('Rear Turret')).toBe('Turret');
      expect(blkEquipmentBlockLocation('Front Turret')).toBe('Turret 2');
      expect(blkEquipmentBlockLocation('Rear')).toBe('Rear');
      expect(blkEquipmentBlockLocation('Front Right')).toBe('Front Right');
    });

    it.each([
      ['rear turret', 'Turret'],
      ['REAR TURRET', 'Turret'],
      ['front turret', 'Turret 2'],
      ['Front TURRET', 'Turret 2'],
    ])(
      'finds the %s block in any letter case, as MegaMek does (BuildingBlock.java:148,184)',
      (block, location) => {
        expect(blkEquipmentBlockLocation(block)).toBe(location);
      },
    );

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
      'Tank %s at %d t is six-side=%s (BLKTankFile.java:94-123)',
      (motion, tons, six) => {
        const armor = six ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
        const layout = resolveBlkVehicleArmor('Tank', motion, tons, armor);
        expect(Object.keys(layout ?? {})).toEqual(
          six
            ? BLK_SUPERHEAVY_ARMOR_LOCATIONS.slice(0, 6)
            : BLK_VEHICLE_ARMOR_LOCATIONS.slice(0, 4),
        );
      },
    );

    it.each(['Hydrofoil', 'Surface'])(
      'lays out a %s BLK like a Tank, as MegaMek loads it (MekFileParser.java:233)',
      (unitType) => {
        expect(
          resolveBlkVehicleArmor(unitType, 'Hydrofoil', 40, [1, 2, 3, 4, 5, 6]),
        ).toEqual({
          Front: 1,
          Right: 2,
          Left: 3,
          Rear: 4,
          Turret: 5,
          'Turret 2': 6,
        });
        // a Surface BLK scales to SuperHeavy by its motion type like any Tank
        expect(
          Object.keys(
            resolveBlkVehicleArmor(
              unitType,
              'Wheeled',
              90,
              [1, 2, 3, 4, 5, 6],
            ) ?? {},
          ),
        ).toEqual(BLK_SUPERHEAVY_ARMOR_LOCATIONS.slice(0, 6));
      },
    );

    it('lays out a Naval BLK like a Tank, as MegaMek loads it (MekFileParser.java:233)', () => {
      expect(
        Object.keys(
          resolveBlkVehicleArmor('Naval', 'Naval', 100, [1, 2, 3, 4]) ?? {},
        ),
      ).toEqual(BLK_VEHICLE_ARMOR_LOCATIONS.slice(0, 4));
    });
  });
});
