/**
 * Definition Lookup Tests
 * 
 * Tests for type definition lookup functions and data integrity.
 * 
 * @spec openspec/specs/engine-system/spec.md
 * @spec openspec/specs/gyro-system/spec.md
 * @spec openspec/specs/armor-system/spec.md
 * @spec openspec/specs/heat-sink-system/spec.md
 */

import { EngineType, ENGINE_DEFINITIONS, getEngineDefinition, getEnginesForTechBase } from '@/types/construction/EngineType';
import { GyroType, GYRO_DEFINITIONS, getGyroDefinition } from '@/types/construction/GyroType';
import { ArmorTypeEnum, ARMOR_DEFINITIONS, getArmorDefinition } from '@/types/construction/ArmorType';
import { HeatSinkType, HEAT_SINK_DEFINITIONS, getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';

describe('Definition Lookups', () => {
  // ============================================================================
  // Engine Definitions
  // ============================================================================
  describe('Engine Definitions', () => {
    describe('ENGINE_DEFINITIONS array', () => {
      it('should contain all engine types', () => {
        const definedTypes = ENGINE_DEFINITIONS.map(d => d.type);
        Object.values(EngineType).forEach(type => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have unique types', () => {
        const types = ENGINE_DEFINITIONS.map(d => d.type);
        const uniqueTypes = new Set(types);
        expect(uniqueTypes.size).toBe(types.length);
      });

      it('should have valid tech bases', () => {
        ENGINE_DEFINITIONS.forEach(def => {
          expect(Object.values(TechBase)).toContain(def.techBase);
        });
      });

      it('should have valid rules levels', () => {
        ENGINE_DEFINITIONS.forEach(def => {
          expect(Object.values(RulesLevel)).toContain(def.rulesLevel);
        });
      });

      it('should have positive weight multipliers', () => {
        ENGINE_DEFINITIONS.forEach(def => {
          expect(def.weightMultiplier).toBeGreaterThan(0);
        });
      });
    });

    describe('getEngineDefinition', () => {
      it.each(Object.values(EngineType))('should return definition for %s', (type) => {
        const def = getEngineDefinition(type);
        expect(def).toBeDefined();
        expect(def?.type).toBe(type);
      });

      it('should return undefined for invalid type', () => {
        expect(getEngineDefinition('INVALID' as EngineType)).toBeUndefined();
      });
    });

    describe('getEnginesForTechBase', () => {
      it('should return IS engines for Inner Sphere', () => {
        const engines = getEnginesForTechBase(TechBase.INNER_SPHERE);
        expect(engines.length).toBeGreaterThan(0);
        engines.forEach(e => {
          expect([TechBase.INNER_SPHERE, TechBase.BOTH]).toContain(e.techBase);
        });
      });

      it('should return Clan engines for Clan', () => {
        const engines = getEnginesForTechBase(TechBase.CLAN);
        const clanXL = engines.find(e => e.type === EngineType.XL_CLAN);
        expect(clanXL).toBeDefined();
      });
    });

    describe('Engine weight multipliers', () => {
      it('XL engines should have 0.5 multiplier', () => {
        expect(getEngineDefinition(EngineType.XL_IS)?.weightMultiplier).toBe(0.5);
        expect(getEngineDefinition(EngineType.XL_CLAN)?.weightMultiplier).toBe(0.5);
      });

      it('ICE should have 2.0 multiplier', () => {
        expect(getEngineDefinition(EngineType.ICE)?.weightMultiplier).toBe(2.0);
      });

      it('Compact should have 1.5 multiplier', () => {
        expect(getEngineDefinition(EngineType.COMPACT)?.weightMultiplier).toBe(1.5);
      });
    });

    describe('Engine fusion property', () => {
      it.each([
        EngineType.STANDARD,
        EngineType.XL_IS,
        EngineType.XL_CLAN,
        EngineType.LIGHT,
        EngineType.XXL,
        EngineType.COMPACT,
      ])('%s should be fusion', (type) => {
        expect(getEngineDefinition(type)?.isFusion).toBe(true);
      });

      it.each([
        EngineType.ICE,
        EngineType.FUEL_CELL,
        EngineType.FISSION,
      ])('%s should not be fusion', (type) => {
        expect(getEngineDefinition(type)?.isFusion).toBe(false);
      });
    });
  });

  // ============================================================================
  // Gyro Definitions
  // ============================================================================
  describe('Gyro Definitions', () => {
    describe('GYRO_DEFINITIONS array', () => {
      it('should contain all gyro types', () => {
        const definedTypes = GYRO_DEFINITIONS.map(d => d.type);
        Object.values(GyroType).forEach(type => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have valid weight multipliers', () => {
        GYRO_DEFINITIONS.forEach(def => {
          expect(def.weightMultiplier).toBeGreaterThan(0);
        });
      });

      it('should have valid critical slots', () => {
        GYRO_DEFINITIONS.forEach(def => {
          expect(def.criticalSlots).toBeGreaterThan(0);
          expect(Number.isInteger(def.criticalSlots)).toBe(true);
        });
      });
    });

    describe('getGyroDefinition', () => {
      it.each(Object.values(GyroType))('should return definition for %s', (type) => {
        const def = getGyroDefinition(type);
        expect(def).toBeDefined();
        expect(def?.type).toBe(type);
      });
    });

    describe('Gyro slot counts', () => {
      it.each([
        [GyroType.STANDARD, 4],
        [GyroType.XL, 6],
        [GyroType.COMPACT, 2],
        [GyroType.HEAVY_DUTY, 4],
      ])('%s should have %d slots', (type, expected) => {
        expect(getGyroDefinition(type)?.criticalSlots).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Armor Definitions
  // ============================================================================
  describe('Armor Definitions', () => {
    describe('ARMOR_DEFINITIONS array', () => {
      it('should contain all armor types', () => {
        const definedTypes = ARMOR_DEFINITIONS.map(d => d.type);
        Object.values(ArmorTypeEnum).forEach(type => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have positive points per ton', () => {
        ARMOR_DEFINITIONS.forEach(def => {
          expect(def.pointsPerTon).toBeGreaterThan(0);
        });
      });

      it('should have non-negative critical slots', () => {
        ARMOR_DEFINITIONS.forEach(def => {
          expect(def.criticalSlots).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('getArmorDefinition', () => {
      it.each(Object.values(ArmorTypeEnum))('should return definition for %s', (type) => {
        const def = getArmorDefinition(type);
        expect(def).toBeDefined();
        expect(def?.type).toBe(type);
      });
    });

    describe('Armor points per ton', () => {
      it('Standard armor should have 16 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.STANDARD)?.pointsPerTon).toBe(16);
      });

      it('Ferro-Fibrous IS should have ~17.92 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.FERRO_FIBROUS_IS)?.pointsPerTon).toBeCloseTo(17.92, 1);
      });

      it('Ferro-Fibrous Clan should have ~19.2 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.FERRO_FIBROUS_CLAN)?.pointsPerTon).toBeCloseTo(19.2, 1);
      });

      it('Hardened armor should have 8 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.HARDENED)?.pointsPerTon).toBe(8);
      });
    });

    describe('Armor critical slots', () => {
      it.each([
        [ArmorTypeEnum.STANDARD, 0],
        [ArmorTypeEnum.FERRO_FIBROUS_IS, 14],
        [ArmorTypeEnum.FERRO_FIBROUS_CLAN, 7],
        [ArmorTypeEnum.STEALTH, 12],
      ])('%s should have %d slots', (type, expected) => {
        expect(getArmorDefinition(type)?.criticalSlots).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Heat Sink Definitions
  // ============================================================================
  describe('Heat Sink Definitions', () => {
    describe('HEAT_SINK_DEFINITIONS array', () => {
      it('should contain all heat sink types', () => {
        const definedTypes = HEAT_SINK_DEFINITIONS.map(d => d.type);
        Object.values(HeatSinkType).forEach(type => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have positive dissipation', () => {
        HEAT_SINK_DEFINITIONS.forEach(def => {
          expect(def.dissipation).toBeGreaterThan(0);
        });
      });

      it('should have positive weight', () => {
        HEAT_SINK_DEFINITIONS.forEach(def => {
          expect(def.weight).toBeGreaterThan(0);
        });
      });
    });

    describe('getHeatSinkDefinition', () => {
      it.each(Object.values(HeatSinkType))('should return definition for %s', (type) => {
        const def = getHeatSinkDefinition(type);
        expect(def).toBeDefined();
        expect(def?.type).toBe(type);
      });
    });

    describe('Heat sink dissipation', () => {
      it('Single heat sinks dissipate 1 heat', () => {
        expect(getHeatSinkDefinition(HeatSinkType.SINGLE)?.dissipation).toBe(1);
      });

      it('Double heat sinks dissipate 2 heat', () => {
        expect(getHeatSinkDefinition(HeatSinkType.DOUBLE_IS)?.dissipation).toBe(2);
        expect(getHeatSinkDefinition(HeatSinkType.DOUBLE_CLAN)?.dissipation).toBe(2);
      });
    });

    describe('Heat sink critical slots', () => {
      it.each([
        [HeatSinkType.SINGLE, 1],
        [HeatSinkType.DOUBLE_IS, 3],
        [HeatSinkType.DOUBLE_CLAN, 2],
      ])('%s should have %d external slots', (type, expected) => {
        expect(getHeatSinkDefinition(type)?.criticalSlots).toBe(expected);
      });
    });
  });

  // ============================================================================
  // Cross-Definition Integrity
  // ============================================================================
  describe('Cross-Definition Integrity', () => {
    it('all definitions should have valid introduction years', () => {
      const allDefs = [
        ...ENGINE_DEFINITIONS,
        ...GYRO_DEFINITIONS,
        ...ARMOR_DEFINITIONS,
        ...HEAT_SINK_DEFINITIONS,
      ];

      allDefs.forEach(def => {
        expect(def.introductionYear).toBeGreaterThan(1900);
        expect(def.introductionYear).toBeLessThan(4000);
      });
    });

    it('all definitions should have non-empty names', () => {
      const allDefs = [
        ...ENGINE_DEFINITIONS,
        ...GYRO_DEFINITIONS,
        ...ARMOR_DEFINITIONS,
        ...HEAT_SINK_DEFINITIONS,
      ];

      allDefs.forEach(def => {
        expect(def.name.length).toBeGreaterThan(0);
      });
    });
  });
});

