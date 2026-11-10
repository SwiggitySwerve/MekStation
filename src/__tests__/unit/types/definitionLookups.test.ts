import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  mapCockpitType as convertCockpit,
  mapGyroType as convertGyro,
} from '@/services/conversion/ValueMappings';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  mapCockpitType,
  mapGyroType,
} from '@/services/units/unitLoaderService/componentMappers';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { BattleMechCTRequirements } from '@/services/validation/rules/battlemech/BattleMechRules';
import {
  ArmorTypeEnum,
  ARMOR_DEFINITIONS,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  EngineType,
  ENGINE_DEFINITIONS,
  getEngineDefinition,
  getEnginesForTechBase,
} from '@/types/construction/EngineType';
import {
  GyroType,
  GYRO_DEFINITIONS,
  getGyroDefinition,
} from '@/types/construction/GyroType';
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
import {
  HeatSinkType,
  HEAT_SINK_DEFINITIONS,
  getHeatSinkDefinition,
} from '@/types/construction/HeatSinkType';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { UnitCategory } from '@/types/validation/UnitValidationInterfaces';
import { calculateGyroWeight } from '@/utils/construction/gyroCalculations';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import ryoken from '../../../../public/data/units/battlemechs/6-dark-age/standard/Ryoken III-XP B.json';

