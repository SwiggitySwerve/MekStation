/**
 * Support-vehicle handler locations (UL-04b part b): LargeSupportTank six
 * sides, SupportTank turrets, SupportVTOL Rotor, armor per location, equipment
 * blocks at their own locations and the TestSupportVehicle armor limit.
 *
 * Fixtures are pinned mm-data sources; the expected values are the pinned
 * MegaMek runtime's own (`Entity.getOArmor`, `getEquipment()` by location and
 * `TestSupportVehicle.maxArmorFactor`), see the JSON.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md
 */

import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { getSupportVehicleMaxTotalArmor } from '@/utils/construction/vehicle/armor';

import { SupportVehicleUnitHandler } from '../SupportVehicleUnitHandler';
import fixtures from './fixtures/support-handler-locations.pinned-sources.json';

type Row = (typeof fixtures.rows)[number];

/** MegaMek names the dual-turret pair Rear Turret / Front Turret (Tank.java:127-130). */
const JAVA_TO_KEY: Record<string, string> = {
  'Rear Turret': 'Turret',
  'Front Turret': 'Turret 2',
};
const key = (javaName: string) => JAVA_TO_KEY[javaName] ?? javaName;

const parser = new BlkParserService();
const row = (name: string): Row => {
  const found = fixtures.rows.find((r) => r.path.endsWith(`/${name}.blk`));
  if (!found) throw new Error(`missing fixture ${name}`);
  return found;
};
const documentOf = (r: Row): IBlkDocument => {
  const parsed = parser.parse(r.content);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data.document;
};
const load = (document: IBlkDocument) => {
  const handler = new SupportVehicleUnitHandler();
  const loaded = handler.parse(document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return {
    unit: loaded.data.unit,
    validation: handler.validate(loaded.data.unit),
  };
};
const javaArmor = (r: Row) =>
  Object.fromEntries(
    r.javaLocations
      .filter((_, index) => index > 0)
      .map((l) => [key(l.name), l.oArmor]),
  );
const countBy = (locations: readonly string[]) =>
  locations.reduce<Record<string, number>>((acc, loc) => {
    acc[loc] = (acc[loc] ?? 0) + 1;
    return acc;
  }, {});

/** The oracle row's other sources, edited into variants (armor array or equipment blocks). */
const withArmor = (r: Row, armor: number[]): IBlkDocument => ({
  ...documentOf(r),
  armor,
});

describe('support vehicle handler matches pinned MegaMek per location', () => {
  describe.each(fixtures.rows)('$path', (r) => {
    it('armor per location equals getOArmor, six sides and Turret included', () => {
      const { unit } = load(documentOf(r));
      const got = Object.fromEntries(
        Object.entries(unit.armorByLocation).filter(
          ([name, value]) => name !== 'Body' && value !== 0,
        ),
      );
      const expected = Object.fromEntries(
        Object.entries(javaArmor(r)).filter(([, value]) => value !== 0),
      );
      expect(got).toEqual(expected);
      expect(unit.totalArmorPoints).toBe(r.javaTotalOArmor);
    });

    it('equipment per location equals the pinned mounts', () => {
      const { unit } = load(documentOf(r));
      const expected = Object.fromEntries(
        Object.entries(r.javaMountsByLocation).map(([name, n]) => [
          key(name),
          n,
        ]),
      );
      expect(countBy(unit.equipment.map((m) => m.location))).toEqual(expected);
    });

    it('armor limit equals TestSupportVehicle.maxArmorFactor and validity follows it', () => {
      const { unit, validation } = load(documentOf(r));
      expect(unit.maxArmorPoints).toBe(r.javaSvArmorLimit);
      expect(validation.errors).toEqual(
        r.javaTotalOArmor > r.javaSvArmorLimit
          ? [
              `Total armor (${r.javaTotalOArmor}) exceeds maximum (${r.javaSvArmorLimit})`,
            ]
          : [],
      );
    });
  });
});

describe('LargeSupportTank six sides (Oppie O-65)', () => {
  const oppie = row('HMRV (Hazardous Materials Recovery Vehicle) Oppie O-65');

  it('puts the manipulators, searchlights and sprayers on their own sides, not the Body', () => {
    const { unit } = load(documentOf(oppie));
    const at = (location: string) =>
      unit.equipment.filter((m) => m.location === location).map((m) => m.name);
    expect(at('Front Right')).toEqual([
      'Manipulator (Non-Mech/Non-Battle Armor)',
      'Searchlight',
    ]);
    expect(at('Front Left')).toEqual([
      'Manipulator (Non-Mech/Non-Battle Armor)',
      'Searchlight',
    ]);
    expect(at('Rear Right')).toEqual([
      'Manipulator (Non-Mech/Non-Battle Armor)',
      'Tank Sprayer',
    ]);
    expect(at('Rear Left')).toEqual([
      'Manipulator (Non-Mech/Non-Battle Armor)',
      'Tank Sprayer',
    ]);
    expect(at('Body')).toEqual([
      'Paramedic Equipment',
      'Environmental Sealing',
      'SV Chassis Mod [Tractor]',
    ]);
  });

  it('joins every mount to an armor location', () => {
    const { unit } = load(documentOf(oppie));
    const armorLocations = Object.keys(unit.armorByLocation);
    for (const mount of unit.equipment) {
      expect(armorLocations).toContain(mount.location);
    }
  });

  it('keeps Turret 2 armor from the eighth value', () => {
    const { unit } = load(withArmor(oppie, [1, 2, 3, 4, 5, 6, 7, 8]));
    expect(unit.armorByLocation).toMatchObject({
      Front: 1,
      'Front Right': 2,
      'Front Left': 3,
      'Rear Right': 4,
      'Rear Left': 5,
      Rear: 6,
      Turret: 7,
      'Turret 2': 8,
    });
  });
});

describe('SupportTank and SupportVTOL turrets', () => {
  it('a SupportTank keeps Turret 2 armor from the sixth value (BLKSupportTankFile.java:119-126)', () => {
    const { unit } = load(
      withArmor(
        row('Buffel VII Engineering Support Vehicle'),
        [1, 2, 3, 4, 5, 6],
      ),
    );
    expect(unit.armorByLocation).toMatchObject({
      Front: 1,
      Right: 2,
      Left: 3,
      Rear: 4,
      Turret: 5,
      'Turret 2': 6,
    });
  });

  it('Rear Turret and Front Turret blocks load into Turret and Turret 2, in any letter case', () => {
    const base = documentOf(row('Buffel VII Engineering Support Vehicle'));
    const { unit } = load({
      ...base,
      equipmentByLocation: {
        ...base.equipmentByLocation,
        'rear turret Equipment': ['Machine Gun'],
        'FRONT TURRET EQUIPMENT': ['Small Laser'],
      },
    });
    const at = (name: string) =>
      unit.equipment.filter((m) => m.name === name).map((m) => m.location);
    expect(at('Small Laser')).toEqual(['Turret 2']);
    // the Buffel's own two turret machine guns plus the one added
    expect(at('Machine Gun').filter((l) => l === 'Turret')).toHaveLength(3);
  });

  it('a SupportVTOL has Rotor armor and chin Turret armor, and Rotor Equipment sits at the Rotor', () => {
    const lexan = documentOf(row('Lexan Surveillance VTOL'));
    const { unit } = load({
      ...lexan,
      equipmentByLocation: {
        ...lexan.equipmentByLocation,
        'Rotor Equipment': ['ISMastMount'],
      },
    });
    expect(unit.armorByLocation).toMatchObject({
      Front: 5,
      Right: 2,
      Left: 2,
      Rear: 2,
      Rotor: 2,
      Turret: 2,
    });
    expect(
      unit.equipment.filter((m) => m.location === 'Rotor').map((m) => m.name),
    ).toEqual(['ISMastMount']);
  });
});

describe('support armor arrays MegaMek refuses', () => {
  it('names the extra values and creates no "undefined" location (N1)', () => {
    const buffel = row('Buffel VII Engineering Support Vehicle');
    const armor = [1, 2, 3, 4, 5, 6, 7, 8];
    const { unit } = load(withArmor(buffel, armor));
    expect(Object.keys(unit.armorByLocation)).not.toContain('undefined');
    expect(unit.armor).toEqual(armor);
    const handler = new SupportVehicleUnitHandler();
    const loaded = handler.parse(withArmor(buffel, armor));
    if (!loaded.success) throw new Error('parse failed');
    expect(loaded.data.warnings.join('\n')).toMatch(
      /Incorrect armor array length \(8 values\).*7, 8/,
    );
  });

  it('still places a short array in layout order and warns', () => {
    const buffel = row('Buffel VII Engineering Support Vehicle');
    const handler = new SupportVehicleUnitHandler();
    const loaded = handler.parse(withArmor(buffel, [9, 8, 7]));
    if (!loaded.success) throw new Error('parse failed');
    expect(loaded.data.unit.armorByLocation).toMatchObject({
      Front: 9,
      Right: 8,
      Left: 7,
      Rear: 0,
    });
    expect(loaded.data.warnings.join('\n')).toContain(
      'Incorrect armor array length (3 values)',
    );
  });
});

describe('TestSupportVehicle.maxArmorFactor (TestSupportVehicle.java:585-617)', () => {
  // 4 + (int)(weight * factor); factor by SVType from the movement mode
  it.each([
    [GroundMotionType.TRACKED, 70, 144],
    [GroundMotionType.WHEELED, 20, 44],
    [GroundMotionType.HOVER, 40, 44],
    [GroundMotionType.VTOL, 17, 21],
    [GroundMotionType.WIGE, 50, 29],
    [GroundMotionType.RAIL, 120, 64],
    [GroundMotionType.MAGLEV, 120, 64],
    [GroundMotionType.NAVAL, 190, 67],
    [GroundMotionType.SUBMARINE, 200, 70],
    [GroundMotionType.HYDROFOIL, 40, 17],
  ])('%s at %d t is %d points', (motion, tons, limit) => {
    expect(getSupportVehicleMaxTotalArmor(motion, tons)).toBe(limit);
  });

  it('truncates, as the (int) cast does', () => {
    expect(getSupportVehicleMaxTotalArmor(GroundMotionType.NAVAL, 2.5)).toBe(4);
    expect(getSupportVehicleMaxTotalArmor(GroundMotionType.WIGE, 3.5)).toBe(5);
  });

  it('a Large naval support vehicle (over 300 t) uses 0.05 per ton', () => {
    expect(getSupportVehicleMaxTotalArmor(GroundMotionType.NAVAL, 300)).toBe(
      104,
    );
    expect(getSupportVehicleMaxTotalArmor(GroundMotionType.NAVAL, 301)).toBe(
      19,
    );
  });
});
