/**
 * Combat-vehicle handler locations (UL-04b part 1): SuperHeavy six-side and
 * dual-turret armor, equipment blocks at their own locations, the SuperHeavy
 * predicate, the TestTank armor limit and VTOL Rotor / Turret equipment.
 *
 * Fixtures are pinned mm-data sources; the expected values are the pinned
 * MegaMek runtime's own (`Entity.getOArmor`, `getEquipment()` by location,
 * `isSuperHeavy`, and the `TestTank.java:338` armor limit), see the JSON.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md
 */

import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { isSuperHeavyTank } from '@/services/conversion/blkVehicleArmorLayout';
import { BLK_EQUIPMENT_BLOCK_TAGS } from '@/types/formats/BlkFormat';

import { VehicleUnitHandler } from '../VehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';
import fixtures from './fixtures/vehicle-handler-locations.pinned-sources.json';

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
const loadTank = (document: IBlkDocument) => {
  const handler = new VehicleUnitHandler();
  const loaded = handler.parse(document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return {
    unit: loaded.data.unit,
    validation: handler.validate(loaded.data.unit),
  };
};
const loadVtol = (document: IBlkDocument) => {
  const handler = new VTOLUnitHandler();
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

const TANKS = fixtures.rows.filter((r) => r.family !== 'VTOL');
const VTOLS = fixtures.rows.filter((r) => r.family === 'VTOL');

describe('combat vehicle handler matches pinned MegaMek per location', () => {
  describe.each(TANKS)('$path', (r) => {
    it('armor per location equals getOArmor, Turret 2 and six sides included', () => {
      const { unit } = loadTank(documentOf(r));
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
      const { unit } = loadTank(documentOf(r));
      const expected = Object.fromEntries(
        Object.entries(r.javaMountsByLocation).map(([name, n]) => [
          key(name),
          n,
        ]),
      );
      expect(countBy(unit.equipment.map((m) => m.location))).toEqual(expected);
    });

    it('SuperHeavy flag and armor limit equal MegaMek', () => {
      const { unit, validation } = loadTank(documentOf(r));
      expect(unit.isSuperheavy).toBe(r.javaSuperHeavy);
      expect(unit.maxArmorPoints).toBe(r.javaArmorLimit);
      expect(validation.errors).toEqual([]);
    });
  });

  describe.each(VTOLS)('$path', (r) => {
    it('armor, equipment and armor limit equal MegaMek', () => {
      const { unit, validation } = loadVtol(documentOf(r));
      expect(unit.totalArmorPoints).toBe(r.javaTotalOArmor);
      expect(unit.armorByLocation.Rotor).toBe(javaArmor(r).Rotor);
      expect(unit.armorByLocation.Turret).toBe(javaArmor(r).Turret ?? 0);
      expect(unit.maxArmorPoints).toBe(r.javaArmorLimit);
      expect(countBy(unit.equipment.map((m) => m.location))).toEqual(
        r.javaMountsByLocation,
      );
      expect(validation.errors).toEqual([]);
    });
  });
});

describe('dual turret', () => {
  it('Rear Turret items sit in Turret and are not rear-facing (Ranger VV22 Magshots)', () => {
    const { unit } = loadTank(
      documentOf(row('Ranger Armored Fighting Vehicle VV22')),
    );
    const magshots = unit.equipment.filter(
      (m) => m.equipmentId === 'ISMagshotGR',
    );
    expect(magshots).toHaveLength(8);
    expect(magshots.every((m) => m.location === 'Turret')).toBe(true);
    expect(magshots.every((m) => !m.isRearMounted && m.isTurretMounted)).toBe(
      true,
    );
    const lasers = unit.equipment.filter(
      (m) => m.equipmentId === 'ISERSmallLaser',
    );
    expect(lasers.map((m) => m.location)).toEqual(['Turret 2', 'Turret 2']);
  });

  it('keeps Turret 2 armor and joins equipment to armor by location', () => {
    const { unit } = loadTank(
      documentOf(row('Ranger Armored Fighting Vehicle VV22')),
    );
    expect(unit.armorByLocation['Turret 2']).toBe(19);
    expect(unit.armorByLocation.Turret).toBe(32);
    const armorLocations = Object.keys(unit.armorByLocation);
    for (const mount of unit.equipment) {
      expect(armorLocations).toContain(mount.location);
    }
  });

  it('a SuperHeavy dual turret (Gulltoppr A) joins the same way', () => {
    const { unit } = loadTank(documentOf(row('Gulltoppr OmniMonitor (A)')));
    expect(unit.armorByLocation['Turret 2']).toBe(66);
    expect(unit.armorByLocation.Turret).toBe(50);
    const armorLocations = Object.keys(unit.armorByLocation);
    for (const mount of unit.equipment) {
      expect(armorLocations).toContain(mount.location);
    }
    expect(
      unit.equipment.filter((m) => m.location === 'Turret 2'),
    ).toHaveLength(6);
  });

  it('a dual-turret vehicle has a turret even though no block is called Turret', () => {
    const { unit } = loadTank(
      documentOf(row('Zephyros Infantry Support Vehicle (Dual Turret)')),
    );
    expect(unit.turret?.type).toBe('Dual');
  });
});

describe('SuperHeavy predicate (BLKTankFile.java:94-123)', () => {
  it('has no limit for a motion type MegaMek does not scale', () => {
    expect(isSuperHeavyTank('VTOL', 100)).toBe(false);
    expect(isSuperHeavyTank(undefined, 150)).toBe(false);
  });

  it('a 140 t Moray submarine is an ordinary tank and loads without a complaint', () => {
    const { unit, validation } = loadTank(
      documentOf(row('Moray Heavy Attack Submarine (Original)')),
    );
    expect(unit.tonnage).toBe(140);
    expect(unit.isSuperheavy).toBe(false);
    expect(validation.errors).toEqual([]);
  });

  it('a 90 t Hexareme hovercraft is SuperHeavy and keeps its six sides', () => {
    const { unit } = loadTank(documentOf(row('Hexareme HQ Hovercraft')));
    expect(unit.isSuperheavy).toBe(true);
    expect(unit.armorByLocation['Front Right']).toBeGreaterThan(0);
    expect(unit.armorByLocation['Rear Left']).toBeGreaterThan(0);
  });
});

describe('armor limit (TestTank.java:338, (int)(tonnage * 7 / 2 + 40))', () => {
  const puma = row('Puma Assault Tank PAT-001'); // 95 t, 184 points, limit 372
  const withFront = (front: number): IBlkDocument => {
    const document = documentOf(puma);
    const armor = [...document.armor];
    armor[0] = front;
    return { ...document, armor };
  };

  it('accepts a canonical tank that the old tonnage * 3.5 cap rejected (MASH Truck)', () => {
    const { unit, validation } = loadTank(
      documentOf(row('MASH Truck (Small)')),
    );
    expect(unit.totalArmorPoints).toBe(56);
    expect(unit.maxArmorPoints).toBe(92);
    expect(validation.errors).toEqual([]);
  });

  it('accepts exactly the limit and rejects one point over', () => {
    const base = documentOf(puma);
    const baseFront = base.armor[0];
    const atLimit = loadTank(withFront(baseFront + (372 - 184)));
    expect(atLimit.unit.totalArmorPoints).toBe(372);
    expect(atLimit.validation.errors).toEqual([]);

    const over = loadTank(withFront(baseFront + (372 - 184) + 1));
    expect(over.validation.errors).toEqual([
      'Total armor (373) exceeds maximum (372)',
    ]);
  });
});

describe('VTOL', () => {
  it('lists Rotor Equipment as an equipment block', () => {
    expect(BLK_EQUIPMENT_BLOCK_TAGS).toContain('Rotor Equipment');
  });

  it('locates rotor equipment at the Rotor (Donar probe and mast mount)', () => {
    const document = documentOf(
      row('Donar Assault Helicopter (Close Support)'),
    );
    expect(document.equipmentByLocation.Rotor).toEqual([
      'CLActiveProbe',
      'ISMastMount',
    ]);
    const { unit } = loadVtol(document);
    const rotor = unit.equipment.filter((m) => m.location === 'Rotor');
    expect(rotor.map((m) => m.equipmentId)).toEqual([
      'CLActiveProbe',
      'ISMastMount',
    ]);
  });

  it('locates chin-turret equipment at the Turret, not the Body (Skadi)', () => {
    const { unit } = loadVtol(documentOf(row('Skadi Swift Attack VTOL')));
    const turret = unit.equipment.filter((m) => m.location === 'Turret');
    expect(turret.map((m) => m.equipmentId)).toEqual(['CLUltraAC10']);
    expect(turret[0].isTurretMounted).toBe(true);
  });

  it('applies the same armor limit as tanks', () => {
    const skadi = documentOf(row('Skadi Swift Attack VTOL')); // 30 t, 86 points, limit 145
    const front = skadi.armor[0];
    const atLimit = loadVtol({
      ...skadi,
      armor: [front + (145 - 86), ...skadi.armor.slice(1)],
    });
    expect(atLimit.validation.errors).toEqual([]);
    const over = loadVtol({
      ...skadi,
      armor: [front + (145 - 86) + 1, ...skadi.armor.slice(1)],
    });
    expect(over.validation.errors).toEqual([
      'Total armor (146) exceeds maximum (145)',
    ]);
  });
});
