/**
 * Java-only validity checks (UL-04b part d): the armor tonnage a support
 * vehicle's armor points need (TestEntity.correctArmorOverAllocation), the
 * sub-1 t support minimum, and armor arrays MegaMek refuses to load. Fixtures
 * are pinned mm-data sources; `javaValid` is TestSupportVehicle's own verdict
 * (UL-16 oracle).
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 */

import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { blkVehicleArmorLengthError } from '@/services/conversion/blkVehicleArmorLayout';
import { VehicleTonnageRange } from '@/services/validation/rules/vehicle/VehicleCategoryRules';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { getSupportVehicleBarArmorPoints } from '@/utils/construction/vehicle/armor';

import { SupportVehicleUnitHandler } from '../SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '../VehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';
import locationFixtures from './fixtures/support-handler-locations.pinned-sources.json';
import validityFixtures from './fixtures/support-handler-validity.pinned-sources.json';
import vehicleFixtures from './fixtures/vehicle-handler-locations.pinned-sources.json';

const parser = new BlkParserService();
const documentOf = (content: string): IBlkDocument => {
  const parsed = parser.parse(content);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  return parsed.data.document;
};
const source = <T extends { path: string; content: string }>(
  rows: readonly T[],
  name: string,
): T => {
  const found = rows.find((r) => r.path.endsWith(`/${name}.blk`));
  if (!found) throw new Error(`missing fixture ${name}`);
  return found;
};
const validity = (name: string) => source(validityFixtures.rows, name);
const loadSupport = (document: IBlkDocument) => {
  const handler = new SupportVehicleUnitHandler();
  const loaded = handler.parse(document);
  if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
  return {
    unit: loaded.data.unit,
    validation: handler.validate(loaded.data.unit),
  };
};

describe('armor tonnage (TestEntity.correctArmorOverAllocation)', () => {
  // armor points the armor tonnage buys: floor(rounded weight / weight per
  // point), where the weight is rounded up to a kilogram under 5 t and to a
  // half ton above (RoundWeight.STANDARD), capped by the armor limit
  it.each([
    // the quotient 0.15 / 0.025 is 5.999999999999999 in IEEE doubles, as in Java
    ['BAR 2 tech B, 6 points, small', [6, 2, 1, true, 100], 5],
    ['BAR 10 tech C does not exist', [64, 10, 2, false, 100], 0],
    ['BAR 3 tech F, 33 points, half ton', [33, 3, 5, false, 100], 62],
    ['the armor limit caps the result', [33, 3, 5, false, 40], 40],
    ['BAR 4 does not exist at tech A', [4, 4, 0, true, 100], 0],
  ] as const)('%s', (_label, [points, bar, rating, kg, max], expected) => {
    expect(getSupportVehicleBarArmorPoints(points, bar, rating, kg, max)).toBe(
      expected,
    );
  });

  it.each(['Outrider', 'Trireme Infantry Transport (CS)'])(
    '%s: invalid in Java, invalid here, for the armor tonnage',
    (name) => {
      const row = validity(name);
      expect(row.javaValid).toBe(false);
      const { validation } = loadSupport(documentOf(row.content));
      expect(validation.isValid).toBe(false);
      expect(validation.errors.join('\n')).toMatch(
        /Armor allocated \(\d+\) exceeds the \d+ points its armor tonnage provides/,
      );
    },
  );

  it('reports the points the tonnage buys (Outrider 6 > 5)', () => {
    const { validation } = loadSupport(
      documentOf(validity('Outrider').content),
    );
    expect(validation.errors).toEqual([
      'Armor allocated (6) exceeds the 5 points its armor tonnage provides',
    ]);
  });

  it('leaves Java-valid BAR sources valid', () => {
    const row = validity('Hector Road Train Trailer Module (Liquid)');
    expect(row.javaValid).toBe(true);
    expect(loadSupport(documentOf(row.content)).validation.errors).toEqual([]);
  });

  it('applies only to BAR armor: advanced support armor has its own weights', () => {
    const outrider = documentOf(validity('Outrider').content);
    // 20 is not one of the BAR 2-10 armor type ids (43-51)
    const { validation } = loadSupport({ ...outrider, armorType: 20 });
    expect(validation.errors).toEqual([]);
  });

  it('reads the armor tech rating from the BLK tag, rating A included', () => {
    const outrider = documentOf(validity('Outrider').content);
    const tags = { ...outrider.rawTags, armor_tech_rating: '0' };
    // BAR 2 at tech A weighs 0.040 per point: 6 points need 0.24 t
    const { unit, validation } = loadSupport({ ...outrider, rawTags: tags });
    expect(unit.armorTechRating).toBe(0);
    expect(validation.errors).toEqual([]);
  });

  it('falls back to the structural tech rating when the source has no armor rating', () => {
    const outrider = documentOf(validity('Outrider').content);
    const { armor_tech_rating: _drop, ...tags } = outrider.rawTags;
    const { unit } = loadSupport({
      ...outrider,
      rawTags: { ...tags, structural_tech_rating: '3' },
    });
    expect(unit.armorTechRating).toBe(3);
  });
});

