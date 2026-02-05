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

describe('typeGuards', () => {
  describe('isEntity', () => {
    it('should return true for valid entity', () => {
      expect(isEntity({ id: '1', name: 'Test' })).toBe(true);
    });

    it('should return false for invalid entity', () => {
      expect(isEntity(null)).toBe(false);
      expect(isEntity({})).toBe(false);
      expect(isEntity({ id: 1, name: 'Test' })).toBe(false);
      expect(isEntity({ id: '1' })).toBe(false);
    });
  });

  describe('isWeightedComponent', () => {
    it('should return true for valid weighted component', () => {
      expect(isWeightedComponent({ weight: 1.5 })).toBe(true);
      expect(isWeightedComponent({ weight: 0 })).toBe(true);
    });

    it('should return false for invalid weighted component', () => {
      expect(isWeightedComponent(null)).toBe(false);
      expect(isWeightedComponent({ weight: -1 })).toBe(false);
      expect(isWeightedComponent({ weight: '1' })).toBe(false);
      expect(isWeightedComponent({ weight: Infinity })).toBe(false);
    });
  });

  describe('isSlottedComponent', () => {
    it('should return true for valid slotted component', () => {
      expect(isSlottedComponent({ criticalSlots: 2 })).toBe(true);
      expect(isSlottedComponent({ criticalSlots: 0 })).toBe(true);
    });

    it('should return false for invalid slotted component', () => {
      expect(isSlottedComponent(null)).toBe(false);
      expect(isSlottedComponent({ criticalSlots: 1.5 })).toBe(false);
      expect(isSlottedComponent({ criticalSlots: -1 })).toBe(false);
    });
  });

  describe('isPlaceableComponent', () => {
    it('should return true if it is both weighted and slotted', () => {
      expect(isPlaceableComponent({ weight: 1, criticalSlots: 1 })).toBe(true);
    });

    it('should return false otherwise', () => {
      expect(isPlaceableComponent({ weight: 1 })).toBe(false);
      expect(isPlaceableComponent({ criticalSlots: 1 })).toBe(false);
    });
  });

  describe('isTechBaseEntity', () => {
    it('should return true for valid tech base entity', () => {
      expect(
        isTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).toBe(true);
    });

    it('should return false for invalid tech base entity', () => {
      expect(isTechBaseEntity(null)).toBe(false);
      expect(
        isTechBaseEntity({
          techBase: 'INVALID',
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).toBe(false);
    });
  });

  describe('isTemporalEntity', () => {
    it('should return true for valid temporal entity', () => {
      expect(isTemporalEntity({ introductionYear: 3025 })).toBe(true);
      expect(
        isTemporalEntity({ introductionYear: 3025, extinctionYear: 3050 }),
      ).toBe(true);
    });

    it('should return false for invalid temporal entity', () => {
      expect(isTemporalEntity(null)).toBe(false);
      expect(isTemporalEntity({ introductionYear: '3025' })).toBe(false);
      expect(
        isTemporalEntity({ introductionYear: 3025, extinctionYear: 3000 }),
      ).toBe(false);
      expect(isTemporalEntity({ introductionYear: Infinity })).toBe(false);
      expect(
        isTemporalEntity({ introductionYear: 3025, extinctionYear: '3050' }),
      ).toBe(false);
    });
  });

  describe('isValuedComponent', () => {
    it('should return true for valid valued component', () => {
      expect(isValuedComponent({ costCBills: 100, battleValue: 100 })).toBe(
        true,
      );
    });

    it('should return false for invalid valued component', () => {
      expect(isValuedComponent(null)).toBe(false);
      expect(isValuedComponent({ costCBills: -1, battleValue: 100 })).toBe(
        false,
      );
    });
  });

  describe('isDocumentedEntity', () => {
    it('should return true for valid documented entity', () => {
      expect(isDocumentedEntity({})).toBe(true);
      expect(isDocumentedEntity({ sourceBook: 'TM', pageReference: 10 })).toBe(
        true,
      );
    });

    it('should return false for invalid documented entity', () => {
      expect(isDocumentedEntity(null)).toBe(false);
      expect(isDocumentedEntity({ sourceBook: 123 })).toBe(false);
      expect(isDocumentedEntity({ pageReference: 1.5 })).toBe(false);
    });
  });

  describe('isValid helpers', () => {
    it('isValidTechBase should work', () => {
      expect(isValidTechBase(TechBase.INNER_SPHERE)).toBe(true);
      expect(isValidTechBase('INVALID')).toBe(false);
    });

    it('isValidRulesLevel should work', () => {
      expect(isValidRulesLevel(RulesLevel.STANDARD)).toBe(true);
      expect(isValidRulesLevel('INVALID')).toBe(false);
    });

    it('isValidEra should work', () => {
      expect(isValidEra(Era.LATE_SUCCESSION_WARS)).toBe(true);
      expect(isValidEra('INVALID')).toBe(false);
    });
  });

  describe('assertions', () => {
    it('assertEntity should not throw for valid entity', () => {
      expect(() => assertEntity({ id: '1', name: 'Test' })).not.toThrow();
    });

    it('assertEntity should throw for invalid entity', () => {
      expect(() => assertEntity({})).toThrow('Value is not a valid Entity');
      expect(() => assertEntity({}, 'Context')).toThrow(
        'Context: Value is not a valid Entity',
      );
    });

    it('assertWeightedComponent should work', () => {
      expect(() => assertWeightedComponent({ weight: 1 })).not.toThrow();
      expect(() => assertWeightedComponent({})).toThrow(
        'Value is not a valid WeightedComponent',
      );
    });

    it('assertTechBaseEntity should work', () => {
      expect(() =>
        assertTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).not.toThrow();
      expect(() => assertTechBaseEntity({})).toThrow(
        'Value is not a valid TechBaseEntity',
      );
    });
  });
});
