/**
 * Tests for Unit Factory Service
 */

import { UnitFactoryService, getUnitFactory, resetUnitFactory } from '@/services/units/UnitFactoryService';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { EngineType, GyroType, HeatSinkType, MechLocation, InternalStructureType, ArmorTypeEnum, CockpitType } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';

// Mock the equipment registry
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: jest.fn().mockReturnValue({
    lookup: jest.fn().mockReturnValue({
      found: true,
      equipment: { name: 'Test Equipment' },
    }),
  }),
}));

describe('UnitFactoryService', () => {
  let factory: UnitFactoryService;

  const createSerializedUnit = (overrides: Partial<ISerializedUnit> = {}): ISerializedUnit => ({
    id: 'test-mech-001',
    chassis: 'Atlas',
    model: 'AS7-D',
    variant: 'Standard',
    unitType: UnitType.BATTLEMECH,
    configuration: MechConfiguration.BIPED,
    tonnage: 100,
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    era: 'SUCCESSION_WARS',
    year: 2755,
    engine: {
      type: 'STANDARD',
      rating: 300,
    },
    gyro: {
      type: 'STANDARD',
    },
    cockpit: 'STANDARD',
    structure: {
      type: 'STANDARD',
    },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 47, rear: 14 },
        LEFT_TORSO: { front: 32, rear: 10 },
        RIGHT_TORSO: { front: 32, rear: 10 },
        LEFT_ARM: 34,
        RIGHT_ARM: 34,
        LEFT_LEG: 41,
        RIGHT_LEG: 41,
      },
    },
    heatSinks: {
      type: 'SINGLE',
      count: 20,
    },
    movement: {
      walk: 3,
      jump: 0,
    },
    equipment: [
      { id: 'ac-20', location: 'RIGHT_TORSO' },
      { id: 'medium-laser', location: 'CENTER_TORSO' },
    ],
    criticalSlots: {
      HEAD: ['Life Support', 'Sensors', 'Cockpit', 'null', 'Sensors', 'Life Support'],
      CENTER_TORSO: ['Engine', 'Engine', 'Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Engine', 'Engine', 'Engine', 'Medium Laser', 'null'],
      LEFT_TORSO: [null, null, null, null, null, null, null, null, null, null, null, null],
      RIGHT_TORSO: ['AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', null, null],
      LEFT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      RIGHT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', null, null, null, null, null, null, null, null],
      LEFT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
      RIGHT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator', null, null],
    },
    quirks: [],
    ...overrides,
  });

  beforeEach(() => {
    // Reset singleton
    resetUnitFactory();
    factory = getUnitFactory();
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const factory1 = getUnitFactory();
      const factory2 = getUnitFactory();
      expect(factory1).toBe(factory2);
    });

    it('should be accessible via getUnitFactory', () => {
      const factoryFromHelper = getUnitFactory();
      expect(factoryFromHelper).toBe(factory);
    });
  });

  describe('createFromSerialized', () => {
    describe('basic unit creation', () => {
      it('should create a valid IBattleMech from serialized data', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        expect(result.success).toBe(true);
        expect(result.unit).not.toBeNull();
        expect(result.errors).toHaveLength(0);
      });

      it('should set the correct ID', () => {
        const serialized = createSerializedUnit({ id: 'custom-id-123' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.id).toBe('custom-id-123');
      });

      it('should set the correct name', () => {
        const serialized = createSerializedUnit({ chassis: 'Hunchback', model: 'HBK-4G' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.name).toBe('Hunchback HBK-4G');
      });
    });

    describe('tech base parsing', () => {
      it('should parse INNER_SPHERE tech base', () => {
        const serialized = createSerializedUnit({ techBase: 'INNER_SPHERE' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });

      it('should parse CLAN tech base', () => {
        const serialized = createSerializedUnit({ techBase: 'CLAN' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.techBase).toBe(TechBase.CLAN);
      });

      it('should parse MIXED/BOTH tech base as INNER_SPHERE (per spec VAL-ENUM-004)', () => {
        // Per spec: Components must have binary tech base, MIXED defaults to IS
        const serialized = createSerializedUnit({ techBase: 'MIXED' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });
    });

    describe('rules level parsing', () => {
      it('should parse INTRODUCTORY rules level', () => {
        const serialized = createSerializedUnit({ rulesLevel: 'INTRODUCTORY' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      });

      it('should parse STANDARD rules level', () => {
        const serialized = createSerializedUnit({ rulesLevel: 'STANDARD' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
      });

      it('should parse ADVANCED rules level', () => {
        const serialized = createSerializedUnit({ rulesLevel: 'ADVANCED' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
      });

      it('should parse EXPERIMENTAL rules level', () => {
        const serialized = createSerializedUnit({ rulesLevel: 'EXPERIMENTAL' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.rulesLevel).toBe(RulesLevel.EXPERIMENTAL);
      });
    });

    describe('era parsing', () => {
      it('should parse AGE_OF_WAR era', () => {
        const serialized = createSerializedUnit({ era: 'AGE_OF_WAR' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.era).toBe(Era.AGE_OF_WAR);
      });

      it('should parse CLAN_INVASION era', () => {
        const serialized = createSerializedUnit({ era: 'CLAN_INVASION' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.era).toBe(Era.CLAN_INVASION);
      });

      it('should parse DARK_AGE era', () => {
        const serialized = createSerializedUnit({ era: 'DARK_AGE' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.era).toBe(Era.DARK_AGE);
      });
    });

    describe('weight class calculation', () => {
      it('should classify 20-35 ton mechs as LIGHT', () => {
        const serialized = createSerializedUnit({ tonnage: 35 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.weightClass).toBe(WeightClass.LIGHT);
      });

      it('should classify 40-55 ton mechs as MEDIUM', () => {
        const serialized = createSerializedUnit({ tonnage: 50 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.weightClass).toBe(WeightClass.MEDIUM);
      });

      it('should classify 60-75 ton mechs as HEAVY', () => {
        const serialized = createSerializedUnit({ tonnage: 75 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.weightClass).toBe(WeightClass.HEAVY);
      });

      it('should classify 80-100 ton mechs as ASSAULT', () => {
        const serialized = createSerializedUnit({ tonnage: 100 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.weightClass).toBe(WeightClass.ASSAULT);
      });
    });

    describe('engine configuration', () => {
      it('should parse STANDARD engine', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'STANDARD', rating: 300 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.engine.type).toBe(EngineType.STANDARD);
        expect(result.unit?.engine.rating).toBe(300);
      });

      it('should parse XL engine', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'XL', rating: 300 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.engine.type).toBe(EngineType.XL_IS);
      });

      it('should parse CLAN_XL engine', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'CLAN_XL', rating: 300 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.engine.type).toBe(EngineType.XL_CLAN);
      });

      it('should parse LIGHT engine', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'LIGHT', rating: 250 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.engine.type).toBe(EngineType.LIGHT);
      });

      it('should calculate integral heat sinks', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'STANDARD', rating: 300 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.engine.integralHeatSinks).toBe(12); // 300 / 25
      });
    });

    describe('gyro configuration', () => {
      it('should parse STANDARD gyro', () => {
        const serialized = createSerializedUnit({ gyro: { type: 'STANDARD' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.gyro.type).toBe(GyroType.STANDARD);
      });

      it('should parse XL gyro', () => {
        const serialized = createSerializedUnit({ gyro: { type: 'XL' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.gyro.type).toBe(GyroType.XL);
      });

      it('should parse COMPACT gyro', () => {
        const serialized = createSerializedUnit({ gyro: { type: 'COMPACT' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.gyro.type).toBe(GyroType.COMPACT);
      });

      it('should parse HEAVY_DUTY gyro', () => {
        const serialized = createSerializedUnit({ gyro: { type: 'HEAVY_DUTY' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.gyro.type).toBe(GyroType.HEAVY_DUTY);
      });
    });

    describe('cockpit parsing', () => {
      it('should parse STANDARD cockpit', () => {
        const serialized = createSerializedUnit({ cockpit: 'STANDARD' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.cockpitType).toBe(CockpitType.STANDARD);
      });

      it('should parse SMALL cockpit', () => {
        const serialized = createSerializedUnit({ cockpit: 'SMALL' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.cockpitType).toBe(CockpitType.SMALL);
      });

      it('should parse COMMAND_CONSOLE cockpit', () => {
        const serialized = createSerializedUnit({ cockpit: 'COMMAND_CONSOLE' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.cockpitType).toBe(CockpitType.COMMAND_CONSOLE);
      });
    });

    describe('structure configuration', () => {
      it('should parse STANDARD structure', () => {
        const serialized = createSerializedUnit({ structure: { type: 'STANDARD' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.structure.type).toBe(InternalStructureType.STANDARD);
      });

      it('should parse ENDO_STEEL structure', () => {
        const serialized = createSerializedUnit({ structure: { type: 'ENDO_STEEL' } });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.structure.type).toBe(InternalStructureType.ENDO_STEEL_IS);
      });

      it('should build structure points', () => {
        const serialized = createSerializedUnit({ tonnage: 100 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.structure.points[MechLocation.HEAD]).toBe(3);
        expect(result.unit?.structure.points[MechLocation.CENTER_TORSO]).toBe(31);
      });
    });

    describe('armor configuration', () => {
      it('should parse STANDARD armor type', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.armorType).toBe(ArmorTypeEnum.STANDARD);
      });

      it('should parse FERRO_FIBROUS armor type', () => {
        const serialized = createSerializedUnit({
          armor: {
            type: 'FERRO_FIBROUS',
            allocation: { HEAD: 9 },
          },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
      });

      it('should calculate total armor points', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        // 9 + 47+14 + 32+10 + 32+10 + 34 + 34 + 41 + 41 = 304
        expect(result.unit?.totalArmorPoints).toBe(304);
      });
    });

    describe('heat sink configuration', () => {
      it('should parse SINGLE heat sinks', () => {
        const serialized = createSerializedUnit({
          heatSinks: { type: 'SINGLE', count: 15 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.heatSinks.type).toBe(HeatSinkType.SINGLE);
        expect(result.unit?.heatSinks.total).toBe(15);
      });

      it('should parse DOUBLE heat sinks', () => {
        const serialized = createSerializedUnit({
          heatSinks: { type: 'DOUBLE', count: 12 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.heatSinks.type).toBe(HeatSinkType.DOUBLE_IS);
      });

      it('should calculate integrated and external heat sinks', () => {
        const serialized = createSerializedUnit({
          engine: { type: 'STANDARD', rating: 300 },
          heatSinks: { type: 'SINGLE', count: 15 },
        });
        const result = factory.createFromSerialized(serialized);

        // 300 / 25 = 12 integral heat sinks (no cap)
        expect(result.unit?.heatSinks.integrated).toBe(12);
        // 15 total - 12 integral = 3 external
        expect(result.unit?.heatSinks.external).toBe(3);
      });
    });

    describe('movement configuration', () => {
      it('should set walk and run MP', () => {
        const serialized = createSerializedUnit({
          movement: { walk: 4, jump: 0 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.movement.walkMP).toBe(4);
        expect(result.unit?.movement.runMP).toBe(6); // ceil(4 * 1.5)
      });

      it('should set jump MP', () => {
        const serialized = createSerializedUnit({
          movement: { walk: 4, jump: 4 },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.movement.jumpMP).toBe(4);
      });

      it('should detect MASC', () => {
        const serialized = createSerializedUnit({
          movement: { walk: 4, jump: 0, enhancements: ['MASC'] },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.movement.hasMASC).toBe(true);
      });

      it('should detect Supercharger', () => {
        const serialized = createSerializedUnit({
          movement: { walk: 4, jump: 0, enhancements: ['Supercharger'] },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.movement.hasSupercharger).toBe(true);
      });

      it('should detect TSM', () => {
        const serialized = createSerializedUnit({
          movement: { walk: 4, jump: 0, enhancements: ['TSM'] },
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.movement.hasTSM).toBe(true);
      });
    });

    describe('mech configuration', () => {
      it('should parse Biped configuration', () => {
        const serialized = createSerializedUnit({ configuration: 'Biped' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.configuration).toBe(MechConfiguration.BIPED);
      });

      it('should parse Quad configuration', () => {
        const serialized = createSerializedUnit({ configuration: 'Quad' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.configuration).toBe(MechConfiguration.QUAD);
      });

      it('should parse Tripod configuration', () => {
        const serialized = createSerializedUnit({ configuration: 'Tripod' });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.configuration).toBe(MechConfiguration.TRIPOD);
      });
    });

    describe('equipment handling', () => {
      it('should build equipment list', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.equipment.length).toBe(2);
      });

      it('should set equipment locations', () => {
        const serialized = createSerializedUnit({
          equipment: [
            { id: 'medium-laser', location: 'LEFT_ARM' },
          ],
        });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.equipment[0].location).toBe(MechLocation.LEFT_ARM);
      });
    });

    describe('critical slots handling', () => {
      it('should build critical slot assignments', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.criticalSlots.length).toBeGreaterThan(0);
      });

      it('should mark fixed components correctly', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        const headSlots = result.unit?.criticalSlots.find(
          cs => cs.location === MechLocation.HEAD
        );
        expect(headSlots).toBeDefined();

        // First slot should be Life Support (fixed)
        expect(headSlots?.slots[0].isFixed).toBe(true);
      });
    });

    describe('metadata', () => {
      it('should set unit type to BATTLEMECH', () => {
        const serialized = createSerializedUnit();
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.unitType).toBe(UnitType.BATTLEMECH);
      });

      it('should set introduction year', () => {
        const serialized = createSerializedUnit({ year: 3025 });
        const result = factory.createFromSerialized(serialized);

        expect(result.unit?.introductionYear).toBe(3025);
      });
    });

    describe('error handling', () => {
      it('should handle missing required fields gracefully', () => {
        // Create intentionally incomplete unit using Partial type
        const malformed: Partial<ISerializedUnit> = {
          id: 'test',
          chassis: 'Test',
          model: 'T1',
          tonnage: 50,
          // Missing required fields like engine, armor, etc.
        };

        const result = factory.createFromSerialized(malformed as ISerializedUnit);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});

