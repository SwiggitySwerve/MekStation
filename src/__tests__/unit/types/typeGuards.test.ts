/**
 * Type Guards Tests
 *
 * Tests for type guard functions and assertion utilities.
 *
 * @spec openspec/specs/core-entity-types/spec.md
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import {
  isEntity,
  isWeightedComponent,
  isSlottedComponent,
  isPlaceableComponent,
  isTechBaseEntity,
  isTemporalEntity,
  isValuedComponent,
  isDocumentedEntity,
  isValidTechBase,
  isValidRulesLevel,
  isValidEra,
  assertEntity,
  assertWeightedComponent,
  assertTechBaseEntity,
} from '@/utils/typeGuards';

describe('Type Guards', () => {
  // ============================================================================
  // isEntity
  // ============================================================================
  describe('isEntity', () => {
    describe('valid entities', () => {
      it('should accept object with id and name strings', () => {
        expect(isEntity({ id: 'test-1', name: 'Test Entity' })).toBe(true);
      });

      it('should accept object with additional properties', () => {
        expect(isEntity({ id: 'test-1', name: 'Test', weight: 50 })).toBe(true);
      });
    });

    describe('invalid entities', () => {
      it.each([
        [null, 'null'],
        [undefined, 'undefined'],
        ['string', 'string'],
        [123, 'number'],
        [[], 'array'],
        [{}, 'empty object'],
        [{ id: 'test' }, 'missing name'],
        [{ name: 'test' }, 'missing id'],
        [{ id: 123, name: 'test' }, 'numeric id'],
        [{ id: 'test', name: 123 }, 'numeric name'],
      ])('should reject %s (%s)', (value, _label) => {
        expect(isEntity(value)).toBe(false);
      });
    });
  });

  // ============================================================================
  // isWeightedComponent
  // ============================================================================
  describe('isWeightedComponent', () => {
    describe('valid weighted components', () => {
      it.each([
        [{ weight: 0 }, 'zero weight'],
        [{ weight: 1 }, 'positive integer'],
        [{ weight: 0.5 }, 'half ton'],
        [{ weight: 100 }, 'assault weight'],
        [{ weight: 0.25 }, 'quarter ton'],
      ])('should accept %o (%s)', (value, _label) => {
        expect(isWeightedComponent(value)).toBe(true);
      });
    });

    describe('invalid weighted components', () => {
      it.each([
        [null, 'null'],
        [{ weight: -1 }, 'negative weight'],
        [{ weight: NaN }, 'NaN weight'],
        [{ weight: Infinity }, 'Infinity weight'],
        [{ weight: 'heavy' }, 'string weight'],
        [{}, 'missing weight'],
      ])('should reject %o (%s)', (value, _label) => {
        expect(isWeightedComponent(value)).toBe(false);
      });
    });
  });

  // ============================================================================
  // isSlottedComponent
  // ============================================================================
  describe('isSlottedComponent', () => {
    describe('valid slotted components', () => {
      it.each([
        [{ criticalSlots: 0 }, 'zero slots'],
        [{ criticalSlots: 1 }, 'one slot'],
        [{ criticalSlots: 6 }, 'head capacity'],
        [{ criticalSlots: 12 }, 'torso capacity'],
      ])('should accept %o (%s)', (value, _label) => {
        expect(isSlottedComponent(value)).toBe(true);
      });
    });

    describe('invalid slotted components', () => {
      it.each([
        [null, 'null'],
        [{ criticalSlots: -1 }, 'negative slots'],
        [{ criticalSlots: 1.5 }, 'fractional slots'],
        [{ criticalSlots: NaN }, 'NaN slots'],
        [{}, 'missing criticalSlots'],
      ])('should reject %o (%s)', (value, _label) => {
        expect(isSlottedComponent(value)).toBe(false);
      });
    });
  });

  // ============================================================================
  // isPlaceableComponent
  // ============================================================================
  describe('isPlaceableComponent', () => {
    it('should accept objects with both weight and criticalSlots', () => {
      expect(isPlaceableComponent({ weight: 1, criticalSlots: 2 })).toBe(true);
      expect(isPlaceableComponent({ weight: 0.5, criticalSlots: 1 })).toBe(
        true,
      );
    });

    it('should reject objects missing either property', () => {
      expect(isPlaceableComponent({ weight: 1 })).toBe(false);
      expect(isPlaceableComponent({ criticalSlots: 2 })).toBe(false);
    });

    it('should reject objects with invalid values', () => {
      expect(isPlaceableComponent({ weight: -1, criticalSlots: 2 })).toBe(
        false,
      );
      expect(isPlaceableComponent({ weight: 1, criticalSlots: -1 })).toBe(
        false,
      );
    });
  });

  // ============================================================================
  // isTechBaseEntity
  // ============================================================================
  describe('isTechBaseEntity', () => {
    describe('valid tech base entities', () => {
      // Per spec VAL-ENUM-004: TechBase is binary (IS or Clan only)
      it.each([
        [
          {
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.INTRODUCTORY,
          },
        ],
        [{ techBase: TechBase.CLAN, rulesLevel: RulesLevel.STANDARD }],
        [{ techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED }],
      ])('should accept %o', (value) => {
        expect(isTechBaseEntity(value)).toBe(true);
      });
    });

    describe('invalid tech base entities', () => {
      it('should reject invalid tech base', () => {
        expect(
          isTechBaseEntity({
            techBase: 'INVALID',
            rulesLevel: RulesLevel.STANDARD,
          }),
        ).toBe(false);
      });

      it('should reject invalid rules level', () => {
        expect(
          isTechBaseEntity({
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 'INVALID',
          }),
        ).toBe(false);
      });

      it('should reject missing properties', () => {
        expect(isTechBaseEntity({ techBase: TechBase.INNER_SPHERE })).toBe(
          false,
        );
        expect(isTechBaseEntity({ rulesLevel: RulesLevel.STANDARD })).toBe(
          false,
        );
      });
    });
  });

  // ============================================================================
  // isTemporalEntity
  // ============================================================================
  describe('isTemporalEntity', () => {
    describe('valid temporal entities', () => {
      it('should accept object with introductionYear only', () => {
        expect(isTemporalEntity({ introductionYear: 2500 })).toBe(true);
      });

      it('should accept object with both dates', () => {
        expect(
          isTemporalEntity({ introductionYear: 2500, extinctionYear: 3050 }),
        ).toBe(true);
      });

      it('should accept undefined extinctionYear', () => {
        expect(
          isTemporalEntity({
            introductionYear: 2500,
            extinctionYear: undefined,
          }),
        ).toBe(true);
      });
    });

    describe('invalid temporal entities', () => {
      it('should reject missing introductionYear', () => {
        expect(isTemporalEntity({})).toBe(false);
        expect(isTemporalEntity({ extinctionYear: 3050 })).toBe(false);
      });

      it('should reject non-numeric years', () => {
        expect(isTemporalEntity({ introductionYear: '2500' })).toBe(false);
        expect(
          isTemporalEntity({ introductionYear: 2500, extinctionYear: '3050' }),
        ).toBe(false);
      });

      it('should reject extinction before introduction', () => {
        expect(
          isTemporalEntity({ introductionYear: 3050, extinctionYear: 2500 }),
        ).toBe(false);
      });

      it('should reject non-finite years', () => {
        expect(isTemporalEntity({ introductionYear: Infinity })).toBe(false);
        expect(isTemporalEntity({ introductionYear: NaN })).toBe(false);
      });
    });
  });

  // ============================================================================
  // isValuedComponent
  // ============================================================================
  describe('isValuedComponent', () => {
    it('should accept valid valued components', () => {
      expect(isValuedComponent({ costCBills: 1000000, battleValue: 500 })).toBe(
        true,
      );
      expect(isValuedComponent({ costCBills: 0, battleValue: 0 })).toBe(true);
    });

    it('should reject negative values', () => {
      expect(isValuedComponent({ costCBills: -1000, battleValue: 500 })).toBe(
        false,
      );
      expect(isValuedComponent({ costCBills: 1000, battleValue: -500 })).toBe(
        false,
      );
    });

    it('should reject missing properties', () => {
      expect(isValuedComponent({ costCBills: 1000 })).toBe(false);
      expect(isValuedComponent({ battleValue: 500 })).toBe(false);
    });
  });

  // ============================================================================
  // isDocumentedEntity
  // ============================================================================
  describe('isDocumentedEntity', () => {
    it('should accept empty object (all optional)', () => {
      expect(isDocumentedEntity({})).toBe(true);
    });

    it('should accept valid documented entities', () => {
      expect(
        isDocumentedEntity({ sourceBook: 'TechManual', pageReference: 49 }),
      ).toBe(true);
      expect(isDocumentedEntity({ sourceBook: 'TechManual' })).toBe(true);
      expect(isDocumentedEntity({ pageReference: 49 })).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(isDocumentedEntity({ sourceBook: 123 })).toBe(false);
      expect(isDocumentedEntity({ pageReference: 'page 49' })).toBe(false);
      expect(isDocumentedEntity({ pageReference: 49.5 })).toBe(false);
    });
  });

  // ============================================================================
  // Enum Validation
  // ============================================================================
  describe('isValidTechBase', () => {
    it.each(Object.values(TechBase))('should accept %s', (value) => {
      expect(isValidTechBase(value)).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(isValidTechBase('INVALID')).toBe(false);
      expect(isValidTechBase('')).toBe(false);
    });
  });

  describe('isValidRulesLevel', () => {
    it.each(Object.values(RulesLevel))('should accept %s', (value) => {
      expect(isValidRulesLevel(value)).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(isValidRulesLevel('INVALID')).toBe(false);
    });
  });

  describe('isValidEra', () => {
    it.each(Object.values(Era))('should accept %s', (value) => {
      expect(isValidEra(value)).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(isValidEra('INVALID')).toBe(false);
    });
  });

  // ============================================================================
  // Assertion Functions
  // ============================================================================
  describe('assertEntity', () => {
    it('should not throw for valid entity', () => {
      expect(() => assertEntity({ id: 'test', name: 'Test' })).not.toThrow();
    });

    it('should throw for invalid entity', () => {
      expect(() => assertEntity({})).toThrow('Value is not a valid Entity');
    });

    it('should include context in error message', () => {
      expect(() => assertEntity({}, 'Engine')).toThrow(
        'Engine: Value is not a valid Entity',
      );
    });
  });

  describe('assertWeightedComponent', () => {
    it('should not throw for valid weighted component', () => {
      expect(() => assertWeightedComponent({ weight: 5 })).not.toThrow();
    });

    it('should throw for invalid weighted component', () => {
      expect(() => assertWeightedComponent({ weight: -1 })).toThrow();
    });
  });

  describe('assertTechBaseEntity', () => {
    it('should not throw for valid tech base entity', () => {
      expect(() =>
        assertTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid tech base entity', () => {
      expect(() => assertTechBaseEntity({})).toThrow(
        'Value is not a valid TechBaseEntity',
      );
    });
  });
});