describe('sub-1 t support vehicles (TestSupportVehicle has no 1 t minimum)', () => {
  it.each(['Hoverpod', 'HTE Micro-Copter', 'Whitestreak Jetski'])(
    '%s: Java accepts it; the handler and VAL-VEH-005 accept it',
    (name) => {
      const row = validity(name);
      expect(row.javaValid).toBe(true);
      const { unit, validation } = loadSupport(documentOf(row.content));
      expect(unit.tonnage).toBe(row.javaTonnage);
      expect(validation.errors).toEqual([]);
      const result = VehicleTonnageRange.validate({
        unit: {
          id: 'x',
          name,
          unitType: UnitType.SUPPORT_VEHICLE,
          weight: unit.tonnage,
          motiveSystem: { type: unit.motionType },
        },
        unitType: UnitType.SUPPORT_VEHICLE,
        options: {},
        cache: new Map(),
      } as never);
      expect(result.errors).toEqual([]);
    },
  );
});

describe('armor arrays MegaMek refuses are validation errors, not just warnings', () => {
  const buffel = documentOf(
    source(locationFixtures.rows, 'Buffel VII Engineering Support Vehicle')
      .content,
  );
  const ranger = documentOf(
    source(vehicleFixtures.rows, 'Ranger Armored Fighting Vehicle VV22')
      .content,
  );
  const skadi = documentOf(
    source(vehicleFixtures.rows, 'Skadi Swift Attack VTOL').content,
  );
  const message = (n: number) => `Incorrect armor array length (${n} values)`;

  it('support: oversize and undersize arrays', () => {
    for (const armor of [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [9, 8, 7],
    ]) {
      const { validation } = loadSupport({ ...buffel, armor });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.join('\n')).toContain(message(armor.length));
    }
  });

  it('combat vehicle: oversize array', () => {
    const armor = [...ranger.armor, 7, 8, 9];
    const handler = new VehicleUnitHandler();
    const loaded = handler.parse({ ...ranger, armor });
    if (!loaded.success) throw new Error('parse failed');
    const validation = handler.validate(loaded.data.unit);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.join('\n')).toContain(message(armor.length));
  });

  it('VTOL: oversize array', () => {
    const armor = [...skadi.armor, 7, 8];
    const handler = new VTOLUnitHandler();
    const loaded = handler.parse({ ...skadi, armor });
    if (!loaded.success) throw new Error('parse failed');
    const validation = handler.validate(loaded.data.unit);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.join('\n')).toContain(message(armor.length));
  });

  it('names no error for a unit type without a layout', () => {
    expect(blkVehicleArmorLengthError('Gizmo', 'Tracked', 50, [1])).toBe(
      undefined,
    );
    expect(blkVehicleArmorLengthError('Tank', 'Tracked', 50, [1])).toBe(
      'Incorrect armor array length (1 values): MegaMek refuses to load it',
    );
  });

  it('accepted lengths raise no layout error', () => {
    expect(loadSupport(buffel).validation.errors.join('\n')).not.toContain(
      'Incorrect armor array length',
    );
    const handler = new VehicleUnitHandler();
    const loaded = handler.parse(ranger);
    if (!loaded.success) throw new Error('parse failed');
    expect(handler.validate(loaded.data.unit).errors.join('\n')).not.toContain(
      'Incorrect armor array length',
    );
  });
});
