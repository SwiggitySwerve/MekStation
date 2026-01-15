import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { IUnitValidationContext, UnitCategory, IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';
import {
  MechEngineRequired,
  MechGyroRequired,
  MechCockpitRequired,
  MechStructureRequired,
  MechMinimumHeatSinks,
  MechExactWeightMatch,
  MechCriticalSlotLimits,
} from '@/services/validation/rules/mech/MechCategoryRules';

describe('MechCategoryRules', () => {
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
    engineType: 'Fusion 250',
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

  describe('VAL-MECH-001: Engine Required', () => {
    it('should pass if engine is present', () => {
      const result = MechEngineRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if engine is missing', () => {
      const unit = createBaseUnit({ engineType: undefined });
      const result = MechEngineRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Engine required');
    });
  });

  describe('VAL-MECH-002: Gyro Required', () => {
    it('should pass if gyro is present', () => {
      const result = MechGyroRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if gyro is missing', () => {
      const unit = createBaseUnit({ gyroType: undefined });
      const result = MechGyroRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Gyro required');
    });

    it('should skip validation for ProtoMechs', () => {
      const unit = createBaseUnit({ unitType: UnitType.PROTOMECH, gyroType: undefined });
      const context = createContext(unit);
      expect(MechGyroRequired.canValidate?.(context)).toBe(false);
    });
  });

  describe('VAL-MECH-003: Cockpit Required', () => {
    it('should pass if cockpit is present', () => {
      const result = MechCockpitRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if cockpit is missing', () => {
      const unit = createBaseUnit({ cockpitType: undefined });
      const result = MechCockpitRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Cockpit required');
    });
  });

  describe('VAL-MECH-004: Internal Structure Required', () => {
    it('should pass if structure is present', () => {
      const result = MechStructureRequired.validate(createContext(createBaseUnit()));
      expect(result.passed).toBe(true);
    });

    it('should fail if structure is missing', () => {
      const unit = createBaseUnit({ internalStructureType: undefined });
      const result = MechStructureRequired.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Internal structure required');
    });
  });

  describe('VAL-MECH-005: Minimum Heat Sinks', () => {
    it('should pass if count is 10 or more', () => {
      const result = MechMinimumHeatSinks.validate(createContext(createBaseUnit({ heatSinkCount: 10 })));
      expect(result.warnings.length).toBe(0);
    });

    it('should issue warning if count is less than 10', () => {
      const result = MechMinimumHeatSinks.validate(createContext(createBaseUnit({ heatSinkCount: 9 })));
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].message).toContain('at least 10 heat sinks');
    });

    it('should skip validation for non-combat mechs', () => {
      const unit = createBaseUnit({ unitType: UnitType.INDUSTRIALMECH, heatSinkCount: 5 });
      const context = createContext(unit);
      expect(MechMinimumHeatSinks.canValidate?.(context)).toBe(false);
    });
  });

  describe('Placeholder rules', () => {
    it('VAL-MECH-006 should pass', () => {
      expect(MechExactWeightMatch.validate(createContext(createBaseUnit())).passed).toBe(true);
    });

    it('VAL-MECH-007 should pass', () => {
      expect(MechCriticalSlotLimits.validate(createContext(createBaseUnit())).passed).toBe(true);
    });
  });
});
