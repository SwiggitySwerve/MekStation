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
  WeightOverflowValidation,
  CriticalSlotOverflowValidation,
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

  describe('VAL-UNIV-013: Armor Allocation Validation', () => {
    // Helper to create armor allocation with displayName for all configurations
    const createFullArmorAllocation = (armorValue: number, maxValue: number = 10) => ({
      head: { current: armorValue, max: 9, displayName: 'Head' },
      centerTorso: { current: armorValue, max: maxValue, displayName: 'Center Torso' },
      centerTorsoRear: { current: armorValue, max: maxValue, displayName: 'Center Torso (Rear)' },
      leftTorso: { current: armorValue, max: maxValue, displayName: 'Left Torso' },
      leftTorsoRear: { current: armorValue, max: maxValue, displayName: 'Left Torso (Rear)' },
      rightTorso: { current: armorValue, max: maxValue, displayName: 'Right Torso' },
      rightTorsoRear: { current: armorValue, max: maxValue, displayName: 'Right Torso (Rear)' },
      leftArm: { current: armorValue, max: maxValue, displayName: 'Left Arm' },
      rightArm: { current: armorValue, max: maxValue, displayName: 'Right Arm' },
      leftLeg: { current: armorValue, max: maxValue, displayName: 'Left Leg' },
      rightLeg: { current: armorValue, max: maxValue, displayName: 'Right Leg' },
    });

    it('should pass with no errors/warnings when armor is fully allocated', () => {
      const unit = createBaseUnit({ 
        totalArmorPoints: 100,
        armorByLocation: createFullArmorAllocation(10, 10),
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should emit errors when armor is below 20% (critical)', () => {
      const armorByLocation = createFullArmorAllocation(10, 10);
      armorByLocation.head = { current: 0, max: 9, displayName: 'Head' };        // 0% - critical
      armorByLocation.centerTorso = { current: 1, max: 10, displayName: 'Center Torso' }; // 10% - critical
      
      const unit = createBaseUnit({ 
        totalArmorPoints: 80,
        armorByLocation,
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('has no armor');
      expect(result.errors[1].message).toContain('critical armor');
    });

    it('should emit warnings when armor is between 20-40% (low)', () => {
      const armorByLocation = createFullArmorAllocation(10, 20); // 50% - no warning
      armorByLocation.head = { current: 3, max: 10, displayName: 'Head' }; // 30% - low, warning
      
      const unit = createBaseUnit({ 
        totalArmorPoints: 90,
        armorByLocation,
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('has low armor');
    });

    it('should not warn when armor is at or above 40%', () => {
      const armorByLocation = createFullArmorAllocation(4, 10); // 40% - no warning
      
      const unit = createBaseUnit({ 
        totalArmorPoints: 44,
        armorByLocation,
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should skip validation when armorByLocation is undefined', () => {
      const unit = createBaseUnit({ totalArmorPoints: 50 });
      const context = createContext(unit);
      expect(ArmorAllocationWarning.canValidate!(context)).toBe(false);
    });

    it('should validate when armorByLocation is defined', () => {
      const unit = createBaseUnit({ 
        totalArmorPoints: 50,
        armorByLocation: createFullArmorAllocation(5, 10),
      });
      const context = createContext(unit);
      expect(ArmorAllocationWarning.canValidate!(context)).toBe(true);
    });

    it('should handle quad mech locations', () => {
      // Quad mechs have 4 legs instead of 2 arms + 2 legs
      const quadArmorAllocation = {
        head: { current: 9, max: 9, displayName: 'Head' },
        centerTorso: { current: 10, max: 10, displayName: 'Center Torso' },
        centerTorsoRear: { current: 5, max: 10, displayName: 'Center Torso (Rear)' },
        leftTorso: { current: 10, max: 10, displayName: 'Left Torso' },
        leftTorsoRear: { current: 5, max: 10, displayName: 'Left Torso (Rear)' },
        rightTorso: { current: 10, max: 10, displayName: 'Right Torso' },
        rightTorsoRear: { current: 5, max: 10, displayName: 'Right Torso (Rear)' },
        frontLeftLeg: { current: 10, max: 10, displayName: 'Front Left Leg' },
        frontRightLeg: { current: 10, max: 10, displayName: 'Front Right Leg' },
        rearLeftLeg: { current: 10, max: 10, displayName: 'Rear Left Leg' },
        rearRightLeg: { current: 10, max: 10, displayName: 'Rear Right Leg' },
      };
      
      const unit = createBaseUnit({ 
        totalArmorPoints: 99,
        armorByLocation: quadArmorAllocation,
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle tripod mech locations', () => {
      // Tripod mechs have 2 arms + 3 legs (including center leg)
      const tripodArmorAllocation = {
        head: { current: 9, max: 9, displayName: 'Head' },
        centerTorso: { current: 10, max: 10, displayName: 'Center Torso' },
        centerTorsoRear: { current: 5, max: 10, displayName: 'Center Torso (Rear)' },
        leftTorso: { current: 10, max: 10, displayName: 'Left Torso' },
        leftTorsoRear: { current: 5, max: 10, displayName: 'Left Torso (Rear)' },
        rightTorso: { current: 10, max: 10, displayName: 'Right Torso' },
        rightTorsoRear: { current: 5, max: 10, displayName: 'Right Torso (Rear)' },
        leftArm: { current: 10, max: 10, displayName: 'Left Arm' },
        rightArm: { current: 10, max: 10, displayName: 'Right Arm' },
        leftLeg: { current: 10, max: 10, displayName: 'Left Leg' },
        rightLeg: { current: 10, max: 10, displayName: 'Right Leg' },
        centerLeg: { current: 10, max: 10, displayName: 'Center Leg' },
      };
      
      const unit = createBaseUnit({ 
        totalArmorPoints: 109,
        armorByLocation: tripodArmorAllocation,
      });
      const result = ArmorAllocationWarning.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('VAL-UNIV-014: Weight Overflow Validation', () => {
    it('should pass when weight is within limits', () => {
      const unit = createBaseUnit({
        allocatedWeight: 45,
        maxWeight: 50,
      });
      const result = WeightOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when weight exactly matches max', () => {
      const unit = createBaseUnit({
        allocatedWeight: 50,
        maxWeight: 50,
      });
      const result = WeightOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should emit critical error when weight exceeds max', () => {
      const unit = createBaseUnit({
        allocatedWeight: 55,
        maxWeight: 50,
      });
      const result = WeightOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum tonnage');
      expect(result.errors[0].message).toContain('5.0 tons');
    });

    it('should skip validation when weight data is undefined', () => {
      const unit = createBaseUnit();
      const context = createContext(unit);
      expect(WeightOverflowValidation.canValidate!(context)).toBe(false);
    });

    it('should validate when weight data is defined', () => {
      const unit = createBaseUnit({
        allocatedWeight: 45,
        maxWeight: 50,
      });
      const context = createContext(unit);
      expect(WeightOverflowValidation.canValidate!(context)).toBe(true);
    });
  });

  describe('VAL-UNIV-015: Critical Slot Overflow Validation', () => {
    it('should pass when all locations are within slot limits', () => {
      const unit = createBaseUnit({
        slotsByLocation: {
          'Head': { used: 4, max: 6, displayName: 'Head' },
          'Center Torso': { used: 10, max: 12, displayName: 'Center Torso' },
          'Left Arm': { used: 8, max: 12, displayName: 'Left Arm' },
        },
      });
      const result = CriticalSlotOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should emit critical error when any location exceeds slot limit', () => {
      const unit = createBaseUnit({
        slotsByLocation: {
          'Head': { used: 8, max: 6, displayName: 'Head' },
          'Center Torso': { used: 10, max: 12, displayName: 'Center Torso' },
        },
      });
      const result = CriticalSlotOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Head');
      expect(result.errors[0].message).toContain('exceeds slot capacity');
      expect(result.errors[0].message).toContain('2');
    });

    it('should emit errors for multiple locations exceeding limits', () => {
      const unit = createBaseUnit({
        slotsByLocation: {
          'Head': { used: 8, max: 6, displayName: 'Head' },
          'Left Arm': { used: 14, max: 12, displayName: 'Left Arm' },
        },
      });
      const result = CriticalSlotOverflowValidation.validate(createContext(unit));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should skip validation when slot data is undefined', () => {
      const unit = createBaseUnit();
      const context = createContext(unit);
      expect(CriticalSlotOverflowValidation.canValidate!(context)).toBe(false);
    });

    it('should validate when slot data is defined', () => {
      const unit = createBaseUnit({
        slotsByLocation: {
          'Head': { used: 4, max: 6, displayName: 'Head' },
        },
      });
      const context = createContext(unit);
      expect(CriticalSlotOverflowValidation.canValidate!(context)).toBe(true);
    });
  });
});
