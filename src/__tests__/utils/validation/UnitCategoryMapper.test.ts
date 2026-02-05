import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { UnitCategory } from '@/types/validation/UnitValidationInterfaces';
import {
  getCategoryForUnitType,
  getUnitTypesInCategory,
  isUnitTypeInCategory,
  isMechType,
  isVehicleType,
  isAerospaceType,
  isPersonnelType,
  isCombatMech,
  requiresGyro,
  requiresMinimumHeatSinks,
  getAllCategories,
  getAllUnitTypes,
  isValidUnitType,
} from '@/utils/validation/UnitCategoryMapper';

describe('UnitCategoryMapper', () => {
  describe('getCategoryForUnitType', () => {
    it('should return MECH for BATTLEMECH', () => {
      expect(getCategoryForUnitType(UnitType.BATTLEMECH)).toBe(
        UnitCategory.MECH,
      );
    });

    it('should return VEHICLE for VEHICLE', () => {
      expect(getCategoryForUnitType(UnitType.VEHICLE)).toBe(
        UnitCategory.VEHICLE,
      );
    });

    it('should return AEROSPACE for AEROSPACE', () => {
      expect(getCategoryForUnitType(UnitType.AEROSPACE)).toBe(
        UnitCategory.AEROSPACE,
      );
    });

    it('should return PERSONNEL for INFANTRY', () => {
      expect(getCategoryForUnitType(UnitType.INFANTRY)).toBe(
        UnitCategory.PERSONNEL,
      );
    });

    it('should return undefined for unknown unit type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(getCategoryForUnitType('UNKNOWN' as any)).toBeUndefined();
    });
  });

  describe('getUnitTypesInCategory', () => {
    it('should return correct unit types for MECH category', () => {
      const types = getUnitTypesInCategory(UnitCategory.MECH);
      expect(types).toContain(UnitType.BATTLEMECH);
      expect(types).toContain(UnitType.OMNIMECH);
      expect(types).toContain(UnitType.INDUSTRIALMECH);
      expect(types).toContain(UnitType.PROTOMECH);
      expect(types.length).toBe(4);
    });

    it('should return empty array for unknown category', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(getUnitTypesInCategory('UNKNOWN' as any)).toEqual([]);
    });
  });

  describe('isUnitTypeInCategory', () => {
    it('should return true if type is in category', () => {
      expect(isUnitTypeInCategory(UnitType.BATTLEMECH, UnitCategory.MECH)).toBe(
        true,
      );
    });

    it('should return false if type is not in category', () => {
      expect(
        isUnitTypeInCategory(UnitType.BATTLEMECH, UnitCategory.VEHICLE),
      ).toBe(false);
    });
  });

  describe('Type check helpers', () => {
    it('isMechType should return true for mech types', () => {
      expect(isMechType(UnitType.BATTLEMECH)).toBe(true);
      expect(isMechType(UnitType.VEHICLE)).toBe(false);
    });

    it('isVehicleType should return true for vehicle types', () => {
      expect(isVehicleType(UnitType.VEHICLE)).toBe(true);
      expect(isVehicleType(UnitType.BATTLEMECH)).toBe(false);
    });

    it('isAerospaceType should return true for aerospace types', () => {
      expect(isAerospaceType(UnitType.AEROSPACE)).toBe(true);
      expect(isAerospaceType(UnitType.BATTLEMECH)).toBe(false);
    });

    it('isPersonnelType should return true for personnel types', () => {
      expect(isPersonnelType(UnitType.INFANTRY)).toBe(true);
      expect(isPersonnelType(UnitType.BATTLEMECH)).toBe(false);
    });
  });

  describe('Requirement helpers', () => {
    it('isCombatMech should return true only for BATTLEMECH and OMNIMECH', () => {
      expect(isCombatMech(UnitType.BATTLEMECH)).toBe(true);
      expect(isCombatMech(UnitType.OMNIMECH)).toBe(true);
      expect(isCombatMech(UnitType.INDUSTRIALMECH)).toBe(false);
    });

    it('requiresGyro should return true for mechs except ProtoMech', () => {
      expect(requiresGyro(UnitType.BATTLEMECH)).toBe(true);
      expect(requiresGyro(UnitType.OMNIMECH)).toBe(true);
      expect(requiresGyro(UnitType.INDUSTRIALMECH)).toBe(true);
      expect(requiresGyro(UnitType.PROTOMECH)).toBe(false);
    });

    it('requiresMinimumHeatSinks should return true for BATTLEMECH and OMNIMECH', () => {
      expect(requiresMinimumHeatSinks(UnitType.BATTLEMECH)).toBe(true);
      expect(requiresMinimumHeatSinks(UnitType.OMNIMECH)).toBe(true);
      expect(requiresMinimumHeatSinks(UnitType.INDUSTRIALMECH)).toBe(false);
    });
  });

  describe('Metadata helpers', () => {
    it('getAllCategories should return all categories', () => {
      const categories = getAllCategories();
      expect(categories).toContain(UnitCategory.MECH);
      expect(categories).toContain(UnitCategory.VEHICLE);
      expect(categories).toContain(UnitCategory.AEROSPACE);
      expect(categories).toContain(UnitCategory.PERSONNEL);
      expect(categories.length).toBe(4);
    });

    it('getAllUnitTypes should return all unit types', () => {
      const types = getAllUnitTypes();
      expect(types).toContain(UnitType.BATTLEMECH);
      expect(types).toContain(UnitType.VEHICLE);
      expect(types.length).toBeGreaterThan(10);
    });

    it('isValidUnitType should return true for valid types and false for invalid', () => {
      expect(isValidUnitType(UnitType.BATTLEMECH)).toBe(true);
      expect(isValidUnitType('NOT_A_TYPE')).toBe(false);
      expect(isValidUnitType(123)).toBe(false);
      expect(isValidUnitType(null)).toBe(false);
    });
  });
});
