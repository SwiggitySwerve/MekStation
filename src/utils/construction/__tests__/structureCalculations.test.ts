import { renderHook } from '@testing-library/react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { createDefaultComponentSelections } from '@/stores/useMultiUnitStore.helpers';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  calculateInternalStructure,
  calculateStructuralWeight as constructionWeight,
} from '@/utils/construction/constructionRules';
import { calculateStructureWeight } from '@/utils/construction/structureCalculations';
import {
  calculateStructuralWeight as validationWeight,
  getStructureWeight,
} from '@/utils/validation/weightValidationUtils';

const tonnages = [10, 15, 35, 50, 55, 100, 105, 200];
const cases: readonly [InternalStructureType, readonly number[]][] = [
  [InternalStructureType.STANDARD, [1, 1.5, 3.5, 5, 5.5, 10, 10.5, 20]],
  [InternalStructureType.ENDO_STEEL_IS, [0.5, 1, 2, 2.5, 3, 5, 5.5, 10]],
  [InternalStructureType.ENDO_STEEL_CLAN, [0.5, 1, 2, 2.5, 3, 5, 5.5, 10]],
  [InternalStructureType.ENDO_COMPOSITE, [1, 1.5, 3, 4, 4.5, 7.5, 8, 15]],
  [InternalStructureType.REINFORCED, [2, 3, 7, 10, 11, 20, 21, 40]],
  [InternalStructureType.COMPOSITE, [0.5, 1, 2, 2.5, 3, 5, 5.5, 10]],
  [InternalStructureType.INDUSTRIAL, [2, 3, 7, 10, 11, 20, 21, 40]],
];

function measure(
  tonnage: number,
  internalStructureType: InternalStructureType,
) {
  const selections = {
    ...createDefaultComponentSelections(tonnage),
    engineRating: 200,
    internalStructureType,
  };
  const { result, unmount } = renderHook(() =>
    useUnitCalculations(tonnage, selections),
  );
  const hookWeight = result.current.structureWeight;
  unmount();
  return {
    hookWeight,
    step: calculateInternalStructure(tonnage, internalStructureType),
    lookup: getStructureWeight(tonnage, internalStructureType),
    validation: validationWeight({ ...selections, tonnage, armorTonnage: 0 }),
    construction: constructionWeight({
      ...selections,
      tonnage,
      totalArmorPoints: 0,
      totalHeatSinks: 10,
      jumpMP: 0,
    }),
  };
}

describe('structure mass caller characterization', () => {
  it.each(cases)(
    'preserves %s at ordinary and superheavy tonnages',
    (type, weights) => {
      for (const [index, tonnage] of tonnages.entries()) {
        const actual = measure(tonnage, type);
        const standard = measure(tonnage, InternalStructureType.STANDARD);
        const expected = weights[index];
        const delta = expected - standard.lookup;
        expect(actual.hookWeight).toBe(expected);
        expect(calculateStructureWeight(tonnage, type)).toBe(expected);
        expect(actual.lookup).toBe(expected);
        expect(actual.step.weight).toBe(expected);
        expect(actual.step.isValid).toBe(true);
        expect(actual.validation).toBe(standard.validation + delta);
        expect(actual.construction).toBe(standard.construction + delta);
      }
    },
  );

  it('preserves the step rejection and other callers’ Standard fallback', () => {
    const unknown = 'Unknown structure' as InternalStructureType;
    const actual = measure(50, unknown);
    const standard = measure(50, InternalStructureType.STANDARD);
    expect(actual.step).toMatchObject({
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors: ['Unknown internal structure type: Unknown structure'],
    });
    expect(actual.hookWeight).toBe(5);
    expect(calculateStructureWeight(50, unknown)).toBe(5);
    expect(actual.lookup).toBe(5);
    expect(actual.validation).toBe(standard.validation);
    expect(actual.construction).toBe(standard.construction);
  });
});
