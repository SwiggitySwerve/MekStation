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
  describe('isEntity()', () => {
    it('should return true for valid entity', () => {
      expect(isEntity({ id: '1', name: 'Test' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isEntity(null)).toBe(false);
    });

    it('should return false for missing id', () => {
      expect(isEntity({ name: 'Test' })).toBe(false);
    });

    it('should return false for missing name', () => {
      expect(isEntity({ id: '1' })).toBe(false);
    });

    it('should return false for non-string id', () => {
      expect(isEntity({ id: 1, name: 'Test' })).toBe(false);
    });

    it('should return false for non-string name', () => {
      expect(isEntity({ id: '1', name: 123 })).toBe(false);
    });
  });

  describe('isWeightedComponent()', () => {
    it('should return true for valid weighted component', () => {
      expect(isWeightedComponent({ weight: 5 })).toBe(true);
    });

    it('should return false for negative weight', () => {
      expect(isWeightedComponent({ weight: -1 })).toBe(false);
    });

    it('should return false for non-number weight', () => {
      expect(isWeightedComponent({ weight: '5' })).toBe(false);
    });

    it('should return false for infinite weight', () => {
      expect(isWeightedComponent({ weight: Infinity })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isWeightedComponent(null)).toBe(false);
    });
  });

  describe('isSlottedComponent()', () => {
    it('should return true for valid slotted component', () => {
      expect(isSlottedComponent({ criticalSlots: 2 })).toBe(true);
    });

    it('should return false for negative slots', () => {
      expect(isSlottedComponent({ criticalSlots: -1 })).toBe(false);
    });

    it('should return false for non-integer slots', () => {
      expect(isSlottedComponent({ criticalSlots: 2.5 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSlottedComponent(null)).toBe(false);
    });
  });

  describe('isPlaceableComponent()', () => {
    it('should return true for valid placeable component', () => {
      expect(isPlaceableComponent({ weight: 5, criticalSlots: 2 })).toBe(true);
    });

    it('should return false for missing weight', () => {
      expect(isPlaceableComponent({ criticalSlots: 2 })).toBe(false);
    });

    it('should return false for missing slots', () => {
      expect(isPlaceableComponent({ weight: 5 })).toBe(false);
    });
  });

  describe('isTechBaseEntity()', () => {
    it('should return true for valid tech base entity', () => {
      expect(
        isTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).toBe(true);
    });

    it('should return false for invalid tech base', () => {
      expect(
        isTechBaseEntity({
          techBase: 'Invalid' as TechBase,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).toBe(false);
    });

    it('should return false for invalid rules level', () => {
      expect(
        isTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: 'Invalid' as RulesLevel,
        }),
      ).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTechBaseEntity(null)).toBe(false);
    });
  });

  describe('isTemporalEntity()', () => {
    it('should return true for valid temporal entity', () => {
      expect(isTemporalEntity({ introductionYear: 2750 })).toBe(true);
    });

    it('should return true with extinction year', () => {
      expect(
        isTemporalEntity({
          introductionYear: 2750,
          extinctionYear: 2800,
        }),
      ).toBe(true);
    });

    it('should return false for invalid introduction year', () => {
      expect(isTemporalEntity({ introductionYear: Infinity })).toBe(false);
    });

    it('should return false for extinction before introduction', () => {
      expect(
        isTemporalEntity({
          introductionYear: 2800,
          extinctionYear: 2750,
        }),
      ).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTemporalEntity(null)).toBe(false);
    });
  });

  describe('isValuedComponent()', () => {
    it('should return true for valid valued component', () => {
      expect(
        isValuedComponent({
          costCBills: 1000,
          battleValue: 500,
        }),
      ).toBe(true);
    });

    it('should return false for negative cost', () => {
      expect(
        isValuedComponent({
          costCBills: -1,
          battleValue: 500,
        }),
      ).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValuedComponent(null)).toBe(false);
    });
  });

  describe('isDocumentedEntity()', () => {
    it('should return true for valid documented entity', () => {
      expect(
        isDocumentedEntity({
          sourceBook: 'TechManual',
          pageReference: 100,
        }),
      ).toBe(true);
    });

    it('should return true with only sourceBook', () => {
      expect(isDocumentedEntity({ sourceBook: 'TechManual' })).toBe(true);
    });

    it('should return true with only pageReference', () => {
      expect(isDocumentedEntity({ pageReference: 100 })).toBe(true);
    });

    it('should return false for invalid pageReference', () => {
      expect(isDocumentedEntity({ pageReference: 1.5 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDocumentedEntity(null)).toBe(false);
    });
  });

  describe('isValidTechBase()', () => {
    it('should return true for valid tech base', () => {
      expect(isValidTechBase(TechBase.INNER_SPHERE)).toBe(true);
      expect(isValidTechBase(TechBase.CLAN)).toBe(true);
    });

    it('should return false for invalid tech base', () => {
      expect(isValidTechBase('Invalid')).toBe(false);
    });
  });

  describe('isValidRulesLevel()', () => {
    it('should return true for valid rules level', () => {
      expect(isValidRulesLevel(RulesLevel.STANDARD)).toBe(true);
    });

    it('should return false for invalid rules level', () => {
      expect(isValidRulesLevel('Invalid')).toBe(false);
    });
  });

  describe('isValidEra()', () => {
    it('should return true for valid era', () => {
      expect(isValidEra(Era.AGE_OF_WAR)).toBe(true);
    });

    it('should return false for invalid era', () => {
      expect(isValidEra('Invalid')).toBe(false);
    });
  });

  describe('assertEntity()', () => {
    it('should not throw for valid entity', () => {
      expect(() => assertEntity({ id: '1', name: 'Test' })).not.toThrow();
    });

    it('should throw for invalid entity', () => {
      expect(() => assertEntity(null)).toThrow();
    });

    it('should include context in error', () => {
      expect(() => assertEntity(null, 'TestContext')).toThrow('TestContext');
    });
  });

  describe('assertWeightedComponent()', () => {
    it('should not throw for valid component', () => {
      expect(() => assertWeightedComponent({ weight: 5 })).not.toThrow();
    });

    it('should throw for invalid component', () => {
      expect(() => assertWeightedComponent(null)).toThrow();
    });
  });

  describe('assertTechBaseEntity()', () => {
    it('should not throw for valid entity', () => {
      expect(() =>
        assertTechBaseEntity({
          techBase: TechBase.INNER_SPHERE,
          rulesLevel: RulesLevel.STANDARD,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid entity', () => {
      expect(() => assertTechBaseEntity(null)).toThrow();
    });
  });
});
