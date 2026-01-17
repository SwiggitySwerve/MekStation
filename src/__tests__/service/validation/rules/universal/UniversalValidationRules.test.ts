import { RulesLevel, Era } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { IUnitValidationContext, UnitCategory, IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';
import {
  EntityIdRequired,
  EntityNameRequired,
  ValidUnitType,
  TechBaseRequired,
  RulesLevelRequired,
  IntroductionYearValid,
  TemporalConsistency,
  WeightNonNegative,
  CostNonNegative,
  BattleValueNonNegative,
  EraAvailability,
  RulesLevelCompliance,
  ArmorAllocationWarning,
} from '@/services/validation/rules/universal/UniversalValidationRules';

describe('UniversalValidationRules', () => {
  const createBaseUnit = (overrides: Partial<IValidatableUnit> = {}): IValidatableUnit => ({
    id: 'test-unit',
    name: 'Test Unit',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 1000000,
    battleValue: 1000,
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

  describe('VAL-UNIV-001: Entity ID Required', () => {
    it('should pass if id is present', () => {
      const result = EntityIdRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if id is missing or empty', () => {
      const unit = createBaseUnit({ id: '' });
      const result = EntityIdRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('id');
    });
  });

  describe('VAL-UNIV-002: Entity Name Required', () => {
    it('should pass if name is present', () => {
      const result = EntityNameRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if name is missing or empty', () => {
      const unit = createBaseUnit({ name: '' });
      const result = EntityNameRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('name');
    });
  });

  describe('VAL-UNIV-003: Valid Unit Type', () => {
    it('should pass for valid unit type', () => {
      const result = ValidUnitType.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for invalid unit type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Testing invalid input handling
      const unit = createBaseUnit({ unitType: 'INVALID' as any });
      const result = ValidUnitType.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-004: Tech Base Required', () => {
    it('should pass for valid tech base', () => {
      const result = TechBaseRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for missing or invalid tech base', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Testing invalid input handling
      const unit = createBaseUnit({ techBase: '' as any });
      const result = TechBaseRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-005: Rules Level Required', () => {
    it('should pass for valid rules level', () => {
      const result = RulesLevelRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for missing or invalid rules level', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Testing invalid input handling
      const unit = createBaseUnit({ rulesLevel: 'INVALID' as any });
      const result = RulesLevelRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-006: Introduction Year Valid', () => {
    it('should pass for year within BT timeline', () => {
      const result = IntroductionYearValid.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for year outside BT timeline', () => {
      const unitTooEarly = createBaseUnit({ introductionYear: 1900 });
      const result = IntroductionYearValid.validate(createContext(unitTooEarly));
      expect(result.passed).toBe(false);
      
      const unitTooLate = createBaseUnit({ introductionYear: 4000 });
      expect(IntroductionYearValid.validate(createContext(unitTooLate)).passed).toBe(false);
    });
  });

  describe('VAL-UNIV-007: Temporal Consistency', () => {
    it('should pass if extinction year is after intro year', () => {
      const unit = createBaseUnit({ extinctionYear: 3050 });
      const result = TemporalConsistency.validate(createContext(unit));
      expect(result.passed).toBe(true);
    });

    it('should fail if extinction year is before or equal to intro year', () => {
      const unit = createBaseUnit({ extinctionYear: 3000 });
      const result = TemporalConsistency.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-008: Weight Non-Negative', () => {
    it('should pass for non-negative weight', () => {
      const result = WeightNonNegative.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for negative weight', () => {
      const unit = createBaseUnit({ weight: -10 });
      const result = WeightNonNegative.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-009: Cost Non-Negative', () => {
    it('should pass for non-negative cost', () => {
      const result = CostNonNegative.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for negative cost', () => {
      const unit = createBaseUnit({ cost: -100 });
      const result = CostNonNegative.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-010: Battle Value Non-Negative', () => {
    it('should pass for non-negative battle value', () => {
      const result = BattleValueNonNegative.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail for negative battle value', () => {
      const unit = createBaseUnit({ battleValue: -100 });
      const result = BattleValueNonNegative.validate(createContext(unit));
      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-UNIV-011: Era Availability', () => {
    it('should pass if campaign year is after intro year and before extinction', () => {
      const unit = createBaseUnit();
      const context = { ...createContext(unit), campaignYear: 3030 };
      expect(EraAvailability.validate(context).passed).toBe(true);
    });

    it('should fail if campaign year is before intro year', () => {
      const unit = createBaseUnit(); // intro 3025
      const context = { ...createContext(unit), campaignYear: 3010 };
      expect(EraAvailability.validate(context).passed).toBe(false);
    });

    it('should fail if campaign year is after extinction year', () => {
      const unit = createBaseUnit({ extinctionYear: 3050 });
      const context = { ...createContext(unit), campaignYear: 3060 };
      expect(EraAvailability.validate(context).passed).toBe(false);
    });

    it('should skip validation if campaign year is not provided', () => {
      const context = createContext(createBaseUnit());
      expect(EraAvailability.canValidate!(context)).toBe(false);
      expect(EraAvailability.validate(context).passed).toBe(true);
    });
  });

  describe('VAL-UNIV-012: Rules Level Compliance', () => {
    it('should pass if unit rules level is below or equal to filter', () => {
      const unit = createBaseUnit(); // Standard
      const context = { ...createContext(unit), rulesLevelFilter: RulesLevel.STANDARD };
      expect(RulesLevelCompliance.validate(context).passed).toBe(true);
      
      const contextAdvanced = { ...createContext(unit), rulesLevelFilter: RulesLevel.ADVANCED };
      expect(RulesLevelCompliance.validate(contextAdvanced).passed).toBe(true);
    });

    it('should fail if unit rules level exceeds filter', () => {
      const unit = createBaseUnit({ rulesLevel: RulesLevel.ADVANCED });
      const context = { ...createContext(unit), rulesLevelFilter: RulesLevel.STANDARD };
      expect(RulesLevelCompliance.validate(context).passed).toBe(false);
    });

    it('should skip validation if filter is not provided', () => {
      const context = createContext(createBaseUnit());
      expect(RulesLevelCompliance.canValidate!(context)).toBe(false);
      expect(RulesLevelCompliance.validate(context).passed).toBe(true);
    });
  });

  describe('VAL-UNIV-013: Armor Allocation Warning', () => {
    it('should pass with no warnings when armor is allocated', () => {
      const unit = createBaseUnit({ totalArmorPoints: 100 });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should emit warning when armor is zero', () => {
      const unit = createBaseUnit({ totalArmorPoints: 0 });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('no armor allocated');
    });

    it('should skip validation when totalArmorPoints is undefined', () => {
      const unit = createBaseUnit();
      const context = createContext(unit);
      expect(ArmorAllocationWarning.canValidate!(context)).toBe(false);
    });

    it('should validate when totalArmorPoints is defined', () => {
      const unit = createBaseUnit({ totalArmorPoints: 50 });
      const context = createContext(unit);
      expect(ArmorAllocationWarning.canValidate!(context)).toBe(true);
    });
  });
});
