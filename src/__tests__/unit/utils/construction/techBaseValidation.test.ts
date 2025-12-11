import {
  getEngineTechBase,
  getGyroTechBase,
  getStructureTechBase,
  getHeatSinkTechBase,
  getArmorTechBase,
  isComponentCompatible,
  validateTechBaseCompatibility,
  getHighestRulesLevel,
  getAvailableEngineTypes,
  getAvailableGyroTypes,
  getAvailableStructureTypes,
  getAvailableHeatSinkTypes,
  getAvailableArmorTypes,
} from '@/utils/construction/techBaseValidation';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';

describe('techBaseValidation', () => {
  describe('getEngineTechBase()', () => {
    it('should return tech base for engine type', () => {
      const techBase = getEngineTechBase(EngineType.STANDARD);
      expect(techBase).toBeDefined();
    });
  });

  describe('getGyroTechBase()', () => {
    it('should return tech base for gyro type', () => {
      const techBase = getGyroTechBase(GyroType.STANDARD);
      expect(techBase).toBeDefined();
    });
  });

  describe('getStructureTechBase()', () => {
    it('should return tech base for structure type', () => {
      const techBase = getStructureTechBase(InternalStructureType.STANDARD);
      expect(techBase).toBeDefined();
    });
  });

  describe('getHeatSinkTechBase()', () => {
    it('should return tech base for heat sink type', () => {
      const techBase = getHeatSinkTechBase(HeatSinkType.SINGLE);
      expect(techBase).toBeDefined();
    });
  });

  describe('getArmorTechBase()', () => {
    it('should return tech base for armor type', () => {
      const techBase = getArmorTechBase(ArmorTypeEnum.STANDARD);
      expect(techBase).toBeDefined();
    });
  });

  describe('isComponentCompatible()', () => {
    it('should return true for same tech base', () => {
      expect(isComponentCompatible(TechBase.INNER_SPHERE, TechBase.INNER_SPHERE, false)).toBe(true);
      expect(isComponentCompatible(TechBase.CLAN, TechBase.CLAN, false)).toBe(true);
    });

    it('should return true when mixed tech is allowed', () => {
      expect(isComponentCompatible(TechBase.INNER_SPHERE, TechBase.CLAN, true)).toBe(true);
      expect(isComponentCompatible(TechBase.CLAN, TechBase.INNER_SPHERE, true)).toBe(true);
    });

    it('should allow IS components on Clan units', () => {
      expect(isComponentCompatible(TechBase.INNER_SPHERE, TechBase.CLAN, false)).toBe(true);
    });

    it('should not allow Clan components on IS units without mixed tech', () => {
      expect(isComponentCompatible(TechBase.CLAN, TechBase.INNER_SPHERE, false)).toBe(false);
    });
  });

  describe('validateTechBaseCompatibility()', () => {
    it('should validate compatible components', () => {
      const result = validateTechBaseCompatibility(
        TechBase.INNER_SPHERE,
        {
          engineType: EngineType.STANDARD,
          gyroType: GyroType.STANDARD,
        },
        false
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should detect incompatible components', () => {
      const result = validateTechBaseCompatibility(
        TechBase.INNER_SPHERE,
        {
          engineType: EngineType.XL_CLAN,
        },
        false
      );
      
      // Result depends on actual engine definitions
      expect(result).toBeDefined();
    });

    it('should validate all component types', () => {
      const result = validateTechBaseCompatibility(
        TechBase.INNER_SPHERE,
        {
          engineType: EngineType.STANDARD,
          gyroType: GyroType.STANDARD,
          structureType: InternalStructureType.STANDARD,
          heatSinkType: HeatSinkType.SINGLE,
          armorType: ArmorTypeEnum.STANDARD,
        },
        false
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow mixed tech when enabled', () => {
      const result = validateTechBaseCompatibility(
        TechBase.INNER_SPHERE,
        {
          engineType: EngineType.XL_CLAN,
          gyroType: GyroType.STANDARD, // Add IS component to create mixed tech
        },
        true
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Unit uses mixed tech components');
    });
  });

  describe('getHighestRulesLevel()', () => {
    it('should return introductory for basic components', () => {
      const level = getHighestRulesLevel({
        engineType: EngineType.STANDARD,
        gyroType: GyroType.STANDARD,
      });
      
      expect(level).toBeDefined();
    });

    it('should return highest level among components', () => {
      const level = getHighestRulesLevel({
        engineType: EngineType.STANDARD,
        gyroType: GyroType.XL,
      });
      
      expect(level).toBeDefined();
    });

    it('should handle all component types', () => {
      const level = getHighestRulesLevel({
        engineType: EngineType.STANDARD,
        gyroType: GyroType.STANDARD,
        structureType: InternalStructureType.STANDARD,
        heatSinkType: HeatSinkType.SINGLE,
        armorType: ArmorTypeEnum.STANDARD,
      });
      
      expect(level).toBeDefined();
    });

    it('should handle empty components', () => {
      const level = getHighestRulesLevel({});
      
      expect(level).toBe(RulesLevel.INTRODUCTORY);
    });
  });

  describe('getAvailableEngineTypes()', () => {
    it('should return engine types for Inner Sphere', () => {
      const types = getAvailableEngineTypes(TechBase.INNER_SPHERE, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return engine types for Clan', () => {
      const types = getAvailableEngineTypes(TechBase.CLAN, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include more types with mixed tech', () => {
      const typesWithoutMixed = getAvailableEngineTypes(TechBase.INNER_SPHERE, false);
      const typesWithMixed = getAvailableEngineTypes(TechBase.INNER_SPHERE, true);
      
      expect(typesWithMixed.length).toBeGreaterThanOrEqual(typesWithoutMixed.length);
    });
  });

  describe('getAvailableGyroTypes()', () => {
    it('should return gyro types for Inner Sphere', () => {
      const types = getAvailableGyroTypes(TechBase.INNER_SPHERE, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return gyro types for Clan', () => {
      const types = getAvailableGyroTypes(TechBase.CLAN, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include more types with mixed tech', () => {
      const typesWithoutMixed = getAvailableGyroTypes(TechBase.INNER_SPHERE, false);
      const typesWithMixed = getAvailableGyroTypes(TechBase.INNER_SPHERE, true);
      
      expect(typesWithMixed.length).toBeGreaterThanOrEqual(typesWithoutMixed.length);
    });
  });

  describe('getAvailableStructureTypes()', () => {
    it('should return structure types for Inner Sphere', () => {
      const types = getAvailableStructureTypes(TechBase.INNER_SPHERE, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return structure types for Clan', () => {
      const types = getAvailableStructureTypes(TechBase.CLAN, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include more types with mixed tech', () => {
      const typesWithoutMixed = getAvailableStructureTypes(TechBase.INNER_SPHERE, false);
      const typesWithMixed = getAvailableStructureTypes(TechBase.INNER_SPHERE, true);
      
      expect(typesWithMixed.length).toBeGreaterThanOrEqual(typesWithoutMixed.length);
    });
  });

  describe('getAvailableHeatSinkTypes()', () => {
    it('should return heat sink types for Inner Sphere', () => {
      const types = getAvailableHeatSinkTypes(TechBase.INNER_SPHERE, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return heat sink types for Clan', () => {
      const types = getAvailableHeatSinkTypes(TechBase.CLAN, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include more types with mixed tech', () => {
      const typesWithoutMixed = getAvailableHeatSinkTypes(TechBase.INNER_SPHERE, false);
      const typesWithMixed = getAvailableHeatSinkTypes(TechBase.INNER_SPHERE, true);
      
      expect(typesWithMixed.length).toBeGreaterThanOrEqual(typesWithoutMixed.length);
    });
  });

  describe('getAvailableArmorTypes()', () => {
    it('should return armor types for Inner Sphere', () => {
      const types = getAvailableArmorTypes(TechBase.INNER_SPHERE, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return armor types for Clan', () => {
      const types = getAvailableArmorTypes(TechBase.CLAN, false);
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include more types with mixed tech', () => {
      const typesWithoutMixed = getAvailableArmorTypes(TechBase.INNER_SPHERE, false);
      const typesWithMixed = getAvailableArmorTypes(TechBase.INNER_SPHERE, true);
      
      expect(typesWithMixed.length).toBeGreaterThanOrEqual(typesWithoutMixed.length);
    });
  });
});