describe('Definition Lookups', () => {
  // ============================================================================
  // Engine Definitions
  // ============================================================================
  describe('Engine Definitions', () => {
    describe('ENGINE_DEFINITIONS array', () => {
      it('should contain all engine types', () => {
        const definedTypes = ENGINE_DEFINITIONS.map((d) => d.type);
        Object.values(EngineType).forEach((type) => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have unique types', () => {
        const types = ENGINE_DEFINITIONS.map((d) => d.type);
        const uniqueTypes = new Set(types);
        expect(uniqueTypes.size).toBe(types.length);
      });

      it('should have valid tech bases', () => {
        ENGINE_DEFINITIONS.forEach((def) => {
          expect(Object.values(TechBase)).toContain(def.techBase);
        });
      });

      it('should have valid rules levels', () => {
        ENGINE_DEFINITIONS.forEach((def) => {
          expect(Object.values(RulesLevel)).toContain(def.rulesLevel);
        });
      });

      it('should have positive weight multipliers', () => {
        ENGINE_DEFINITIONS.forEach((def) => {
          expect(def.weightMultiplier).toBeGreaterThan(0);
        });
      });
    });

    describe('getEngineDefinition', () => {
      it.each(Object.values(EngineType))(
        'should return definition for %s',
        (type) => {
          const def = getEngineDefinition(type);
          expect(def).toBeDefined();
          expect(def?.type).toBe(type);
        },
      );

      it('should return undefined for invalid type', () => {
        expect(getEngineDefinition('INVALID' as EngineType)).toBeUndefined();
      });
    });

    describe('getEnginesForTechBase', () => {
      it('should return IS engines for Inner Sphere', () => {
        const engines = getEnginesForTechBase(TechBase.INNER_SPHERE);
        expect(engines.length).toBeGreaterThan(0);
        engines.forEach((e) => {
          expect(e.techBase).toBe(TechBase.INNER_SPHERE);
        });
      });

      it('should return Clan engines for Clan', () => {
        const engines = getEnginesForTechBase(TechBase.CLAN);
        const clanXL = engines.find((e) => e.type === EngineType.XL_CLAN);
        expect(clanXL).toBeDefined();
      });
    });

    describe('Engine weight multipliers', () => {
      it('XL engines should have 0.5 multiplier', () => {
        expect(getEngineDefinition(EngineType.XL_IS)?.weightMultiplier).toBe(
          0.5,
        );
        expect(getEngineDefinition(EngineType.XL_CLAN)?.weightMultiplier).toBe(
          0.5,
        );
      });

      it('ICE should have 2.0 multiplier', () => {
        expect(getEngineDefinition(EngineType.ICE)?.weightMultiplier).toBe(2.0);
      });

      it('Compact should have 1.5 multiplier', () => {
        expect(getEngineDefinition(EngineType.COMPACT)?.weightMultiplier).toBe(
          1.5,
        );
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

      it.each([EngineType.ICE, EngineType.FUEL_CELL, EngineType.FISSION])(
        '%s should not be fusion',
        (type) => {
          expect(getEngineDefinition(type)?.isFusion).toBe(false);
        },
      );
    });
  });

  // ============================================================================
  // Gyro Definitions
  // ============================================================================
  describe('Gyro Definitions', () => {
    describe('GYRO_DEFINITIONS array', () => {
      it('should contain all gyro types', () => {
        const definedTypes = GYRO_DEFINITIONS.map((d) => d.type);
        Object.values(GyroType).forEach((type) => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have valid weight multipliers', () => {
        GYRO_DEFINITIONS.forEach((def) => {
          if (def.type === GyroType.NONE) expect(def.weightMultiplier).toBe(0);
          else expect(def.weightMultiplier).toBeGreaterThan(0);
        });
      });

      it('should have valid critical slots', () => {
        GYRO_DEFINITIONS.forEach((def) => {
          if (def.type === GyroType.NONE) expect(def.criticalSlots).toBe(0);
          else expect(def.criticalSlots).toBeGreaterThan(0);
          expect(Number.isInteger(def.criticalSlots)).toBe(true);
        });
      });
    });

    describe('getGyroDefinition', () => {
      it.each(Object.values(GyroType))(
        'should return definition for %s',
        (type) => {
          const def = getGyroDefinition(type);
          expect(def).toBeDefined();
          expect(def?.type).toBe(type);
        },
      );
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
      it('should contain all armor types except per-location Patchwork', () => {
        const definedTypes = ARMOR_DEFINITIONS.map((d) => d.type);
        Object.values(ArmorTypeEnum)
          .filter((type) => type !== ArmorTypeEnum.PATCHWORK)
          .forEach((type) => {
            expect(definedTypes).toContain(type);
          });
      });

      it('should have positive points per ton', () => {
        ARMOR_DEFINITIONS.forEach((def) => {
          expect(def.pointsPerTon).toBeGreaterThan(0);
        });
      });

      it('should have non-negative critical slots', () => {
        ARMOR_DEFINITIONS.forEach((def) => {
          expect(def.criticalSlots).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('getArmorDefinition', () => {
      it.each(
        Object.values(ArmorTypeEnum).filter(
          (type) => type !== ArmorTypeEnum.PATCHWORK,
        ),
      )('should return definition for %s', (type) => {
        const def = getArmorDefinition(type);
        expect(def).toBeDefined();
        expect(def?.type).toBe(type);
      });

      it('has no uniform definition for per-location Patchwork', () => {
        expect(getArmorDefinition(ArmorTypeEnum.PATCHWORK)).toBeUndefined();
      });
    });

    describe('Armor points per ton', () => {
      it('Standard armor should have 16 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.STANDARD)?.pointsPerTon).toBe(
          16,
        );
      });

      it('Ferro-Fibrous IS should have ~17.92 pts/ton', () => {
        expect(
          getArmorDefinition(ArmorTypeEnum.FERRO_FIBROUS_IS)?.pointsPerTon,
        ).toBeCloseTo(17.92, 1);
      });

      it('Ferro-Fibrous Clan should have ~19.2 pts/ton', () => {
        expect(
          getArmorDefinition(ArmorTypeEnum.FERRO_FIBROUS_CLAN)?.pointsPerTon,
        ).toBeCloseTo(19.2, 1);
      });

      it('Hardened armor should have 8 pts/ton', () => {
        expect(getArmorDefinition(ArmorTypeEnum.HARDENED)?.pointsPerTon).toBe(
          8,
        );
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
        const definedTypes = HEAT_SINK_DEFINITIONS.map((d) => d.type);
        Object.values(HeatSinkType).forEach((type) => {
          expect(definedTypes).toContain(type);
        });
      });

      it('should have positive dissipation', () => {
        HEAT_SINK_DEFINITIONS.forEach((def) => {
          expect(def.dissipation).toBeGreaterThan(0);
        });
      });

      it('should have positive weight', () => {
        HEAT_SINK_DEFINITIONS.forEach((def) => {
          expect(def.weight).toBeGreaterThan(0);
        });
      });
    });

    describe('getHeatSinkDefinition', () => {
      it.each(Object.values(HeatSinkType))(
        'should return definition for %s',
        (type) => {
          const def = getHeatSinkDefinition(type);
          expect(def).toBeDefined();
          expect(def?.type).toBe(type);
        },
      );
    });

    describe('Heat sink dissipation', () => {
      it('Single heat sinks dissipate 1 heat', () => {
        expect(getHeatSinkDefinition(HeatSinkType.SINGLE)?.dissipation).toBe(1);
      });

      it('Double heat sinks dissipate 2 heat', () => {
        expect(getHeatSinkDefinition(HeatSinkType.DOUBLE_IS)?.dissipation).toBe(
          2,
        );
        expect(
          getHeatSinkDefinition(HeatSinkType.DOUBLE_CLAN)?.dissipation,
        ).toBe(2);
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

      allDefs.forEach((def) => {
        // Mek.java:3710-3716: no gyro is a placeholder with no intro date.
        if (def.type === GyroType.NONE) expect(def.introductionYear).toBe(0);
        else expect(def.introductionYear).toBeGreaterThan(1900);
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

      allDefs.forEach((def) => {
        expect(def.name.length).toBeGreaterThan(0);
      });
    });
  });
});

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

// MegaMek 48fcb2f64 TestMek.java:225-261: Interface cockpit 4t, no gyro 0t.
it.each([
  ['loader', mapCockpitType, mapGyroType],
  ['converter', convertCockpit, convertGyro],
] as const)(
  '%s preserves native interface/no-gyro identities and weights',
  (_, cockpit, gyro) => {
    expect(cockpit('INTERFACE')).toBe('Interface');
    expect(gyro('NONE')).toBe('None');
    expect(getCockpitDefinition(cockpit('INTERFACE'))?.weight).toBe(4);
    expect(calculateGyroWeight(330, gyro('NONE'))).toBe(0);
  },
);

// Mek.java:5709-5720: both head cockpit cells are occupied.
it('reserves all six interface head cells', () => {
  const state = new UnitLoaderService().mapToUnitState(parseUnit(ryoken), true);
  const head = getFixedSlotNames(
    MechLocation.HEAD,
    state.engineType,
    state.gyroType,
    undefined,
    state.cockpitType,
  );
  expect([...head.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
});

// Engine.java:639-640: absent gyro puts all six engine cells together.
it('restores the no-gyro engine positions and frees native center-torso mounts', () => {
  const state = new UnitLoaderService().mapToUnitState(parseUnit(ryoken), true);
  const ct = getFixedSlotNames(
    MechLocation.CENTER_TORSO,
    state.engineType,
    state.gyroType,
  );
  expect([...ct.entries()]).toEqual(
    Array.from({ length: 6 }, (_, i) => [i, 'Engine']),
  );
  expect(
    getEquipmentSlotIssues(
      state.equipment,
      state.configuration,
      state.engineType,
      state.gyroType,
      state.armActuators,
      state.cockpitType,
    ),
  ).toEqual([]);
});

// MegaMek 48fcb2f64 TestMek.java:669-673: no gyro requires an interface cockpit.
it.each([
  ['Standard', false],
  ['Interface', true],
])('checks no-gyro compatibility with %s', (cockpitType, passed) => {
  const result = BattleMechCTRequirements.validate({
    unit: {
      id: 'interface-test',
      name: 'Interface test',
      unitType: UnitType.BATTLEMECH,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      introductionYear: 3143,
      era: Era.DARK_AGE,
      weight: 55,
      cost: 0,
      battleValue: 0,
      gyroType: 'None',
      cockpitType: String(cockpitType),
    },
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    techBase: TechBase.INNER_SPHERE,
    options: {},
    cache: new Map(),
  });
  expect(result.passed).toBe(passed);
});
