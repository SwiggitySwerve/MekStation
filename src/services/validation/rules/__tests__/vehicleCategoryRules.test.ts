/**
 * Vehicle Category Validation Rules Tests
 *
 * Tests for vehicle category validation rules including
 * engine, motive system, turret capacity, VTOL rotor, and tonnage validation.
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
  VehicleEngineRequired,
  VehicleMotiveSystemRequired,
  VehicleTurretCapacity,
  VTOLRotorRequired,
  VehicleTonnageRange,
  VEHICLE_CATEGORY_RULES,
} from '../vehicle/VehicleCategoryRules';

// =============================================================================
// Test Helpers
// =============================================================================

interface IVehicleTestUnit extends IValidatableUnit {
  engine?: { type: string; rating: number };
  motiveSystem?: { type: string };
  rotor?: { type: string };
  turret?: {
    capacity: number;
    usedWeight: number;
  };
}

function createVehicleUnit(overrides: Partial<IVehicleTestUnit> = {}): IVehicleTestUnit {
  return {
    id: 'test-vehicle-1',
    name: 'Test Vehicle',
    unitType: UnitType.VEHICLE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 1000000,
    battleValue: 600,
    engine: { type: 'Fusion', rating: 200 },
    motiveSystem: { type: 'Tracked' },
    ...overrides,
  };
}

function createVTOLUnit(overrides: Partial<IVehicleTestUnit> = {}): IVehicleTestUnit {
  return {
    id: 'test-vtol-1',
    name: 'Test VTOL',
    unitType: UnitType.VTOL,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 20,
    cost: 500000,
    battleValue: 400,
    engine: { type: 'Fusion', rating: 100 },
    motiveSystem: { type: 'VTOL' },
    rotor: { type: 'Standard' },
    ...overrides,
  };
}

function createSupportVehicleUnit(overrides: Partial<IVehicleTestUnit> = {}): IVehicleTestUnit {
  return {
    id: 'test-support-vehicle-1',
    name: 'Test Support Vehicle',
    unitType: UnitType.SUPPORT_VEHICLE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 100,
    cost: 2000000,
    battleValue: 300,
    engine: { type: 'ICE', rating: 150 },
    motiveSystem: { type: 'Wheeled' },
    ...overrides,
  };
}

function createTestContext(
  unit: IValidatableUnit,
  category: UnitCategory = UnitCategory.VEHICLE
): IUnitValidationContext {
  return {
    unit,
    unitType: unit.unitType,
    unitCategory: category,
    techBase: unit.techBase,
    options: {},
    cache: new Map(),
  };
}

// =============================================================================
// VEHICLE_CATEGORY_RULES Export Tests
// =============================================================================

describe('Vehicle Category Rules', () => {
  describe('VEHICLE_CATEGORY_RULES export', () => {
    it('should export all vehicle rules', () => {
      expect(VEHICLE_CATEGORY_RULES).toBeDefined();
      expect(VEHICLE_CATEGORY_RULES.length).toBe(5);
    });

    it('should contain all expected rule IDs', () => {
      const ruleIds = VEHICLE_CATEGORY_RULES.map((r) => r.id);
      expect(ruleIds).toContain('VAL-VEH-001');
      expect(ruleIds).toContain('VAL-VEH-002');
      expect(ruleIds).toContain('VAL-VEH-003');
      expect(ruleIds).toContain('VAL-VEH-004');
      expect(ruleIds).toContain('VAL-VEH-005');
    });

    it('should have rules in correct order', () => {
      expect(VEHICLE_CATEGORY_RULES[0].id).toBe('VAL-VEH-001');
      expect(VEHICLE_CATEGORY_RULES[1].id).toBe('VAL-VEH-002');
      expect(VEHICLE_CATEGORY_RULES[2].id).toBe('VAL-VEH-003');
      expect(VEHICLE_CATEGORY_RULES[3].id).toBe('VAL-VEH-004');
      expect(VEHICLE_CATEGORY_RULES[4].id).toBe('VAL-VEH-005');
    });
  });

  // =============================================================================
  // VAL-VEH-001: Engine Required
  // =============================================================================

  describe('VAL-VEH-001: Engine Required', () => {
    it('should have correct metadata', () => {
      expect(VehicleEngineRequired.id).toBe('VAL-VEH-001');
      expect(VehicleEngineRequired.name).toBe('Engine Required');
      expect(VehicleEngineRequired.priority).toBe(30);
      expect(VehicleEngineRequired.applicableUnitTypes).toContain(UnitType.VEHICLE);
      expect(VehicleEngineRequired.applicableUnitTypes).toContain(UnitType.VTOL);
      expect(VehicleEngineRequired.applicableUnitTypes).toContain(UnitType.SUPPORT_VEHICLE);
    });

    describe('with Vehicle unit', () => {
      it('should pass when engine is present', () => {
        const unit = createVehicleUnit({ engine: { type: 'Fusion', rating: 200 } });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when engine is missing', () => {
        const unit = createVehicleUnit({ engine: undefined });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
        expect(result.errors[0].field).toBe('engine');
        expect(result.errors[0].suggestion).toContain('Select an engine');
      });
    });

    describe('with VTOL unit', () => {
      it('should pass when engine is present', () => {
        const unit = createVTOLUnit({ engine: { type: 'Fusion', rating: 100 } });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when engine is missing', () => {
        const unit = createVTOLUnit({ engine: undefined });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
      });
    });

    describe('with Support Vehicle unit', () => {
      it('should pass when engine is present', () => {
        const unit = createSupportVehicleUnit({ engine: { type: 'ICE', rating: 150 } });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when engine is missing', () => {
        const unit = createSupportVehicleUnit({ engine: undefined });
        const context = createTestContext(unit);
        const result = VehicleEngineRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });
    });

    describe('with non-vehicle unit types', () => {
      it('should pass for BattleMech (not a vehicle type)', () => {
        const unit = createVehicleUnit({
          unitType: UnitType.BATTLEMECH,
          engine: undefined,
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = VehicleEngineRequired.validate(context);

        // Should pass because isVehicleUnit returns false
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });
  });

  // =============================================================================
  // VAL-VEH-002: Motive System Required
  // =============================================================================

  describe('VAL-VEH-002: Motive System Required', () => {
    it('should have correct metadata', () => {
      expect(VehicleMotiveSystemRequired.id).toBe('VAL-VEH-002');
      expect(VehicleMotiveSystemRequired.name).toBe('Motive System Required');
      expect(VehicleMotiveSystemRequired.priority).toBe(31);
    });

    describe('with Vehicle unit', () => {
      it('should pass when motive system is present (Tracked)', () => {
        const unit = createVehicleUnit({ motiveSystem: { type: 'Tracked' } });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass with Wheeled motive system', () => {
        const unit = createVehicleUnit({ motiveSystem: { type: 'Wheeled' } });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass with Hover motive system', () => {
        const unit = createVehicleUnit({ motiveSystem: { type: 'Hover' } });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when motive system is missing', () => {
        const unit = createVehicleUnit({ motiveSystem: undefined });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
        expect(result.errors[0].field).toBe('motiveSystem');
        expect(result.errors[0].suggestion).toContain('Wheeled');
        expect(result.errors[0].suggestion).toContain('Tracked');
      });
    });

    describe('with VTOL unit', () => {
      it('should pass when motive system is present', () => {
        const unit = createVTOLUnit({ motiveSystem: { type: 'VTOL' } });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when motive system is missing', () => {
        const unit = createVTOLUnit({ motiveSystem: undefined });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });
    });

    describe('with Support Vehicle unit', () => {
      it('should pass when motive system is present', () => {
        const unit = createSupportVehicleUnit({ motiveSystem: { type: 'Naval' } });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when motive system is missing', () => {
        const unit = createSupportVehicleUnit({ motiveSystem: undefined });
        const context = createTestContext(unit);
        const result = VehicleMotiveSystemRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });
    });
  });

  // =============================================================================
  // VAL-VEH-003: Turret Capacity Limits
  // =============================================================================

  describe('VAL-VEH-003: Turret Capacity Limits', () => {
    it('should have correct metadata', () => {
      expect(VehicleTurretCapacity.id).toBe('VAL-VEH-003');
      expect(VehicleTurretCapacity.name).toBe('Turret Capacity Limits');
      expect(VehicleTurretCapacity.priority).toBe(32);
      expect(VehicleTurretCapacity.applicableUnitTypes).toContain(UnitType.VEHICLE);
      expect(VehicleTurretCapacity.applicableUnitTypes).toContain(UnitType.SUPPORT_VEHICLE);
      // VTOLs should not be in applicableUnitTypes for turret capacity
      expect(VehicleTurretCapacity.applicableUnitTypes).not.toContain(UnitType.VTOL);
    });

    describe('canValidate', () => {
      it('should return true when turret is present', () => {
        const unit = createVehicleUnit({ turret: { capacity: 10, usedWeight: 5 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.canValidate!(context);

        expect(result).toBe(true);
      });

      it('should return false when turret is not present', () => {
        const unit = createVehicleUnit({ turret: undefined });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.canValidate!(context);

        expect(result).toBe(false);
      });

      it('should return false for non-vehicle types', () => {
        const unit = createVehicleUnit({
          unitType: UnitType.BATTLEMECH,
          turret: { capacity: 10, usedWeight: 5 },
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = VehicleTurretCapacity.canValidate!(context);

        expect(result).toBe(false);
      });
    });

    describe('validate', () => {
      it('should pass when turret weight is within capacity', () => {
        const unit = createVehicleUnit({ turret: { capacity: 10, usedWeight: 5 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass when turret weight equals capacity', () => {
        const unit = createVehicleUnit({ turret: { capacity: 10, usedWeight: 10 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when turret weight exceeds capacity', () => {
        const unit = createVehicleUnit({ turret: { capacity: 10, usedWeight: 15 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.ERROR);
        expect(result.errors[0].message).toContain('5.00');
        expect(result.errors[0].field).toBe('turret.usedWeight');
        expect(result.errors[0].expected).toBe('<= 10');
        expect(result.errors[0].actual).toBe('15');
      });

      it('should calculate correct overflow amount', () => {
        const unit = createVehicleUnit({ turret: { capacity: 8.5, usedWeight: 12.75 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('4.25');
      });

      it('should pass when no turret is present', () => {
        const unit = createVehicleUnit({ turret: undefined });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should work with Support Vehicle', () => {
        const unit = createSupportVehicleUnit({ turret: { capacity: 20, usedWeight: 25 } });
        const context = createTestContext(unit);
        const result = VehicleTurretCapacity.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });
    });
  });

  // =============================================================================
  // VAL-VEH-004: VTOL Rotor Required
  // =============================================================================

  describe('VAL-VEH-004: VTOL Rotor Required', () => {
    it('should have correct metadata', () => {
      expect(VTOLRotorRequired.id).toBe('VAL-VEH-004');
      expect(VTOLRotorRequired.name).toBe('VTOL Rotor Required');
      expect(VTOLRotorRequired.priority).toBe(33);
      expect(VTOLRotorRequired.applicableUnitTypes).toEqual([UnitType.VTOL]);
    });

    describe('with VTOL unit', () => {
      it('should pass when rotor is present', () => {
        const unit = createVTOLUnit({ rotor: { type: 'Standard' } });
        const context = createTestContext(unit);
        const result = VTOLRotorRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when rotor is missing', () => {
        const unit = createVTOLUnit({ rotor: undefined });
        const context = createTestContext(unit);
        const result = VTOLRotorRequired.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
        expect(result.errors[0].message).toContain('rotor system');
        expect(result.errors[0].field).toBe('rotor');
        expect(result.errors[0].suggestion).toContain('Add a rotor system');
      });
    });

    describe('with non-VTOL vehicle types', () => {
      it('should pass for regular Vehicle without rotor', () => {
        const unit = createVehicleUnit({ rotor: undefined });
        const context = createTestContext(unit);
        const result = VTOLRotorRequired.validate(context);

        // Should pass because unit.unitType !== UnitType.VTOL
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass for Support Vehicle without rotor', () => {
        const unit = createSupportVehicleUnit({ rotor: undefined });
        const context = createTestContext(unit);
        const result = VTOLRotorRequired.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });
  });

  // =============================================================================
  // VAL-VEH-005: Vehicle Tonnage Range
  // =============================================================================

  describe('VAL-VEH-005: Vehicle Tonnage Range', () => {
    it('should have correct metadata', () => {
      expect(VehicleTonnageRange.id).toBe('VAL-VEH-005');
      expect(VehicleTonnageRange.name).toBe('Vehicle Tonnage Range');
      expect(VehicleTonnageRange.priority).toBe(34);
      expect(VehicleTonnageRange.applicableUnitTypes).toContain(UnitType.VEHICLE);
      expect(VehicleTonnageRange.applicableUnitTypes).toContain(UnitType.VTOL);
      expect(VehicleTonnageRange.applicableUnitTypes).toContain(UnitType.SUPPORT_VEHICLE);
    });

    describe('Vehicle tonnage (1-100 tons)', () => {
      it('should pass at minimum tonnage (1 ton)', () => {
        const unit = createVehicleUnit({ weight: 1 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass at maximum tonnage (100 tons)', () => {
        const unit = createVehicleUnit({ weight: 100 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass at typical tonnage (50 tons)', () => {
        const unit = createVehicleUnit({ weight: 50 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail below minimum tonnage', () => {
        const unit = createVehicleUnit({ weight: 0 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.CRITICAL_ERROR);
        expect(result.errors[0].message).toContain('1-100');
        expect(result.errors[0].expected).toBe('1-100');
        expect(result.errors[0].actual).toBe('0');
      });

      it('should fail above maximum tonnage', () => {
        const unit = createVehicleUnit({ weight: 101 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('1-100');
      });
    });

    describe('VTOL tonnage (1-30 tons)', () => {
      it('should pass at minimum tonnage (1 ton)', () => {
        const unit = createVTOLUnit({ weight: 1 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at maximum tonnage (30 tons)', () => {
        const unit = createVTOLUnit({ weight: 30 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at typical tonnage (20 tons)', () => {
        const unit = createVTOLUnit({ weight: 20 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail below minimum tonnage', () => {
        const unit = createVTOLUnit({ weight: 0 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('1-30');
      });

      it('should fail above maximum tonnage', () => {
        const unit = createVTOLUnit({ weight: 31 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('1-30');
        expect(result.errors[0].expected).toBe('1-30');
        expect(result.errors[0].actual).toBe('31');
      });
    });

    describe('Support Vehicle tonnage (1-300 tons)', () => {
      it('should pass at minimum tonnage (1 ton)', () => {
        const unit = createSupportVehicleUnit({ weight: 1 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at maximum tonnage (300 tons)', () => {
        const unit = createSupportVehicleUnit({ weight: 300 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass at typical tonnage (100 tons)', () => {
        const unit = createSupportVehicleUnit({ weight: 100 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail below minimum tonnage', () => {
        const unit = createSupportVehicleUnit({ weight: 0 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('1-300');
      });

      it('should fail above maximum tonnage', () => {
        const unit = createSupportVehicleUnit({ weight: 301 });
        const context = createTestContext(unit);
        const result = VehicleTonnageRange.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors[0].message).toContain('1-300');
        expect(result.errors[0].expected).toBe('1-300');
        expect(result.errors[0].actual).toBe('301');
      });
    });

    describe('with non-vehicle unit types', () => {
      it('should pass for BattleMech (not validated by this rule)', () => {
        const unit = createVehicleUnit({
          unitType: UnitType.BATTLEMECH,
          weight: 500, // Invalid for a mech but this rule doesn't apply
        });
        const context = createTestContext(unit, UnitCategory.MECH);
        const result = VehicleTonnageRange.validate(context);

        // Should pass because isVehicleType returns false
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration Tests', () => {
    it('should validate a fully valid Vehicle', () => {
      const unit = createVehicleUnit({
        weight: 50,
        engine: { type: 'Fusion', rating: 200 },
        motiveSystem: { type: 'Tracked' },
        turret: { capacity: 10, usedWeight: 8 },
      });
      const context = createTestContext(unit);

      for (const rule of VEHICLE_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should validate a fully valid VTOL', () => {
      const unit = createVTOLUnit({
        weight: 20,
        engine: { type: 'Fusion', rating: 100 },
        motiveSystem: { type: 'VTOL' },
        rotor: { type: 'Standard' },
      });
      const context = createTestContext(unit);

      for (const rule of VEHICLE_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should validate a fully valid Support Vehicle', () => {
      const unit = createSupportVehicleUnit({
        weight: 150,
        engine: { type: 'ICE', rating: 200 },
        motiveSystem: { type: 'Naval' },
      });
      const context = createTestContext(unit);

      for (const rule of VEHICLE_CATEGORY_RULES) {
        const result = rule.validate(context);
        expect(result.passed).toBe(true);
      }
    });

    it('should catch multiple validation failures', () => {
      const unit = createVehicleUnit({
        weight: 150, // Invalid: exceeds max 100 tons
        engine: undefined, // Invalid: no engine
        motiveSystem: undefined, // Invalid: no motive system
        turret: { capacity: 5, usedWeight: 10 }, // Invalid: over capacity
      });
      const context = createTestContext(unit);

      const failedRules: string[] = [];
      for (const rule of VEHICLE_CATEGORY_RULES) {
        const result = rule.validate(context);
        if (!result.passed) {
          failedRules.push(rule.id);
        }
      }

      expect(failedRules).toContain('VAL-VEH-001'); // Engine
      expect(failedRules).toContain('VAL-VEH-002'); // Motive System
      expect(failedRules).toContain('VAL-VEH-003'); // Turret Capacity
      expect(failedRules).toContain('VAL-VEH-005'); // Tonnage Range
    });
  });
});
