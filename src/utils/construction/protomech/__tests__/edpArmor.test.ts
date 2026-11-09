import { BlkParserService } from '@/services/conversion/BlkParserService';
import nativeSources from '@/services/units/handlers/__tests__/fixtures/source-load-legality.json';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import {
  getProtoArmorDefinition,
  getProtoArmorName,
  PROTO_ARMOR_CODES,
} from '../armorType';
import { getProtoArmorSlotErrors } from '../mainGun';
import { computeProtoArmorWeight, computeProtoWeight } from '../weight';
import oracle from './fixtures/edp-armor-java.json';

const handler = new ProtoMechUnitHandler();
const parser = new BlkParserService();
const edp = PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE;

describe('pinned ProtoMech armor identity and allocated mass', () => {
  it.each([undefined, 0, 42])(
    'retains Standard identity for legacy code %s',
    (code) => {
      expect(getProtoArmorName(code)).toBe('Standard');
      expect(computeProtoArmorWeight(3, code)).toBeCloseTo(0.15, 12);
    },
  );

  it('represents EDP as its own armor, retaining the pinned component rules', () => {
    expect(getProtoArmorName(edp)).toBe('Electric Discharge ProtoMech');
    expect(getProtoArmorDefinition(edp)).toMatchObject({
      code: 18,
      torsoSlots: 1,
      weightPerPoint: 0.075,
    });
    expect(getProtoArmorDefinition(99)).toBeUndefined();
    expect(computeProtoArmorWeight(3, 99)).toBeNull();
  });

  it.each([1, 3, 31])(
    'matches Java without half-ton rounding at %s EDP points',
    (points) => {
      const expected = oracle.rows
        .find((row) => row.armorCode === 18)
        ?.armorExamples?.find((row) => row.points === points);
      expect(expected).toBeDefined();
      expect(computeProtoArmorWeight(points, edp)).toBe(expected?.allocated);
    },
  );
});

describe('torso armor slot is counted once, separately from its equipment mount', () => {
  const mount = { equipmentId: 'CLEDPArmor', location: L.TORSO };
  const laser = { equipmentId: 'CLERMicroLaser', location: L.TORSO };
  it('reserves the slot even when an EDP mount is absent', () => {
    expect(getProtoArmorSlotErrors(5, false, edp, [laser, laser])).toEqual([
      'Exceeds 2 slot limit in Torso (3 mounted).',
    ]);
  });
  it('does not count the existing armor mount twice', () => {
    expect(getProtoArmorSlotErrors(5, false, edp, [mount, laser])).toEqual([]);
    expect(
      getProtoArmorSlotErrors(5, false, edp, [mount, laser, laser]),
    ).toHaveLength(1);
  });
  it('uses quad/ultraheavy capacities and leaves zero-slot body equipment alone', () => {
    const body = { equipmentId: 'CLMyomerBooster', location: L.TORSO };
    expect(
      getProtoArmorSlotErrors(7, true, edp, [mount, laser, laser, laser, body]),
    ).toEqual([]);
    expect(
      getProtoArmorSlotErrors(10, true, edp, [
        mount,
        ...Array.from({ length: 5 }, () => laser),
      ]),
    ).toEqual([]);
  });
});

describe('all 86 canonical ProtoMechs match actual pinned Java BV totals', () => {
  it.each(oracle.rows)('$path', (reference) => {
    const source = nativeSources.nativeValidity.rows.find(
      (row) => row.path === reference.path,
    );
    if (!source) throw new Error(`Missing pinned source: ${reference.path}`);
    const parsed = parser.parse(source.content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const loaded = handler.parse(parsed.data.document);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const unit = loaded.data.unit;
    expect(handler.calculateBV(unit)).toBe(reference.totalBV);
    const dispatched = calculateBattleValueForUnit(unit);
    expect(dispatched?.kind).toBe('protomech');
    if (dispatched?.kind !== 'protomech') throw new Error('Wrong BV dispatch');
    expect(dispatched.breakdown.final).toBe(reference.totalBV);
    if (reference.armorCode === edp) {
      expect(
        computeProtoArmorWeight(reference.armorPoints, unit.armorType),
      ).toBe(reference.armorWeight);
      expect(computeProtoWeight(unit)).toEqual({
        total: reference.totalWeight,
        missingEquipment: [],
      });
      expect(
        getProtoArmorSlotErrors(
          unit.weightPerUnit,
          reference.quad,
          unit.armorType,
          unit.equipment,
        ),
      ).toEqual([]);
      expect(handler.validate(unit).isValid).toBe(reference.correctEntity);
      if (!reference.model) {
        const overweight = {
          ...unit,
          armorByLocation: {
            ...unit.armorByLocation,
            [L.TORSO]: unit.armorByLocation[L.TORSO] + 1,
          },
        };
        expect(handler.validate(overweight).errors).toContain(
          'Weight: 7075.0 kg is greater than 7000.0 kg',
        );
      }
      for (const example of reference.armorExamples ?? []) {
        const armorByLocation = {
          ...unit.armorByLocation,
          [L.HEAD]: 0,
          [L.TORSO]: example.points,
          [L.LEGS]: 0,
        };
        expect(computeProtoWeight({ ...unit, armorByLocation }).total).toBe(
          example.total,
        );
      }
    }
  });
});
