/**
 * Unit tests for BattleMech-Specific Validation Rules
 *
 * Tests VAL-BM-001 through VAL-BM-010 for BattleMech and OmniMech units.
 */

import {
  BattleMechTonnageRange,
  BattleMechEngineRatingRange,
  BattleMechEngineRatingMatch,
  OmniMechPodSpace,
  BattleMechMinimumWalkMP,
  BattleMechMaximumWalkMP,
  BattleMechArmActuators,
  BattleMechHeadRestrictions,
  BattleMechCTRequirements,
  BattleMechXLEngineSlots,
  BATTLEMECH_RULES,
} from '@/services/validation/rules/battlemech/BattleMechRules';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IUnitValidationContext,
  UnitCategory,
  IValidatableUnit,
} from '@/types/validation/UnitValidationInterfaces';

describe('BattleMechRules', () => {
  const createBaseUnit = (
    overrides: Partial<IValidatableUnit> = {},
  ): IValidatableUnit => ({
    id: 'test-mech',
    name: 'Test BattleMech',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 5000000,
    battleValue: 1000,
    engineType: 'Standard 250',
    gyroType: 'Standard',
    cockpitType: 'Standard',
    internalStructureType: 'Standard',
    heatSinkCount: 10,
    ...overrides,
  });

  const createContext = (unit: IValidatableUnit): IUnitValidationContext => ({
    unit,
    unitType: unit.unitType,
    unitCategory: UnitCategory.MECH,
    techBase: unit.techBase,
    options: {},
    cache: new Map(),
  });

  describe('BATTLEMECH_RULES array', () => {
    it('should contain all 10 BattleMech-specific rules', () => {
      expect(BATTLEMECH_RULES).toHaveLength(10);
    });

    it('should have rules in priority order', () => {
      const priorities = BATTLEMECH_RULES.map((r) => r.priority);
      const sorted = [...priorities].sort((a, b) => (a ?? 100) - (b ?? 100));
      expect(priorities).toEqual(sorted);
    });
  });

  describe('VAL-BM-001: BattleMech Tonnage Range', () => {
    it('should pass for valid tonnage (50 tons)', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 50 })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for minimum tonnage (20 tons)', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 20 })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for maximum tonnage (100 tons)', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 100 })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for superheavy tonnage (150 tons)', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 150 })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for maximum superheavy tonnage (200 tons)', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 200 })),
      );
      expect(result.passed).toBe(true);
    });

    it('should fail for tonnage below 20', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 15 })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('20 and 200');
    });

    it('should fail for tonnage above 200', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 205 })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('20 and 200');
    });

    it('should fail for tonnage not divisible by 5', () => {
      const result = BattleMechTonnageRange.validate(
        createContext(createBaseUnit({ weight: 52 })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('divisible by');
    });

    it('should apply to OmniMechs as well', () => {
      const unit = createBaseUnit({ unitType: UnitType.OMNIMECH, weight: 50 });
      const result = BattleMechTonnageRange.validate(createContext(unit));
      expect(result.passed).toBe(true);
    });

    it('should pass for non-BattleMech unit types (rule not applicable)', () => {
      const unit = createBaseUnit({ unitType: UnitType.VEHICLE, weight: 15 });
      const result = BattleMechTonnageRange.validate(createContext(unit));
      expect(result.passed).toBe(true); // Not applicable to vehicles
    });
  });

  describe('VAL-BM-002: Engine Rating Range', () => {
    it('should pass for valid engine rating', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 250' })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for minimum engine rating (10)', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 10' })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass for maximum engine rating (500)', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 500' })),
      );
      expect(result.passed).toBe(true);
    });

    it('should fail for engine rating below 10', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 5' })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('10 and 500');
    });

    it('should fail for engine rating above 500', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 600' })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('10 and 500');
    });

    it('should fail for engine rating not divisible by 5', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'Standard 252' })),
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('multiple of');
    });

    it('should pass for XL engine with valid rating', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: 'XL 300' })),
      );
      expect(result.passed).toBe(true);
    });

    it('should pass when no engine type is specified', () => {
      const result = BattleMechEngineRatingRange.validate(
        createContext(createBaseUnit({ engineType: undefined })),
      );
      expect(result.passed).toBe(true); // No engine to validate
    });

    it('should pass for non-BattleMech unit types', () => {
      const unit = createBaseUnit({
        unitType: UnitType.VEHICLE,
        engineType: 'Standard 5',
      });
      const result = BattleMechEngineRatingRange.validate(createContext(unit));
      expect(result.passed).toBe(true); // Not applicable to vehicles
    });
  });

  describe('VAL-BM-003: Engine Rating Match', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechEngineRatingMatch.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-004: OmniMech Pod Space', () => {
    it('should pass for OmniMech (placeholder implementation)', () => {
      const unit = createBaseUnit({ unitType: UnitType.OMNIMECH });
      const result = OmniMechPodSpace.validate(createContext(unit));
      expect(result.passed).toBe(true);
    });

    it('should only apply to OmniMechs', () => {
      expect(OmniMechPodSpace.applicableUnitTypes).toEqual([UnitType.OMNIMECH]);
    });
  });

  describe('VAL-BM-005: Minimum Walk MP', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechMinimumWalkMP.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-006: Maximum Walk MP', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechMaximumWalkMP.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-007: Arm Actuator Requirements', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechArmActuators.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-008: Head Location Restrictions', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechHeadRestrictions.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-009: Center Torso Requirements', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechCTRequirements.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('VAL-BM-010: XL Engine Side Torso Slots', () => {
    it('should pass (placeholder implementation)', () => {
      const result = BattleMechXLEngineSlots.validate(
        createContext(createBaseUnit()),
      );
      expect(result.passed).toBe(true);
    });
  });
});
