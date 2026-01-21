/**
 * Aerospace Validation Rules Tests
 *
 * Tests for aerospace category validation rules including
 * thrust/weight ratio, fuel capacity, and weapon arc validation.
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IValidatableUnit,
  IUnitValidationContext,
  UnitCategory,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import {
  AeroEngineRequired,
  AeroThrustRatingValid,
  AeroStructuralIntegrityRequired,
  AeroFuelCapacityValid,
  AeroThrustWeightRatio,
  AeroMinFuelCapacity,
  AeroMaxFuelCapacity,
  AeroWeaponArcAssignments,
  AeroRearArcWeaponRestrictions,
  AEROSPACE_CATEGORY_RULES,
} from '../aerospace/AerospaceCategoryRules';

// =============================================================================
// Test Helpers
// =============================================================================

interface IAerospaceTestUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  thrust?: number;
  structuralIntegrity?: number;
  fuelCapacity?: number;
  maxFuelCapacity?: number;
  weapons?: Array<{
    id: string;
    name: string;
    arc?: 'nose' | 'left-wing' | 'right-wing' | 'aft';
    isRearMounting?: boolean;
  }>;
}

function createAerospaceUnit(overrides: Partial<IAerospaceTestUnit> = {}): IAerospaceTestUnit {
  return {
    id: 'test-aero-1',
    name: 'Test Aerospace Fighter',
    unitType: UnitType.AEROSPACE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 5000000,
    battleValue: 1200,
    engine: { type: 'Fusion', rating: 200 },
    thrust: 6,
    structuralIntegrity: 5,
    fuelCapacity: 800, // 10 tons worth = 800 fuel points
    ...overrides,
  };
}

function createTestContext(unit: IValidatableUnit): IUnitValidationContext {
  return {
    unit,
    unitType: unit.unitType,
    unitCategory: UnitCategory.AEROSPACE,
    techBase: unit.techBase,
    options: {},
    cache: new Map(),
  };
}

// =============================================================================
// Basic Rules Tests
// =============================================================================

describe('Aerospace Category Rules', () => {
  describe('AEROSPACE_CATEGORY_RULES export', () => {
    it('should export all aerospace rules', () => {
      expect(AEROSPACE_CATEGORY_RULES).toBeDefined();
      expect(AEROSPACE_CATEGORY_RULES.length).toBe(9);
    });

    it('should contain all expected rule IDs', () => {
      const ruleIds = AEROSPACE_CATEGORY_RULES.map((r) => r.id);
      expect(ruleIds).toContain('VAL-AERO-001');
      expect(ruleIds).toContain('VAL-AERO-002');
      expect(ruleIds).toContain('VAL-AERO-003');
      expect(ruleIds).toContain('VAL-AERO-004');
      expect(ruleIds).toContain('AERO-THRUST-001');
      expect(ruleIds).toContain('AERO-FUEL-001');
      expect(ruleIds).toContain('AERO-FUEL-002');
      expect(ruleIds).toContain('AERO-ARC-001');
      expect(ruleIds).toContain('AERO-ARC-002');
    });
  });

  describe('VAL-AERO-001: Engine Required', () => {
    it('should pass when engine is present', () => {
      const unit = createAerospaceUnit({ engine: { type: 'Fusion', rating: 200 } });
      const context = createTestContext(unit);
      const result = AeroEngineRequired.validate(context);

      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail when engine is missing', () => {
      const unit = createAerospaceUnit({ engine: undefined });
      const context = createTestContext(unit);
      const result = AeroEngineRequired.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
    });
  });

  describe('VAL-AERO-002: Thrust Rating Valid', () => {
    it('should pass with valid thrust rating', () => {
      const unit = createAerospaceUnit({ thrust: 6 });
      const context = createTestContext(unit);
      const result = AeroThrustRatingValid.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with zero thrust', () => {
      const unit = createAerospaceUnit({ thrust: 0 });
      const context = createTestContext(unit);
      const result = AeroThrustRatingValid.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
    });

    it('should fail with negative thrust', () => {
      const unit = createAerospaceUnit({ thrust: -1 });
      const context = createTestContext(unit);
      const result = AeroThrustRatingValid.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should fail with undefined thrust', () => {
      const unit = createAerospaceUnit({ thrust: undefined });
      const context = createTestContext(unit);
      const result = AeroThrustRatingValid.validate(context);

      expect(result.passed).toBe(false);
    });
  });

  describe('VAL-AERO-003: Structural Integrity Required', () => {
    it('should pass with positive structural integrity', () => {
      const unit = createAerospaceUnit({ structuralIntegrity: 5 });
      const context = createTestContext(unit);
      const result = AeroStructuralIntegrityRequired.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with zero structural integrity', () => {
      const unit = createAerospaceUnit({ structuralIntegrity: 0 });
      const context = createTestContext(unit);
      const result = AeroStructuralIntegrityRequired.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].severity).toBe(UnitValidationSeverity.ERROR);
    });
  });

  describe('VAL-AERO-004: Fuel Capacity Valid', () => {
    it('should pass with positive fuel capacity', () => {
      const unit = createAerospaceUnit({ fuelCapacity: 800 });
      const context = createTestContext(unit);
      const result = AeroFuelCapacityValid.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should pass with zero fuel capacity', () => {
      const unit = createAerospaceUnit({ fuelCapacity: 0 });
      const context = createTestContext(unit);
      const result = AeroFuelCapacityValid.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with negative fuel capacity', () => {
      const unit = createAerospaceUnit({ fuelCapacity: -100 });
      const context = createTestContext(unit);
      const result = AeroFuelCapacityValid.validate(context);

      expect(result.passed).toBe(false);
    });
  });
});

// =============================================================================
// Advanced Rules Tests (AERO-*)
// =============================================================================

describe('Advanced Aerospace Rules', () => {
  describe('AERO-THRUST-001: Thrust/Weight Ratio', () => {
    it('should pass with adequate thrust for weight', () => {
      // 50 ton unit, needs thrust >= 5 (0.1 * 50)
      const unit = createAerospaceUnit({ weight: 50, thrust: 6 });
      const context = createTestContext(unit);
      const result = AeroThrustWeightRatio.validate(context);

      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail with insufficient thrust for weight', () => {
      // 50 ton unit, needs thrust >= 5 (0.1 * 50), only has 3
      const unit = createAerospaceUnit({ weight: 50, thrust: 3 });
      const context = createTestContext(unit);
      const result = AeroThrustWeightRatio.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain('Thrust/weight ratio too low');
    });

    it('should warn with marginally adequate thrust', () => {
      // 50 ton unit with exactly minimum thrust (5)
      const unit = createAerospaceUnit({ weight: 50, thrust: 5 });
      const context = createTestContext(unit);
      const result = AeroThrustWeightRatio.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].severity).toBe(UnitValidationSeverity.WARNING);
    });
  });

  describe('AERO-FUEL-001: Minimum Fuel Capacity', () => {
    it('should pass with adequate fuel', () => {
      // 50 ton unit needs 20% = 10 tons = 800 fuel points
      const unit = createAerospaceUnit({ weight: 50, fuelCapacity: 800 });
      const context = createTestContext(unit);
      const result = AeroMinFuelCapacity.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with insufficient fuel', () => {
      // 50 ton unit needs 800 fuel points, only has 400
      const unit = createAerospaceUnit({ weight: 50, fuelCapacity: 400 });
      const context = createTestContext(unit);
      const result = AeroMinFuelCapacity.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Fuel capacity too low');
    });

    it('should warn with marginally adequate fuel', () => {
      // 50 ton unit with exactly minimum fuel (800 points)
      const unit = createAerospaceUnit({ weight: 50, fuelCapacity: 800 });
      const context = createTestContext(unit);
      const result = AeroMinFuelCapacity.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('AERO-FUEL-002: Maximum Fuel Capacity', () => {
    it('should pass when under max fuel', () => {
      const unit = createAerospaceUnit({
        fuelCapacity: 800,
        maxFuelCapacity: 1000,
      });
      const context = createTestContext(unit);
      const result = AeroMaxFuelCapacity.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail when over max fuel', () => {
      const unit = createAerospaceUnit({
        fuelCapacity: 1200,
        maxFuelCapacity: 1000,
      });
      const context = createTestContext(unit);
      const result = AeroMaxFuelCapacity.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('exceeds maximum');
    });

    it('should pass when no max is defined', () => {
      const unit = createAerospaceUnit({
        fuelCapacity: 2000,
        maxFuelCapacity: undefined,
      });
      const context = createTestContext(unit);
      const result = AeroMaxFuelCapacity.validate(context);

      expect(result.passed).toBe(true);
    });
  });

  describe('AERO-ARC-001: Weapon Arc Assignments', () => {
    it('should pass with valid arc assignments', () => {
      const unit = createAerospaceUnit({
        weapons: [
          { id: 'w1', name: 'Large Laser', arc: 'nose' },
          { id: 'w2', name: 'Medium Laser', arc: 'left-wing' },
          { id: 'w3', name: 'Medium Laser', arc: 'right-wing' },
        ],
      });
      const context = createTestContext(unit);
      const result = AeroWeaponArcAssignments.validate(context);

      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail when weapon has no arc', () => {
      const unit = createAerospaceUnit({
        weapons: [
          { id: 'w1', name: 'Large Laser' }, // Missing arc
        ],
      });
      const context = createTestContext(unit);
      const result = AeroWeaponArcAssignments.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('no arc assignment');
    });

    it('should fail when weapon has invalid arc', () => {
      const unit = createAerospaceUnit({
        weapons: [{ id: 'w1', name: 'Large Laser', arc: 'invalid' as 'nose' }],
      });
      const context = createTestContext(unit);
      const result = AeroWeaponArcAssignments.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('invalid arc');
    });

    it('should provide info when no weapons assigned', () => {
      const unit = createAerospaceUnit({ weapons: [] });
      const context = createTestContext(unit);
      const result = AeroWeaponArcAssignments.validate(context);

      expect(result.passed).toBe(true);
      expect(result.infos.length).toBe(1);
      expect(result.infos[0].message).toContain('no weapons');
    });
  });

  describe('AERO-ARC-002: Rear-Arc Weapon Restrictions', () => {
    it('should pass with valid rear-arc weapon count', () => {
      // 50 ton unit allows 1 rear weapon
      const unit = createAerospaceUnit({
        weight: 50,
        weapons: [
          { id: 'w1', name: 'Large Laser', arc: 'nose' },
          { id: 'w2', name: 'Small Laser', arc: 'aft' },
        ],
      });
      const context = createTestContext(unit);
      const result = AeroRearArcWeaponRestrictions.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should fail with too many rear-arc weapons for tonnage', () => {
      // 50 ton unit only allows 1 rear weapon
      const unit = createAerospaceUnit({
        weight: 50,
        weapons: [
          { id: 'w1', name: 'Small Laser', arc: 'aft' },
          { id: 'w2', name: 'Small Laser', arc: 'aft' },
        ],
      });
      const context = createTestContext(unit);
      const result = AeroRearArcWeaponRestrictions.validate(context);

      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toContain('Too many rear-arc weapons');
    });

    it('should count rear-mounted weapons toward limit', () => {
      // 50 ton unit only allows 1 rear weapon
      const unit = createAerospaceUnit({
        weight: 50,
        weapons: [
          { id: 'w1', name: 'Large Laser', arc: 'nose', isRearMounting: true },
          { id: 'w2', name: 'Small Laser', arc: 'aft' },
        ],
      });
      const context = createTestContext(unit);
      const result = AeroRearArcWeaponRestrictions.validate(context);

      expect(result.passed).toBe(false);
    });

    it('should allow more rear weapons on heavier units', () => {
      // 75 ton unit allows 2 rear weapons
      const unit = createAerospaceUnit({
        weight: 75,
        weapons: [
          { id: 'w1', name: 'Small Laser', arc: 'aft' },
          { id: 'w2', name: 'Small Laser', arc: 'aft' },
        ],
      });
      const context = createTestContext(unit);
      const result = AeroRearArcWeaponRestrictions.validate(context);

      expect(result.passed).toBe(true);
    });

    it('should warn when at max rear weapons', () => {
      // 50 ton unit at exactly max (1)
      const unit = createAerospaceUnit({
        weight: 50,
        weapons: [{ id: 'w1', name: 'Small Laser', arc: 'aft' }],
      });
      const context = createTestContext(unit);
      const result = AeroRearArcWeaponRestrictions.validate(context);

      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].message).toContain('at maximum');
    });
  });
});
