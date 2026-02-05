/**
 * Type Guards Tests
 *
 * Tests for type guard implementations for safe type narrowing.
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
} from '../typeGuards';

// =============================================================================
// isEntity Tests
// =============================================================================

describe('isEntity', () => {
  it('should return true for valid entity', () => {
    expect(isEntity({ id: '123', name: 'Test Entity' })).toBe(true);
    expect(isEntity({ id: 'abc-def', name: 'Another', extra: 42 })).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isEntity(null)).toBe(false);
    expect(isEntity(undefined)).toBe(false);
    expect(isEntity('string')).toBe(false);
    expect(isEntity(123)).toBe(false);
    expect(isEntity([])).toBe(false);
  });

  it('should return false for objects missing properties', () => {
    expect(isEntity({})).toBe(false);
    expect(isEntity({ id: '123' })).toBe(false);
    expect(isEntity({ name: 'Test' })).toBe(false);
  });

  it('should return false for wrong property types', () => {
    expect(isEntity({ id: 123, name: 'Test' })).toBe(false);
    expect(isEntity({ id: '123', name: 456 })).toBe(false);
  });
});

// =============================================================================
// isWeightedComponent Tests
// =============================================================================

describe('isWeightedComponent', () => {
  it('should return true for valid weighted component', () => {
    expect(isWeightedComponent({ weight: 0 })).toBe(true);
    expect(isWeightedComponent({ weight: 5.5 })).toBe(true);
    expect(isWeightedComponent({ weight: 100, other: 'prop' })).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isWeightedComponent(null)).toBe(false);
    expect(isWeightedComponent(undefined)).toBe(false);
    expect(isWeightedComponent({})).toBe(false);
  });

  it('should return false for negative weight', () => {
    expect(isWeightedComponent({ weight: -1 })).toBe(false);
    expect(isWeightedComponent({ weight: -0.5 })).toBe(false);
  });

  it('should return false for non-finite weight', () => {
    expect(isWeightedComponent({ weight: Infinity })).toBe(false);
    expect(isWeightedComponent({ weight: NaN })).toBe(false);
  });

  it('should return false for wrong weight type', () => {
    expect(isWeightedComponent({ weight: '5' })).toBe(false);
  });
});

// =============================================================================
// isSlottedComponent Tests
// =============================================================================

describe('isSlottedComponent', () => {
  it('should return true for valid slotted component', () => {
    expect(isSlottedComponent({ criticalSlots: 0 })).toBe(true);
    expect(isSlottedComponent({ criticalSlots: 1 })).toBe(true);
    expect(isSlottedComponent({ criticalSlots: 12 })).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isSlottedComponent(null)).toBe(false);
    expect(isSlottedComponent(undefined)).toBe(false);
    expect(isSlottedComponent({})).toBe(false);
  });

  it('should return false for negative slots', () => {
    expect(isSlottedComponent({ criticalSlots: -1 })).toBe(false);
  });

  it('should return false for non-integer slots', () => {
    expect(isSlottedComponent({ criticalSlots: 1.5 })).toBe(false);
    expect(isSlottedComponent({ criticalSlots: 2.7 })).toBe(false);
  });
});

// =============================================================================
// isPlaceableComponent Tests
// =============================================================================

describe('isPlaceableComponent', () => {
  it('should return true for valid placeable component', () => {
    expect(isPlaceableComponent({ weight: 5, criticalSlots: 2 })).toBe(true);
    expect(isPlaceableComponent({ weight: 0, criticalSlots: 0 })).toBe(true);
  });

  it('should return false if missing weight', () => {
    expect(isPlaceableComponent({ criticalSlots: 2 })).toBe(false);
  });

  it('should return false if missing slots', () => {
    expect(isPlaceableComponent({ weight: 5 })).toBe(false);
  });

  it('should return false for invalid weight or slots', () => {
    expect(isPlaceableComponent({ weight: -1, criticalSlots: 2 })).toBe(false);
    expect(isPlaceableComponent({ weight: 5, criticalSlots: -1 })).toBe(false);
  });
});

// =============================================================================
// isTechBaseEntity Tests
// =============================================================================

describe('isTechBaseEntity', () => {
  it('should return true for valid tech base entity', () => {
    expect(
      isTechBaseEntity({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
      }),
    ).toBe(true);
    expect(
      isTechBaseEntity({
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
      }),
    ).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isTechBaseEntity(null)).toBe(false);
    expect(isTechBaseEntity(undefined)).toBe(false);
    expect(isTechBaseEntity({})).toBe(false);
  });

  it('should return false for invalid tech base', () => {
    expect(
      isTechBaseEntity({
        techBase: 'Invalid',
        rulesLevel: RulesLevel.STANDARD,
      }),
    ).toBe(false);
  });

  it('should return false for invalid rules level', () => {
    expect(
      isTechBaseEntity({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: 'Invalid',
      }),
    ).toBe(false);
  });
});

// =============================================================================
// isTemporalEntity Tests
// =============================================================================

describe('isTemporalEntity', () => {
  it('should return true for valid temporal entity', () => {
    expect(isTemporalEntity({ introductionYear: 3025 })).toBe(true);
    expect(
      isTemporalEntity({ introductionYear: 2750, extinctionYear: 2900 }),
    ).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isTemporalEntity(null)).toBe(false);
    expect(isTemporalEntity(undefined)).toBe(false);
    expect(isTemporalEntity({})).toBe(false);
  });

  it('should return false for non-number introduction year', () => {
    expect(isTemporalEntity({ introductionYear: '3025' })).toBe(false);
  });

  it('should return false for non-finite introduction year', () => {
    expect(isTemporalEntity({ introductionYear: Infinity })).toBe(false);
    expect(isTemporalEntity({ introductionYear: NaN })).toBe(false);
  });

  it('should return false when extinction is before introduction', () => {
    expect(
      isTemporalEntity({ introductionYear: 3025, extinctionYear: 3000 }),
    ).toBe(false);
  });

  it('should return false for non-finite extinction year', () => {
    expect(
      isTemporalEntity({ introductionYear: 3025, extinctionYear: Infinity }),
    ).toBe(false);
  });

  it('should allow undefined extinction year', () => {
    expect(
      isTemporalEntity({ introductionYear: 3025, extinctionYear: undefined }),
    ).toBe(true);
  });
});

// =============================================================================
// isValuedComponent Tests
// =============================================================================

describe('isValuedComponent', () => {
  it('should return true for valid valued component', () => {
    expect(isValuedComponent({ costCBills: 1000, battleValue: 50 })).toBe(true);
    expect(isValuedComponent({ costCBills: 0, battleValue: 0 })).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isValuedComponent(null)).toBe(false);
    expect(isValuedComponent({})).toBe(false);
  });

  it('should return false for negative values', () => {
    expect(isValuedComponent({ costCBills: -100, battleValue: 50 })).toBe(
      false,
    );
    expect(isValuedComponent({ costCBills: 100, battleValue: -50 })).toBe(
      false,
    );
  });

  it('should return false for wrong types', () => {
    expect(isValuedComponent({ costCBills: '1000', battleValue: 50 })).toBe(
      false,
    );
  });
});

// =============================================================================
// isDocumentedEntity Tests
// =============================================================================

describe('isDocumentedEntity', () => {
  it('should return true for valid documented entity', () => {
    expect(isDocumentedEntity({})).toBe(true);
    expect(isDocumentedEntity({ sourceBook: 'TechManual' })).toBe(true);
    expect(isDocumentedEntity({ pageReference: 123 })).toBe(true);
    expect(isDocumentedEntity({ sourceBook: 'TRO', pageReference: 45 })).toBe(
      true,
    );
  });

  it('should return false for invalid values', () => {
    expect(isDocumentedEntity(null)).toBe(false);
    expect(isDocumentedEntity(undefined)).toBe(false);
  });

  it('should return false for wrong sourceBook type', () => {
    expect(isDocumentedEntity({ sourceBook: 123 })).toBe(false);
  });

  it('should return false for non-integer pageReference', () => {
    expect(isDocumentedEntity({ pageReference: 12.5 })).toBe(false);
  });
});

// =============================================================================
// Enum Validators Tests
// =============================================================================

describe('isValidTechBase', () => {
  it('should return true for valid tech bases', () => {
    expect(isValidTechBase(TechBase.INNER_SPHERE)).toBe(true);
    expect(isValidTechBase(TechBase.CLAN)).toBe(true);
  });

  it('should return false for invalid tech bases', () => {
    expect(isValidTechBase('Invalid')).toBe(false);
    expect(isValidTechBase('')).toBe(false);
  });
});

describe('isValidRulesLevel', () => {
  it('should return true for valid rules levels', () => {
    expect(isValidRulesLevel(RulesLevel.INTRODUCTORY)).toBe(true);
    expect(isValidRulesLevel(RulesLevel.STANDARD)).toBe(true);
    expect(isValidRulesLevel(RulesLevel.ADVANCED)).toBe(true);
  });

  it('should return false for invalid rules levels', () => {
    expect(isValidRulesLevel('Invalid')).toBe(false);
  });
});

describe('isValidEra', () => {
  it('should return true for valid eras', () => {
    expect(isValidEra(Era.STAR_LEAGUE)).toBe(true);
    expect(isValidEra(Era.LATE_SUCCESSION_WARS)).toBe(true);
    expect(isValidEra(Era.CLAN_INVASION)).toBe(true);
  });

  it('should return false for invalid eras', () => {
    expect(isValidEra('Invalid')).toBe(false);
  });
});

// =============================================================================
// Assertion Functions Tests
// =============================================================================

describe('assertEntity', () => {
  it('should not throw for valid entity', () => {
    expect(() => assertEntity({ id: '123', name: 'Test' })).not.toThrow();
  });

  it('should throw for invalid entity', () => {
    expect(() => assertEntity({})).toThrow('Value is not a valid Entity');
    expect(() => assertEntity(null)).toThrow('Value is not a valid Entity');
  });

  it('should include context in error message', () => {
    expect(() => assertEntity({}, 'MyContext')).toThrow(
      'MyContext: Value is not a valid Entity',
    );
  });
});

describe('assertWeightedComponent', () => {
  it('should not throw for valid weighted component', () => {
    expect(() => assertWeightedComponent({ weight: 5 })).not.toThrow();
  });

  it('should throw for invalid weighted component', () => {
    expect(() => assertWeightedComponent({})).toThrow(
      'Value is not a valid WeightedComponent',
    );
  });

  it('should include context in error message', () => {
    expect(() => assertWeightedComponent({}, 'Engine')).toThrow(
      'Engine: Value is not a valid WeightedComponent',
    );
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
