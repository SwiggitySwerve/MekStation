/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import {
  createDefaultProtoMechState,
  computeProtoMechBVFromState,
} from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { computeProtoEngineWeight } from '@/utils/construction/protomech';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

jest.mock('@/utils/construction/protomech/protoMechBV', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/construction/protomech/protoMechBV')
  >('@/utils/construction/protomech/protoMechBV');
  return {
    ...actual,
    calculateProtoMechBV: jest.fn(actual.calculateProtoMechBV),
  };
});

function load(tonnage: number, walk: number, chassis = 'Biped') {
  const tags = {
    UnitType: 'ProtoMek',
    Name: 'Mass probe',
    Model: 'A',
    year: '3060',
    type: 'Clan Level 2',
    Tonnage: String(tonnage),
    motion_type: chassis,
    cruiseMP: String(walk),
    armor: '0\n0\n0\n0\n0',
  };
  const parsed = new BlkParserService().parse(
    Object.entries(tags)
      .map(([k, v]) => `<${k}>\n${v}\n</${k}>`)
      .join('\n'),
  );
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const result = new ProtoMechUnitHandler().parse(parsed.data.document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return result.data.unit;
}

describe('Pinned ProtoMech normal engine mass', () => {
  // Actual Engine.getWeightEngine(ProtoMek) observations at MegaMek48fcb2f6.
  it.each([
    [0, 0],
    [1, 0.025],
    [3, 0.075],
    [6, 0.15],
    [21, 0.525],
    [28, 0.7],
    [39, 0.975],
    [40, 1],
    [41, 1],
    [45, 1],
    [46, 1.5],
    [60, 1.5],
    [61, 2],
    [99, 3],
    [101, 3.5],
    [400, 52.5],
    [415, 66.5],
    [500, 462.5],
  ])('rating %s weighs %s tons', (rating, weight) => {
    expect(computeProtoEngineWeight(rating)).toBe(weight);
  });

  it.each([
    -20,
    -1,
    0.5,
    500.5,
    501,
    Number.MAX_SAFE_INTEGER,
    NaN,
    Infinity,
    -Infinity,
  ])('reports unsupported rating %s as unavailable', (rating) => {
    expect(computeProtoEngineWeight(rating)).toBeNull();
  });

  it.each([
    [5, 4, 'Biped', 30, 0.75],
    [9, 4, 'Biped', 55, 1.5],
    [4, 6, 'Quad', 28, 0.7],
    [5, 0, 'Biped', 0, 0],
  ])(
    'loads mass from %s tons, walk %s, %s',
    (tonnage, walk, chassis, rating, weight) => {
      const unit = load(Number(tonnage), Number(walk), String(chassis));
      expect(unit).toMatchObject({
        engineRating: rating,
        engineWeight: weight,
      });
      new ProtoMechUnitHandler().calculateBV(unit);
      expect(
        jest.mocked(calculateProtoMechBV).mock.lastCall?.[0],
      ).toMatchObject({ engineRating: rating, engineWeight: weight });
    },
  );

  it.each([
    [2, 0, 'Quad', -4],
    [100, 10, 'Biped', 1500],
  ])(
    'retains an invalid source rating from %s tons / walk %s',
    (tonnage, walk, chassis, rating) => {
      const unit = load(Number(tonnage), Number(walk), String(chassis));
      expect(unit).toMatchObject({
        engineRating: rating,
        engineWeight: null,
        isValid: false,
      });
      expect(unit.validationErrors).toEqual(
        expect.arrayContaining([expect.stringMatching(/engine rating.*mass/i)]),
      );
      expect(() => new ProtoMechUnitHandler().calculateBV(unit)).not.toThrow();
      expect(
        jest.mocked(calculateProtoMechBV).mock.lastCall?.[0].engineWeight,
      ).toBeNull();
    },
  );

  it('uses current store ratings without persisting derived mass or disrupting edits', () => {
    const initial = createDefaultProtoMechState({
      id: 'mass-store',
      tonnage: 5,
    });
    const store = createProtoMechStore(initial);
    store.getState().setCruiseMP(6);
    computeProtoMechBVFromState(store.getState());
    expect(jest.mocked(calculateProtoMechBV).mock.lastCall?.[0]).toMatchObject({
      engineRating: 45,
      engineWeight: 1,
    });
    expect(store.getState()).not.toHaveProperty('engineWeight');
    const invalid = createProtoMechStore({
      ...initial,
      engineRating: -4,
      chassisType: ProtoChassis.QUAD,
      tonnage: 2,
      walkMP: 0,
      cruiseMP: 0,
    });
    expect(
      jest.mocked(calculateProtoMechBV).mock.lastCall?.[0].engineWeight,
    ).toBeNull();
    expect(() => invalid.getState().setName('Retained design')).not.toThrow();
    expect(invalid.getState().engineRating).toBe(-4);
  });
});
