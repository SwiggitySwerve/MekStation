/**
 * Formula Evaluator Tests
 *
 * Tests for the formula evaluation engine.
 * This is a pure service with no external dependencies.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import {
  FormulaEvaluator,
  FormulaContext,
} from '@/services/equipment/FormulaEvaluator';
import {
  fixed,
  ceilDivide,
  floorDivide,
  roundDivide,
  multiply,
  multiplyRound,
  equalsWeight,
  equalsField,
  min,
  max,
  plus,
  IFormula,
} from '@/types/equipment/VariableEquipment';

describe('FormulaEvaluator', () => {
  let evaluator: FormulaEvaluator;

  beforeEach(() => {
    evaluator = new FormulaEvaluator();
  });

  // ============================================================================
  // FIXED Formula
  // ============================================================================
  describe('FIXED formula', () => {
    it('should return the fixed value', () => {
      expect(evaluator.evaluate(fixed(5), {})).toBe(5);
      expect(evaluator.evaluate(fixed(0), {})).toBe(0);
      expect(evaluator.evaluate(fixed(100), {})).toBe(100);
    });

    it('should support decimal values', () => {
      expect(evaluator.evaluate(fixed(0.5), {})).toBe(0.5);
      expect(evaluator.evaluate(fixed(3.75), {})).toBe(3.75);
    });

    it('should throw for missing value', () => {
      expect(() => evaluator.evaluate({ type: 'FIXED' }, {})).toThrow();
    });
  });

  // ============================================================================
  // CEIL_DIVIDE Formula
  // ============================================================================
  describe('CEIL_DIVIDE formula', () => {
    // Targeting Computer IS: ceil(directFireWeaponTonnage / 4)
    describe('Targeting Computer calculation', () => {
      const formula = ceilDivide('directFireWeaponTonnage', 4);

      it.each([
        [4, 1], // ceil(4/4) = 1
        [5, 2], // ceil(5/4) = 2
        [8, 2], // ceil(8/4) = 2
        [10, 3], // ceil(10/4) = 3
        [12, 3], // ceil(12/4) = 3
        [16, 4], // ceil(16/4) = 4
      ])('with %d tons weapons = %d tons TC', (weapons, expected) => {
        expect(
          evaluator.evaluate(formula, { directFireWeaponTonnage: weapons }),
        ).toBe(expected);
      });
    });

    // Hatchet: ceil(tonnage / 15)
    describe('Hatchet weight calculation', () => {
      const formula = ceilDivide('tonnage', 15);

      it.each([
        [20, 2], // ceil(20/15) = 2
        [30, 2], // ceil(30/15) = 2
        [45, 3], // ceil(45/15) = 3
        [50, 4], // ceil(50/15) = 4
        [75, 5], // ceil(75/15) = 5
        [100, 7], // ceil(100/15) = 7
      ])('%d ton mech = %d ton hatchet', (tonnage, expected) => {
        expect(evaluator.evaluate(formula, { tonnage })).toBe(expected);
      });
    });

    it('should throw for missing field', () => {
      const formula = ceilDivide('tonnage', 15);
      expect(() => evaluator.evaluate(formula, {})).toThrow(
        'Missing required context field',
      );
    });

    it('should throw for zero divisor', () => {
      expect(() =>
        evaluator.evaluate(
          { type: 'CEIL_DIVIDE', field: 'tonnage', divisor: 0 },
          { tonnage: 50 },
        ),
      ).toThrow();
    });
  });

  // ============================================================================
  // FLOOR_DIVIDE Formula
  // ============================================================================
  describe('FLOOR_DIVIDE formula', () => {
    // Hatchet damage: floor(tonnage / 5)
    describe('Hatchet damage calculation', () => {
      const formula = floorDivide('tonnage', 5);

      it.each([
        [20, 4], // floor(20/5) = 4
        [25, 5], // floor(25/5) = 5
        [50, 10], // floor(50/5) = 10
        [75, 15], // floor(75/5) = 15
        [100, 20], // floor(100/5) = 20
      ])('%d ton mech = %d damage', (tonnage, expected) => {
        expect(evaluator.evaluate(formula, { tonnage })).toBe(expected);
      });
    });

    it('should floor correctly with non-divisible values', () => {
      const formula = floorDivide('value', 3);
      expect(evaluator.evaluate(formula, { value: 10 })).toBe(3); // floor(10/3) = 3
      expect(evaluator.evaluate(formula, { value: 11 })).toBe(3);
      expect(evaluator.evaluate(formula, { value: 12 })).toBe(4);
    });
  });

  // ============================================================================
  // MULTIPLY Formula
  // ============================================================================
  describe('MULTIPLY formula', () => {
    describe('Basic multiplication', () => {
      const formula = multiply('tonnage', 1000);

      it.each([
        [50, 50000],
        [75, 75000],
        [100, 100000],
      ])('%d tonnage × 1000 = %d', (tonnage, expected) => {
        expect(evaluator.evaluate(formula, { tonnage })).toBe(expected);
      });
    });

    it('should handle decimal multipliers', () => {
      const formula = multiply('tonnage', 0.05);
      expect(evaluator.evaluate(formula, { tonnage: 100 })).toBe(5);
    });

    it('should throw for missing multiplier', () => {
      expect(() =>
        evaluator.evaluate(
          { type: 'MULTIPLY', field: 'tonnage' },
          { tonnage: 50 },
        ),
      ).toThrow();
    });
  });

  // ============================================================================
  // MULTIPLY_ROUND Formula
  // ============================================================================
  describe('MULTIPLY_ROUND formula', () => {
    describe('Partial Wing weight calculation', () => {
      // Weight = tonnage × 0.05, rounded up to 0.5 tons
      const formula = multiplyRound('tonnage', 0.05, 0.5);

      it.each([
        [50, 2.5], // 50 × 0.05 = 2.5 (exact)
        [55, 3.0], // 55 × 0.05 = 2.75 → ceil to 3.0
        [75, 4.0], // 75 × 0.05 = 3.75 → ceil to 4.0
        [100, 5.0], // 100 × 0.05 = 5.0 (exact)
      ])('%d ton mech = %d ton partial wing', (tonnage, expected) => {
        expect(evaluator.evaluate(formula, { tonnage })).toBe(expected);
      });
    });

    it('should throw for missing roundTo', () => {
      expect(() =>
        evaluator.evaluate(
          { type: 'MULTIPLY_ROUND', field: 'tonnage', multiplier: 0.05 },
          { tonnage: 50 },
        ),
      ).toThrow();
    });
  });

  // ============================================================================
  // EQUALS_WEIGHT Formula
  // ============================================================================
  describe('EQUALS_WEIGHT formula', () => {
    it('should return weight from context', () => {
      expect(evaluator.evaluate(equalsWeight(), { weight: 5 })).toBe(5);
      expect(evaluator.evaluate(equalsWeight(), { weight: 3.5 })).toBe(3.5);
    });

    it('should throw if weight not in context', () => {
      expect(() => evaluator.evaluate(equalsWeight(), {})).toThrow(
        'EQUALS_WEIGHT requires weight',
      );
    });
  });

  // ============================================================================
  // EQUALS_FIELD Formula
  // ============================================================================
  describe('EQUALS_FIELD formula', () => {
    it('should return the field value directly', () => {
      expect(evaluator.evaluate(equalsField('tonnage'), { tonnage: 50 })).toBe(
        50,
      );
      expect(
        evaluator.evaluate(equalsField('engineRating'), { engineRating: 300 }),
      ).toBe(300);
    });

    it('should throw for missing field', () => {
      expect(() => evaluator.evaluate(equalsField('missing'), {})).toThrow(
        'Missing required context field',
      );
    });
  });

  // ============================================================================
  // MIN Formula
  // ============================================================================
  describe('MIN formula', () => {
    it('should return minimum of two values', () => {
      const formula = min(fixed(10), fixed(5));
      expect(evaluator.evaluate(formula, {})).toBe(5);
    });

    it('should return minimum of multiple formulas', () => {
      const formula = min(fixed(10), fixed(5), fixed(8), fixed(3));
      expect(evaluator.evaluate(formula, {})).toBe(3);
    });

    it('should work with computed values', () => {
      const formula = min(
        ceilDivide('tonnage', 10), // 50/10 = 5
        fixed(3),
      );
      expect(evaluator.evaluate(formula, { tonnage: 50 })).toBe(3);
    });

    it('should return 0 for empty MIN', () => {
      expect(evaluator.evaluate({ type: 'MIN', formulas: [] }, {})).toBe(0);
    });
  });

  // ============================================================================
  // MAX Formula
  // ============================================================================
  describe('MAX formula', () => {
    it('should return maximum of two values', () => {
      const formula = max(fixed(10), fixed(5));
      expect(evaluator.evaluate(formula, {})).toBe(10);
    });

    it('should return maximum of multiple formulas', () => {
      const formula = max(fixed(10), fixed(5), fixed(8), fixed(12));
      expect(evaluator.evaluate(formula, {})).toBe(12);
    });

    it('should work with computed values', () => {
      const formula = max(ceilDivide('tonnage', 10), fixed(1));
      expect(evaluator.evaluate(formula, { tonnage: 50 })).toBe(5);
      expect(evaluator.evaluate(formula, { tonnage: 5 })).toBe(1);
    });
  });

  // ============================================================================
  // PLUS Formula
  // ============================================================================
  describe('PLUS formula', () => {
    // Sword damage: floor(tonnage / 10) + 1
    describe('Sword damage calculation', () => {
      const formula = plus(floorDivide('tonnage', 10), 1);

      it.each([
        [50, 6], // floor(50/10) + 1 = 5 + 1 = 6
        [75, 8], // floor(75/10) + 1 = 7 + 1 = 8
        [100, 11], // floor(100/10) + 1 = 10 + 1 = 11
      ])('%d ton mech = %d damage sword', (tonnage, expected) => {
        expect(evaluator.evaluate(formula, { tonnage })).toBe(expected);
      });
    });

    it('should throw for missing base', () => {
      expect(() =>
        evaluator.evaluate({ type: 'PLUS', bonus: 1 } as IFormula, {}),
      ).toThrow();
    });

    it('should throw for missing bonus', () => {
      expect(() =>
        evaluator.evaluate({ type: 'PLUS', base: fixed(5) } as IFormula, {}),
      ).toThrow();
    });
  });

  // ============================================================================
  // validateContext
  // ============================================================================
  describe('validateContext', () => {
    it('should return empty array when all fields present', () => {
      const formula = ceilDivide('tonnage', 15);
      expect(evaluator.validateContext(formula, { tonnage: 50 })).toEqual([]);
    });

    it('should return missing fields', () => {
      const formula = ceilDivide('tonnage', 15);
      expect(evaluator.validateContext(formula, {})).toEqual(['tonnage']);
    });

    it('should handle nested formulas', () => {
      const formula = min(
        ceilDivide('tonnage', 10),
        ceilDivide('engineRating', 25),
      );
      expect(evaluator.validateContext(formula, {})).toEqual([
        'tonnage',
        'engineRating',
      ]);
      expect(evaluator.validateContext(formula, { tonnage: 50 })).toEqual([
        'engineRating',
      ]);
    });
  });

  // ============================================================================
  // getRequiredFields
  // ============================================================================
  describe('getRequiredFields', () => {
    it('should return empty for FIXED', () => {
      expect(evaluator.getRequiredFields(fixed(5))).toEqual([]);
    });

    it('should return field for simple formulas', () => {
      expect(evaluator.getRequiredFields(ceilDivide('tonnage', 15))).toEqual([
        'tonnage',
      ]);
      expect(
        evaluator.getRequiredFields(multiply('engineWeight', 10000)),
      ).toEqual(['engineWeight']);
    });

    it('should return weight for EQUALS_WEIGHT', () => {
      expect(evaluator.getRequiredFields(equalsWeight())).toEqual(['weight']);
    });

    it('should deduplicate fields from nested formulas', () => {
      const formula = min(ceilDivide('tonnage', 10), ceilDivide('tonnage', 15));
      expect(evaluator.getRequiredFields(formula)).toEqual(['tonnage']);
    });

    it('should collect fields from multiple nested formulas', () => {
      const formula = min(
        ceilDivide('tonnage', 10),
        ceilDivide('engineRating', 25),
        multiply('engineWeight', 0.1),
      );
      expect(evaluator.getRequiredFields(formula)).toEqual([
        'tonnage',
        'engineRating',
        'engineWeight',
      ]);
    });
  });

  // ============================================================================
  // Complex Real-World Formulas
  // ============================================================================
  describe('Real-world equipment formulas', () => {
    describe('Targeting Computer IS', () => {
      // Weight = ceil(directFireWeaponTonnage / 4)
      // Slots = weight
      // Cost = weight × 10000
      const weightFormula = ceilDivide('directFireWeaponTonnage', 4);
      const slotsFormula = equalsWeight();
      const costFormula = multiply('weight', 10000);

      it('should calculate for 12 tons of weapons', () => {
        const context: FormulaContext = { directFireWeaponTonnage: 12 };
        const weight = evaluator.evaluate(weightFormula, context);
        expect(weight).toBe(3); // ceil(12/4) = 3

        const contextWithWeight = { ...context, weight };
        const slots = evaluator.evaluate(slotsFormula, contextWithWeight);
        expect(slots).toBe(3);

        const cost = evaluator.evaluate(costFormula, contextWithWeight);
        expect(cost).toBe(30000); // 3 × 10000
      });
    });

    describe('MASC IS', () => {
      // Weight = round(tonnage / 20) - rounds to nearest, not up
      const weightFormula = roundDivide('tonnage', 20);

      it.each([
        [20, 1], // round(20/20) = 1
        [50, 3], // round(50/20) = round(2.5) = 3 (rounds up at .5)
        [85, 4], // round(85/20) = round(4.25) = 4 (rounds down)
        [90, 5], // round(90/20) = round(4.5) = 5 (rounds up at .5)
        [100, 5], // round(100/20) = 5
      ])('tonnage %d = %d tons MASC', (tonnage, expected) => {
        expect(evaluator.evaluate(weightFormula, { tonnage })).toBe(expected);
      });
    });

    describe('Supercharger', () => {
      // Weight = ceil(engineWeight / 10)
      const weightFormula = ceilDivide('engineWeight', 10);

      it.each([
        [8.5, 1], // ceil(8.5/10) = 1
        [19, 2], // ceil(19/10) = 2
        [52.5, 6], // ceil(52.5/10) = 6
      ])('engine weight %d = %d ton supercharger', (engineWeight, expected) => {
        expect(evaluator.evaluate(weightFormula, { engineWeight })).toBe(
          expected,
        );
      });
    });
  });
});
