/**
 * Equipment Unit Type Validation Rules Tests
 *
 * Tests for equipment unit type validation rules including
 * unit type compatibility, location compatibility, turret mounting,
 * incompatible equipment, and required equipment checks.
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IValidatableUnit,
  IUnitValidationContext,
  UnitCategory,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  IValidatableEquipmentItem,
  EquipmentUnitTypeCompatibility,
  EquipmentLocationCompatibility,
  TurretMountingRequirements,
  IncompatibleEquipmentCheck,
  RequiredEquipmentCheck,
  EQUIPMENT_UNIT_TYPE_RULES,
} from '../EquipmentUnitTypeRules';

// =============================================================================
// Test Helpers
// =============================================================================

interface IEquipmentTestUnit extends IValidatableUnit {
  equipment?: readonly IValidatableEquipmentItem[];
  hasTurret?: boolean;
  heatSinkCount?: number;
}

function createTestUnit(overrides: Partial<IEquipmentTestUnit> = {}): IEquipmentTestUnit {
  return {
    id: 'test-unit-1',
    name: 'Test Unit',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3025,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 50,
    cost: 5000000,
    battleValue: 1200,
    ...overrides,
  };
}

function createEquipmentItem(
  overrides: Partial<IValidatableEquipmentItem> = {}
): IValidatableEquipmentItem {
  return {
    id: 'equip-1',
    equipmentId: 'test-equipment',
    name: 'Test Equipment',
    location: MechLocation.CENTER_TORSO,
    ...overrides,
  };
}

function createTestContext(
  unit: IValidatableUnit,
  unitCategory: UnitCategory = UnitCategory.MECH
): IUnitValidationContext {
  return {
    unit,
    unitType: unit.unitType,
    unitCategory,
    techBase: unit.techBase,
    options: {},
    cache: new Map(),
  };
}

// =============================================================================
// EQUIPMENT_UNIT_TYPE_RULES Export Tests
// =============================================================================

describe('Equipment Unit Type Rules', () => {
  describe('EQUIPMENT_UNIT_TYPE_RULES export', () => {
    it('should export all equipment unit type rules', () => {
      expect(EQUIPMENT_UNIT_TYPE_RULES).toBeDefined();
      expect(EQUIPMENT_UNIT_TYPE_RULES.length).toBe(5);
    });

    it('should contain all expected rule IDs', () => {
      const ruleIds = EQUIPMENT_UNIT_TYPE_RULES.map((r) => r.id);
      expect(ruleIds).toContain('VAL-EQUIP-UNIT-001');
      expect(ruleIds).toContain('VAL-EQUIP-UNIT-002');
      expect(ruleIds).toContain('VAL-EQUIP-UNIT-003');
      expect(ruleIds).toContain('VAL-EQUIP-UNIT-004');
      expect(ruleIds).toContain('VAL-EQUIP-UNIT-005');
    });

    it('should have correct priorities (ascending order)', () => {
      const priorities = EQUIPMENT_UNIT_TYPE_RULES.map((r) => r.priority);
      expect(priorities).toEqual([100, 101, 102, 103, 104]);
    });
  });

  // ===========================================================================
  // VAL-EQUIP-UNIT-001: Equipment Unit Type Compatibility
  // ===========================================================================

  describe('VAL-EQUIP-UNIT-001: Equipment Unit Type Compatibility', () => {
    describe('canValidate', () => {
      it('should return true when unit has equipment', () => {
        const unit = createTestUnit({
          equipment: [createEquipmentItem()],
        });
        const context = createTestContext(unit);
        expect(EquipmentUnitTypeCompatibility.canValidate!(context)).toBe(true);
      });

      it('should return false when unit has no equipment', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        expect(EquipmentUnitTypeCompatibility.canValidate!(context)).toBe(false);
      });

      it('should return false when equipment array is empty', () => {
        const unit = createTestUnit({ equipment: [] });
        const context = createTestContext(unit);
        expect(EquipmentUnitTypeCompatibility.canValidate!(context)).toBe(false);
      });
    });

    describe('validate', () => {
      it('should pass when equipment has no allowedUnitTypes (defaults to all standard)', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              allowedUnitTypes: undefined,
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass when unit type is in allowedUnitTypes', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.OMNIMECH],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when unit type is not in allowedUnitTypes', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              name: 'Vehicle-Only Equipment',
              allowedUnitTypes: [UnitType.VEHICLE, UnitType.VTOL],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].severity).toBe(UnitValidationSeverity.ERROR);
        expect(result.errors[0].message).toContain('Vehicle-Only Equipment');
        expect(result.errors[0].message).toContain('cannot be mounted');
      });

      it('should return passing result when equipment is undefined', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should validate multiple equipment items', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          equipment: [
            createEquipmentItem({
              id: 'equip-1',
              name: 'Compatible Equipment',
              allowedUnitTypes: [UnitType.VEHICLE],
            }),
            createEquipmentItem({
              id: 'equip-2',
              name: 'Mech-Only Equipment',
              allowedUnitTypes: [UnitType.BATTLEMECH],
            }),
            createEquipmentItem({
              id: 'equip-3',
              name: 'Also Compatible',
              allowedUnitTypes: [UnitType.VEHICLE, UnitType.VTOL],
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Mech-Only Equipment');
      });

      it('should include equipment details in error', () => {
        const unit = createTestUnit({
          unitType: UnitType.INFANTRY,
          equipment: [
            createEquipmentItem({
              id: 'mech-equip-1',
              equipmentId: 'equipment-def-123',
              name: 'Mech Equipment',
              location: MechLocation.LEFT_ARM,
              allowedUnitTypes: [UnitType.BATTLEMECH],
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.PERSONNEL);
        const result = EquipmentUnitTypeCompatibility.validate(context);

        expect(result.errors[0].field).toBe('equipment.mech-equip-1');
        expect(result.errors[0].actual).toBe(UnitType.INFANTRY);
        expect(result.errors[0].details?.equipmentId).toBe('equipment-def-123');
        expect(result.errors[0].details?.location).toBe(MechLocation.LEFT_ARM);
      });
    });
  });

  // ===========================================================================
  // VAL-EQUIP-UNIT-002: Equipment Location Compatibility
  // ===========================================================================

  describe('VAL-EQUIP-UNIT-002: Equipment Location Compatibility', () => {
    describe('canValidate', () => {
      it('should return true when unit has equipment', () => {
        const unit = createTestUnit({
          equipment: [createEquipmentItem()],
        });
        const context = createTestContext(unit);
        expect(EquipmentLocationCompatibility.canValidate!(context)).toBe(true);
      });

      it('should return false when unit has no equipment', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        expect(EquipmentLocationCompatibility.canValidate!(context)).toBe(false);
      });
    });

    describe('validate', () => {
      it('should pass when equipment is in valid location for mech', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              location: MechLocation.CENTER_TORSO,
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass when equipment is in valid location for vehicle', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          equipment: [
            createEquipmentItem({
              location: VehicleLocation.FRONT,
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when location is invalid for unit type', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          equipment: [
            createEquipmentItem({
              name: 'Misplaced Equipment',
              location: MechLocation.LEFT_ARM, // Invalid for vehicle
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('invalid location');
        expect(result.errors[0].message).toContain(MechLocation.LEFT_ARM);
      });

      it('should pass when equipment has no location restrictions', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              location: MechLocation.HEAD,
              allowedLocations: undefined,
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass when equipment is in an allowed location', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              location: MechLocation.HEAD,
              allowedLocations: [MechLocation.HEAD, MechLocation.CENTER_TORSO],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when equipment is not in allowed location', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              name: 'Restricted Equipment',
              location: MechLocation.LEFT_ARM,
              allowedLocations: [MechLocation.HEAD, MechLocation.CENTER_TORSO],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Restricted Equipment');
        expect(result.errors[0].message).toContain('cannot be mounted');
        expect(result.errors[0].suggestion).toContain('Head');
        expect(result.errors[0].suggestion).toContain('Center Torso');
      });

      it('should return passing result when equipment is undefined', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        const result = EquipmentLocationCompatibility.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should check unit type location first before equipment restrictions', () => {
        // If location is invalid for unit type, it should fail there
        // and not also check equipment-specific restrictions
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          equipment: [
            createEquipmentItem({
              name: 'Doubly Wrong Equipment',
              location: MechLocation.LEFT_ARM, // Invalid for vehicle
              allowedLocations: [MechLocation.HEAD], // Also not matching
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = EquipmentLocationCompatibility.validate(context);

        // Should only get one error (for unit type location), not two
        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('invalid location');
      });
    });
  });

  // ===========================================================================
  // VAL-EQUIP-UNIT-003: Turret Mounting Requirements
  // ===========================================================================

  describe('VAL-EQUIP-UNIT-003: Turret Mounting Requirements', () => {
    describe('canValidate', () => {
      it('should return true when unit has equipment', () => {
        const unit = createTestUnit({
          equipment: [createEquipmentItem()],
        });
        const context = createTestContext(unit);
        expect(TurretMountingRequirements.canValidate!(context)).toBe(true);
      });

      it('should return false when unit has no equipment', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        expect(TurretMountingRequirements.canValidate!(context)).toBe(false);
      });
    });

    describe('validate', () => {
      it('should pass when non-turret equipment on any unit type', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              isTurretMounted: false,
              flags: [],
              location: MechLocation.CENTER_TORSO,
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should pass when turret-mounted equipment on vehicle', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          hasTurret: true,
          equipment: [
            createEquipmentItem({
              isTurretMounted: true,
              location: 'Turret',
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass when turret-mounted equipment on VTOL', () => {
        const unit = createTestUnit({
          unitType: UnitType.VTOL,
          hasTurret: true,
          equipment: [
            createEquipmentItem({
              isTurretMounted: true,
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass when turret-mounted equipment on support vehicle', () => {
        const unit = createTestUnit({
          unitType: UnitType.SUPPORT_VEHICLE,
          hasTurret: true,
          equipment: [
            createEquipmentItem({
              isTurretMounted: true,
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should fail when turret-mounted equipment on BattleMech (via isTurretMounted)', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              name: 'Turret Weapon',
              isTurretMounted: true,
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('requires turret mount');
        expect(result.errors[0].message).toContain('cannot have turrets');
      });

      it('should fail when turret-mounted equipment on BattleMech (via flag)', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          equipment: [
            createEquipmentItem({
              name: 'Flagged Turret Weapon',
              flags: [EquipmentBehaviorFlag.TurretMounted],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Flagged Turret Weapon');
      });

      it('should fail when equipment in Turret location on non-turret-capable unit', () => {
        const unit = createTestUnit({
          unitType: UnitType.AEROSPACE,
          equipment: [
            createEquipmentItem({
              name: 'Turret Location Weapon',
              location: 'Turret',
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.AEROSPACE);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });

      it('should fail when vehicle has turret equipment but no turret installed', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          hasTurret: false,
          equipment: [
            createEquipmentItem({
              name: 'Turret Weapon',
              isTurretMounted: true,
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('no turret installed');
      });

      it('should return passing result when equipment is undefined', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        const result = TurretMountingRequirements.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should pass when vehicle does not have hasTurret defined (undefined)', () => {
        // When hasTurret is undefined (not explicitly false), don't error
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          // hasTurret not set - undefined
          equipment: [
            createEquipmentItem({
              isTurretMounted: true,
            }),
          ],
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = TurretMountingRequirements.validate(context);

        // Should pass because hasTurret is undefined, not explicitly false
        expect(result.passed).toBe(true);
      });
    });
  });

  // ===========================================================================
  // VAL-EQUIP-UNIT-004: Incompatible Equipment Check
  // ===========================================================================

  describe('VAL-EQUIP-UNIT-004: Incompatible Equipment Check', () => {
    describe('canValidate', () => {
      it('should return true when unit has more than one equipment', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({ id: 'equip-1' }),
            createEquipmentItem({ id: 'equip-2' }),
          ],
        });
        const context = createTestContext(unit);
        expect(IncompatibleEquipmentCheck.canValidate!(context)).toBe(true);
      });

      it('should return false when unit has only one equipment', () => {
        const unit = createTestUnit({
          equipment: [createEquipmentItem()],
        });
        const context = createTestContext(unit);
        expect(IncompatibleEquipmentCheck.canValidate!(context)).toBe(false);
      });

      it('should return false when unit has no equipment', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        expect(IncompatibleEquipmentCheck.canValidate!(context)).toBe(false);
      });
    });

    describe('validate', () => {
      it('should pass when no incompatible equipment present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'equip-1',
              name: 'Heat Sink',
              flags: [EquipmentBehaviorFlag.HeatSink],
            }),
            createEquipmentItem({
              id: 'equip-2',
              name: 'Jump Jet',
              flags: [EquipmentBehaviorFlag.JumpJet],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should fail when MASC and TSM are both present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'masc-1',
              name: 'MASC',
              flags: [EquipmentBehaviorFlag.Masc],
            }),
            createEquipmentItem({
              id: 'tsm-1',
              name: 'Triple Strength Myomer',
              flags: [EquipmentBehaviorFlag.Tsm],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('MASC cannot be combined with Triple Strength Myomer');
      });

      it('should fail when MASC and Industrial TSM are both present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'masc-1',
              name: 'MASC',
              flags: [EquipmentBehaviorFlag.Masc],
            }),
            createEquipmentItem({
              id: 'itsm-1',
              name: 'Industrial TSM',
              flags: [EquipmentBehaviorFlag.IndustrialTsm],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });

      it('should fail when TSM and Industrial TSM are both present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'tsm-1',
              name: 'TSM',
              flags: [EquipmentBehaviorFlag.Tsm],
            }),
            createEquipmentItem({
              id: 'itsm-1',
              name: 'Industrial TSM',
              flags: [EquipmentBehaviorFlag.IndustrialTsm],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Standard TSM cannot be combined with Industrial TSM');
      });

      it('should fail when C3 Slave and C3 Improved are both present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'c3s-1',
              name: 'C3 Slave',
              flags: [EquipmentBehaviorFlag.C3s],
            }),
            createEquipmentItem({
              id: 'c3i-1',
              name: 'C3 Improved',
              flags: [EquipmentBehaviorFlag.C3i],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('C3 Slave cannot be combined with C3 Improved');
      });

      it('should fail when Stealth armor and Heat Sink are both present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'stealth-1',
              name: 'Stealth Armor',
              flags: [EquipmentBehaviorFlag.Stealth],
            }),
            createEquipmentItem({
              id: 'hs-1',
              name: 'Heat Sink',
              flags: [EquipmentBehaviorFlag.HeatSink],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].message).toContain('Stealth armor has special heat sink requirements');
      });

      it('should return passing result when equipment is undefined', () => {
        const unit = createTestUnit({ equipment: undefined });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should return passing result when only one equipment present', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              flags: [EquipmentBehaviorFlag.Masc],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
      });

      it('should detect incompatibility via equipment ID as well as flags', () => {
        // If an equipment ID matches the incompatibility source
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'equip-1',
              equipmentId: EquipmentBehaviorFlag.Masc,
              name: 'MASC by ID',
            }),
            createEquipmentItem({
              id: 'equip-2',
              name: 'TSM by Flag',
              flags: [EquipmentBehaviorFlag.Tsm],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(1);
      });

      it('should include suggestion with equipment names in error', () => {
        const unit = createTestUnit({
          equipment: [
            createEquipmentItem({
              id: 'masc-1',
              name: 'My MASC',
              flags: [EquipmentBehaviorFlag.Masc],
            }),
            createEquipmentItem({
              id: 'tsm-1',
              name: 'My TSM',
              flags: [EquipmentBehaviorFlag.Tsm],
            }),
          ],
        });
        const context = createTestContext(unit);
        const result = IncompatibleEquipmentCheck.validate(context);

        expect(result.errors[0].suggestion).toContain('My MASC');
        expect(result.errors[0].suggestion).toContain('My TSM');
      });
    });
  });

  // ===========================================================================
  // VAL-EQUIP-UNIT-005: Required Equipment Check
  // ===========================================================================

  describe('VAL-EQUIP-UNIT-005: Required Equipment Check', () => {
    describe('validate', () => {
      it('should pass when mech has 10+ heat sinks', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          heatSinkCount: 10,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      });

      it('should warn when BattleMech has less than 10 heat sinks', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          heatSinkCount: 5,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true); // Warnings don't fail
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0].severity).toBe(UnitValidationSeverity.WARNING);
        expect(result.warnings[0].message).toContain('requires minimum 10 heat sinks');
      });

      it('should warn when OmniMech has less than 10 heat sinks', () => {
        const unit = createTestUnit({
          unitType: UnitType.OMNIMECH,
          heatSinkCount: 8,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0].message).toContain('OmniMech');
      });

      it('should warn when IndustrialMech has less than 10 heat sinks', () => {
        const unit = createTestUnit({
          unitType: UnitType.INDUSTRIALMECH,
          heatSinkCount: 3,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0].message).toContain('IndustrialMech');
      });

      it('should not warn for vehicles (no heat sink requirement)', () => {
        const unit = createTestUnit({
          unitType: UnitType.VEHICLE,
          heatSinkCount: 0,
        });
        const context = createTestContext(unit, UnitCategory.VEHICLE);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      });

      it('should not warn for aerospace (no heat sink requirement in this rule)', () => {
        const unit = createTestUnit({
          unitType: UnitType.AEROSPACE,
          heatSinkCount: 0,
        });
        const context = createTestContext(unit, UnitCategory.AEROSPACE);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(0);
      });

      it('should treat undefined heatSinkCount as 0', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          heatSinkCount: undefined,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.warnings.length).toBe(1);
        expect(result.warnings[0].actual).toBe('0');
      });

      it('should include condition details in warning', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          heatSinkCount: 5,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.warnings[0].details?.condition).toContain('integral heat sinks');
      });

      it('should include suggestion in warning', () => {
        const unit = createTestUnit({
          unitType: UnitType.BATTLEMECH,
          heatSinkCount: 5,
        });
        const context = createTestContext(unit);
        const result = RequiredEquipmentCheck.validate(context);

        expect(result.warnings[0].suggestion).toContain('Add heat sinks');
      });
    });

    // Note: RequiredEquipmentCheck does not have a canValidate method defined,
    // so it always runs (defaults to returning true)
  });

  // ===========================================================================
  // Rule Metadata Tests
  // ===========================================================================

  describe('Rule Metadata', () => {
    it('EquipmentUnitTypeCompatibility should have correct metadata', () => {
      expect(EquipmentUnitTypeCompatibility.id).toBe('VAL-EQUIP-UNIT-001');
      expect(EquipmentUnitTypeCompatibility.name).toBe('Equipment Unit Type Compatibility');
      expect(EquipmentUnitTypeCompatibility.applicableUnitTypes).toBe('ALL');
      expect(EquipmentUnitTypeCompatibility.priority).toBe(100);
    });

    it('EquipmentLocationCompatibility should have correct metadata', () => {
      expect(EquipmentLocationCompatibility.id).toBe('VAL-EQUIP-UNIT-002');
      expect(EquipmentLocationCompatibility.name).toBe('Equipment Location Compatibility');
      expect(EquipmentLocationCompatibility.applicableUnitTypes).toBe('ALL');
      expect(EquipmentLocationCompatibility.priority).toBe(101);
    });

    it('TurretMountingRequirements should have correct metadata', () => {
      expect(TurretMountingRequirements.id).toBe('VAL-EQUIP-UNIT-003');
      expect(TurretMountingRequirements.name).toBe('Turret Mounting Requirements');
      expect(TurretMountingRequirements.applicableUnitTypes).toBe('ALL');
      expect(TurretMountingRequirements.priority).toBe(102);
    });

    it('IncompatibleEquipmentCheck should have correct metadata', () => {
      expect(IncompatibleEquipmentCheck.id).toBe('VAL-EQUIP-UNIT-004');
      expect(IncompatibleEquipmentCheck.name).toBe('Incompatible Equipment Check');
      expect(IncompatibleEquipmentCheck.applicableUnitTypes).toBe('ALL');
      expect(IncompatibleEquipmentCheck.priority).toBe(103);
    });

    it('RequiredEquipmentCheck should have correct metadata', () => {
      expect(RequiredEquipmentCheck.id).toBe('VAL-EQUIP-UNIT-005');
      expect(RequiredEquipmentCheck.name).toBe('Required Equipment Check');
      expect(RequiredEquipmentCheck.applicableUnitTypes).toBe('ALL');
      expect(RequiredEquipmentCheck.priority).toBe(104);
    });
  });
});
