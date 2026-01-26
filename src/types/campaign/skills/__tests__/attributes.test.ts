import { getAttributeModifier, IAttributes } from '../IAttributes';

describe('IAttributes', () => {
  describe('Interface Structure', () => {
    it('should have all 8 required attributes', () => {
      const attributes: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 5,
      };

      expect(attributes.STR).toBe(5);
      expect(attributes.BOD).toBe(5);
      expect(attributes.REF).toBe(5);
      expect(attributes.DEX).toBe(5);
      expect(attributes.INT).toBe(5);
      expect(attributes.WIL).toBe(5);
      expect(attributes.CHA).toBe(5);
      expect(attributes.Edge).toBe(5);
    });

    it('should support all valid attribute values (1-10)', () => {
      const attributes: IAttributes = {
        STR: 1,
        BOD: 2,
        REF: 3,
        DEX: 4,
        INT: 5,
        WIL: 6,
        CHA: 7,
        Edge: 8,
      };

      expect(attributes.STR).toBe(1);
      expect(attributes.BOD).toBe(2);
      expect(attributes.REF).toBe(3);
      expect(attributes.DEX).toBe(4);
      expect(attributes.INT).toBe(5);
      expect(attributes.WIL).toBe(6);
      expect(attributes.CHA).toBe(7);
      expect(attributes.Edge).toBe(8);
    });

    it('should support Edge values from 0-10', () => {
      const attributesWithZeroEdge: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 0,
      };

      const attributesWithMaxEdge: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 10,
      };

      expect(attributesWithZeroEdge.Edge).toBe(0);
      expect(attributesWithMaxEdge.Edge).toBe(10);
    });
  });

  describe('getAttributeModifier()', () => {
    describe('Modifier Calculation', () => {
      it('should calculate modifier as (value - 5)', () => {
        expect(getAttributeModifier(5)).toBe(0);
        expect(getAttributeModifier(6)).toBe(1);
        expect(getAttributeModifier(4)).toBe(-1);
      });

      it('should map attribute value 1 to modifier -4', () => {
        expect(getAttributeModifier(1)).toBe(-4);
      });

      it('should map attribute value 2 to modifier -3', () => {
        expect(getAttributeModifier(2)).toBe(-3);
      });

      it('should map attribute value 3 to modifier -2', () => {
        expect(getAttributeModifier(3)).toBe(-2);
      });

      it('should map attribute value 4 to modifier -1', () => {
        expect(getAttributeModifier(4)).toBe(-1);
      });

      it('should map attribute value 5 to modifier 0', () => {
        expect(getAttributeModifier(5)).toBe(0);
      });

      it('should map attribute value 6 to modifier +1', () => {
        expect(getAttributeModifier(6)).toBe(1);
      });

      it('should map attribute value 7 to modifier +2', () => {
        expect(getAttributeModifier(7)).toBe(2);
      });

      it('should map attribute value 8 to modifier +3', () => {
        expect(getAttributeModifier(8)).toBe(3);
      });

      it('should map attribute value 9 to modifier +4', () => {
        expect(getAttributeModifier(9)).toBe(4);
      });

      it('should map attribute value 10 to modifier +5', () => {
        expect(getAttributeModifier(10)).toBe(5);
      });
    });

    describe('Complete Mapping Table', () => {
      it('should produce correct modifiers for all valid values 1-10', () => {
        const expectedMappings: Record<number, number> = {
          1: -4,
          2: -3,
          3: -2,
          4: -1,
          5: 0,
          6: 1,
          7: 2,
          8: 3,
          9: 4,
          10: 5,
        };

        for (const [value, expectedModifier] of Object.entries(expectedMappings)) {
          const numValue = parseInt(value, 10);
          expect(getAttributeModifier(numValue)).toBe(expectedModifier);
        }
      });
    });

    describe('Boundary Values', () => {
      it('should accept minimum valid value (1)', () => {
        expect(() => getAttributeModifier(1)).not.toThrow();
        expect(getAttributeModifier(1)).toBe(-4);
      });

      it('should accept maximum valid value (10)', () => {
        expect(() => getAttributeModifier(10)).not.toThrow();
        expect(getAttributeModifier(10)).toBe(5);
      });

      it('should reject value below minimum (0)', () => {
        expect(() => getAttributeModifier(0)).toThrow(
          'Invalid attribute value: 0. Attribute values must be between 1 and 10.'
        );
      });

      it('should reject value above maximum (11)', () => {
        expect(() => getAttributeModifier(11)).toThrow(
          'Invalid attribute value: 11. Attribute values must be between 1 and 10.'
        );
      });

      it('should reject negative values', () => {
        expect(() => getAttributeModifier(-1)).toThrow();
        expect(() => getAttributeModifier(-5)).toThrow();
      });

      it('should reject large out-of-range values', () => {
        expect(() => getAttributeModifier(100)).toThrow();
        expect(() => getAttributeModifier(999)).toThrow();
      });
    });

    describe('Error Handling', () => {
      it('should throw error with descriptive message for invalid values', () => {
        const invalidValues = [0, -1, 11, 15, 100];

        for (const value of invalidValues) {
          expect(() => getAttributeModifier(value)).toThrow(
            `Invalid attribute value: ${value}. Attribute values must be between 1 and 10.`
          );
        }
      });

      it('should throw error for non-integer values outside range', () => {
        expect(() => getAttributeModifier(0.5)).toThrow();
        expect(() => getAttributeModifier(10.5)).toThrow();
      });
    });

    describe('Modifier Range', () => {
      it('should produce modifiers in range -4 to +5', () => {
        const modifiers = [];
        for (let value = 1; value <= 10; value++) {
          modifiers.push(getAttributeModifier(value));
        }

        const minModifier = Math.min(...modifiers);
        const maxModifier = Math.max(...modifiers);

        expect(minModifier).toBe(-4);
        expect(maxModifier).toBe(5);
      });

      it('should produce 10 unique modifiers for values 1-10', () => {
        const modifiers = new Set<number>();
        for (let value = 1; value <= 10; value++) {
          modifiers.add(getAttributeModifier(value));
        }

        expect(modifiers.size).toBe(10);
      });
    });

    describe('Consistency', () => {
      it('should return consistent results for repeated calls', () => {
        const value = 7;
        const result1 = getAttributeModifier(value);
        const result2 = getAttributeModifier(value);
        const result3 = getAttributeModifier(value);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it('should be deterministic across all valid values', () => {
        const results1: number[] = [];
        const results2: number[] = [];

        for (let value = 1; value <= 10; value++) {
          results1.push(getAttributeModifier(value));
        }

        for (let value = 1; value <= 10; value++) {
          results2.push(getAttributeModifier(value));
        }

        expect(results1).toEqual(results2);
      });
    });
  });

  describe('Integration', () => {
    it('should work with IAttributes interface for modifier calculations', () => {
      const attributes: IAttributes = {
        STR: 8,
        BOD: 5,
        REF: 7,
        DEX: 6,
        INT: 9,
        WIL: 4,
        CHA: 5,
        Edge: 3,
      };

      expect(getAttributeModifier(attributes.STR)).toBe(3);
      expect(getAttributeModifier(attributes.BOD)).toBe(0);
      expect(getAttributeModifier(attributes.REF)).toBe(2);
      expect(getAttributeModifier(attributes.DEX)).toBe(1);
      expect(getAttributeModifier(attributes.INT)).toBe(4);
      expect(getAttributeModifier(attributes.WIL)).toBe(-1);
      expect(getAttributeModifier(attributes.CHA)).toBe(0);
      expect(getAttributeModifier(attributes.Edge)).toBe(-2);
    });

    it('should handle all attributes at minimum value (1)', () => {
      const attributes: IAttributes = {
        STR: 1,
        BOD: 1,
        REF: 1,
        DEX: 1,
        INT: 1,
        WIL: 1,
        CHA: 1,
        Edge: 1,
      };

      for (const key of Object.keys(attributes)) {
        const value = attributes[key as keyof IAttributes];
        expect(getAttributeModifier(value)).toBe(-4);
      }
    });

    it('should handle all attributes at maximum value (10)', () => {
      const attributes: IAttributes = {
        STR: 10,
        BOD: 10,
        REF: 10,
        DEX: 10,
        INT: 10,
        WIL: 10,
        CHA: 10,
        Edge: 10,
      };

      for (const key of Object.keys(attributes)) {
        const value = attributes[key as keyof IAttributes];
        expect(getAttributeModifier(value)).toBe(5);
      }
    });

    it('should handle all attributes at default value (5)', () => {
      const attributes: IAttributes = {
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 5,
      };

      for (const key of Object.keys(attributes)) {
        const value = attributes[key as keyof IAttributes];
        expect(getAttributeModifier(value)).toBe(0);
      }
    });
  });
});
