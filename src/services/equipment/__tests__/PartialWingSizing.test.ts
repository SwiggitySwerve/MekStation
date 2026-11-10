import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { TechBase } from '@/types/enums/TechBase';
import {
  fixed,
  multiplyRound,
  validateFormula,
  validateVariableFormulas,
} from '@/types/equipment/VariableEquipment';
import {
  calculateEnhancementSlots,
  calculateEnhancementWeight,
} from '@/utils/equipment/enhancementEquipmentUtils';

import spider from '../../../../public/data/units/battlemechs/5-civil-war/standard/Spider SDR-8X.json';
import butcherbird from '../../../../public/data/units/battlemechs/6-dark-age/advanced/Butcherbird Prime.json';
import { EquipmentCalculatorService } from '../EquipmentCalculatorService';
import { FormulaEvaluator } from '../FormulaEvaluator';
import { VARIABLE_EQUIPMENT_FORMULAS } from '../variableEquipmentFormulas';

const calculator = new EquipmentCalculatorService();

// Same four 48fcb2f64 direct-Java vectors as the service/store regressions.
it.each([
  [50, TechBase.INNER_SPHERE, 3.5],
  [100, TechBase.INNER_SPHERE, 7],
  [50, TechBase.CLAN, 2.5],
  [100, TechBase.CLAN, 5],
] as const)(
  'preserves %st %s wing technology in the enhancement weight caller',
  (tonnage, techBase, weight) => {
    expect(
      calculateEnhancementWeight(
        MovementEnhancementType.PARTIAL_WING,
        tonnage,
        techBase,
        10,
      ),
    ).toBe(weight);
  },
);

it.each([
  [50, TechBase.INNER_SPHERE, 8],
  [100, TechBase.INNER_SPHERE, 8],
  [50, TechBase.CLAN, 6],
  [100, TechBase.CLAN, 6],
] as const)(
  'preserves %st %s wing technology in the enhancement slot caller',
  (tonnage, techBase, criticalSlots) => {
    expect(
      calculateEnhancementSlots(
        MovementEnhancementType.PARTIAL_WING,
        tonnage,
        techBase,
        10,
      ),
    ).toBe(criticalSlots);
  },
);

it.each([
  [spider, 'ISPartialWing', TechBase.INNER_SPHERE, 2.5, 8, 125000],
  [butcherbird, 'CLPartialWing', TechBase.CLAN, 1, 6, 50000],
] as const)(
  'sizes the real $0.chassis wing through its own technology',
  (source, token, techBase, weight, criticalSlots, costCBills) => {
    const cells = Object.values(source.criticalSlots)
      .flat()
      .filter((value) => value === token);
    expect(cells).toHaveLength(criticalSlots);
    expect(
      calculator.calculateProperties('partial-wing', {
        tonnage: source.tonnage,
        techBase,
      }),
    ).toEqual({ weight, criticalSlots, costCBills });
  },
);

// MiscType.java:498-503,995-996,2248-2305 at MegaMek 48fcb2f64.
// Cost uses rounded wing tonnage, not chassis tonnage: ceil(wing tons * 50000).
it.each([
  [50, TechBase.INNER_SPHERE, 3.5, 8, 175000],
  [100, TechBase.INNER_SPHERE, 7, 8, 350000],
  [50, TechBase.CLAN, 2.5, 6, 125000],
  [100, TechBase.CLAN, 5, 6, 250000],
  [55, TechBase.INNER_SPHERE, 4, 8, 200000],
  [55, TechBase.CLAN, 3, 6, 150000],
] as const)(
  'sizes %st %s wings through the one formula record',
  (tonnage, techBase, weight, criticalSlots, costCBills) => {
    expect(
      calculator.calculateProperties('partial-wing', { tonnage, techBase }),
    ).toEqual({ weight, criticalSlots, costCBills });
  },
);

it('keeps IS as the existing record default and never mutates it when selecting Clan', () => {
  calculator.calculateProperties('partial-wing', {
    tonnage: 50,
    techBase: TechBase.CLAN,
  });
  expect(
    calculator.calculateProperties('partial-wing', { tonnage: 50 }),
  ).toEqual({ weight: 3.5, criticalSlots: 8, costCBills: 175000 });
  expect(
    Object.keys(VARIABLE_EQUIPMENT_FORMULAS).filter((id) =>
      id.includes('partial-wing'),
    ),
  ).toEqual(['partial-wing']);
});

it('preserves a record without tech overrides under both technology contexts', () => {
  expect(
    VARIABLE_EQUIPMENT_FORMULAS.supercharger.techBaseOverrides,
  ).toBeUndefined();
  for (const techBase of [TechBase.INNER_SPHERE, TechBase.CLAN]) {
    expect(
      calculator.calculateProperties('supercharger', {
        engineWeight: 10,
        techBase,
      }),
    ).toEqual({ weight: 1, criticalSlots: 1, costCBills: 100000 });
  }
});

it('opts the wing into native gram-truncated rounding without changing ordinary formulas', () => {
  const evaluator = new FormulaEvaluator();
  const ordinary = multiplyRound('tonnage', 0.07, 0.5);
  // Existing generic floating-point behavior is retained for every opt-out.
  expect(evaluator.evaluate(ordinary, { tonnage: 50 })).toBe(4);
  expect(
    evaluator.evaluate(
      { ...ordinary, nativeTonRounding: true },
      { tonnage: 50 },
    ),
  ).toBe(3.5);
});

it('validates tech overrides through the existing formula boundary', () => {
  const wing = VARIABLE_EQUIPMENT_FORMULAS['partial-wing'];
  expect(validateVariableFormulas(wing)).toEqual([]);
  expect(
    validateVariableFormulas({
      ...wing,
      techBaseOverrides: {
        [TechBase.CLAN]: {
          weight: {
            ...multiplyRound('tonnage', 0.05, 1),
            nativeTonRounding: true,
          },
        },
      },
    }),
  ).toContain(
    'Clan.weight: nativeTonRounding requires half-ton MULTIPLY_ROUND',
  );
});

it('rejects technology keys beyond the two equipment tech bases', () => {
  const invalid = {
    ...VARIABLE_EQUIPMENT_FORMULAS['partial-wing'],
    techBaseOverrides: {
      [TechBase.CLAN]: { criticalSlots: fixed(6) },
      MIXED: { criticalSlots: fixed(6) },
    },
  };
  expect(validateVariableFormulas(invalid)).toContain(
    'Unknown formula technology override: MIXED',
  );
});

it('rejects the native rounding option on other formula operations', () => {
  expect(validateFormula({ ...fixed(1), nativeTonRounding: true })).toContain(
    'nativeTonRounding requires half-ton MULTIPLY_ROUND',
  );
});
