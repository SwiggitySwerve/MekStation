/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '../../../../types/construction/UnitLocation';
import { RulesLevel } from '../../../../types/enums/RulesLevel';
import { TechBase } from '../../../../types/enums/TechBase';
import { WeightClass } from '../../../../types/enums/WeightClass';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '../../../../types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '../../../../types/unit/UnitSerialization';
import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'ConvFighter',
    mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
    name: 'F-92 Stingray',
    model: 'Standard',
    year: 3025,
    type: 'IS Level 2',
    tonnage: 50,
    safeThrust: 6,
    fuel: 160,
    structuralIntegrity: 6,
    heatsinks: 0,
    sinkType: 0,
    engineType: 0, // ICE
    armorType: 0,
    cockpitType: 0, // Standard
    armor: [16, 12, 12, 8],
    equipmentByLocation: {
      'Nose Equipment': ['Autocannon/10', 'Ammo AC/10'],
      'Left Wing Equipment': ['Machine Gun'],
      'Right Wing Equipment': ['Machine Gun'],
    },
    rawTags: {},
    ...overrides,
  };
}

function createLightFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Light Scout',
    model: 'LS-1',
    tonnage: 30,
    safeThrust: 10,
    fuel: 100,
    structuralIntegrity: 4,
    armor: [10, 8, 8, 6],
    equipmentByLocation: {
      'Nose Equipment': ['Medium Laser'],
    },
  });
}

function createMediumFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Medium Interceptor',
    model: 'MI-2',
    tonnage: 60,
    safeThrust: 7,
    fuel: 200,
    structuralIntegrity: 7,
    armor: [20, 16, 16, 12],
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser'],
      'Left Wing Equipment': ['Medium Laser'],
      'Right Wing Equipment': ['Medium Laser'],
    },
  });
}

function createHeavyFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Heavy Bomber',
    model: 'HB-5',
    tonnage: 90,
    safeThrust: 5,
    fuel: 300,
    structuralIntegrity: 8,
    armor: [30, 24, 24, 18],
    equipmentByLocation: {
      'Nose Equipment': ['Autocannon/20'],
      'Left Wing Equipment': ['LRM 10'],
      'Right Wing Equipment': ['LRM 10'],
      'Fuselage Equipment': ['Bomb Bay'],
    },
  });
}

// ============================================================================
// Constructor and Properties Tests
// ============================================================================

describe('ConventionalFighterUnitHandler', () => {
  let handler: ConventionalFighterUnitHandler;

  beforeEach(() => {
    handler = createConventionalFighterHandler();
  });

  describe('constructor and properties', () => {
    it('should have unitType of CONVENTIONAL_FIGHTER', () => {
      expect(handler.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    });

    it('should have displayName of "Conventional Fighter"', () => {
      expect(handler.displayName).toBe('Conventional Fighter');
    });

    it('should return AerospaceLocation values from getLocations()', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(AerospaceLocation.NOSE);
      expect(locations).toContain(AerospaceLocation.LEFT_WING);
      expect(locations).toContain(AerospaceLocation.RIGHT_WING);
      expect(locations).toContain(AerospaceLocation.AFT);
      expect(locations).toContain(AerospaceLocation.FUSELAGE);
    });

    it('should return all 5 aerospace locations', () => {
      const locations = handler.getLocations();
      expect(locations.length).toBe(5);
    });
  });

  // ============================================================================
  // canHandle Tests
  // ============================================================================

  describe('canHandle', () => {
    it('should handle ConvFighter unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Aero unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ============================================================================
  // Parsing Tests
  // ============================================================================

  describe('parse', () => {
    describe('basic parsing', () => {
      it('should parse valid BLK document successfully', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit).toBeDefined();
        expect(result.data?.unit?.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
      });

      it('should parse chassis and model correctly', () => {
        const doc = createMockBlkDocument({
          name: 'F-100 Super Sabre',
          model: 'Alpha',
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.metadata.chassis).toBe('F-100 Super Sabre');
        expect(result.data?.unit?.metadata.model).toBe('Alpha');
      });

      it('should parse tonnage correctly', () => {
        const doc = createMockBlkDocument({ tonnage: 75 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.tonnage).toBe(75);
      });

      it('should always set motionType to AERODYNE', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(
          AerospaceMotionType.AERODYNE,
        );
      });
    });

    describe('movement calculation', () => {
      it('should parse safeThrust correctly', () => {
        const doc = createMockBlkDocument({ safeThrust: 8 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.safeThrust).toBe(8);
      });

      it('should calculate maxThrust as floor(safeThrust * 1.5)', () => {
        const doc = createMockBlkDocument({ safeThrust: 6 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(9);
      });

      it('should calculate maxThrust correctly for odd safeThrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 7 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(10); // floor(7 * 1.5) = 10
      });

      it('should fail validation when safeThrust is less than 1', () => {
        const doc = createMockBlkDocument({ safeThrust: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(false);
        expect(
          result.error!.errors.some((e) =>
            e.includes('at least 1 safe thrust'),
          ),
        ).toBe(true);
      });
    });

    describe('fuel parsing', () => {
      it('should parse fuel correctly', () => {
        const doc = createMockBlkDocument({ fuel: 250 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fuel).toBe(250);
      });

      it('should warn about very low fuel (< 40)', () => {
        const doc = createMockBlkDocument({ fuel: 30 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data!.warnings.some((w) => w.includes('low fuel'))).toBe(
          true,
        );
      });

      it('should not warn about adequate fuel', () => {
        const doc = createMockBlkDocument({ fuel: 100 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data!.warnings.some((w) => w.includes('low fuel'))).toBe(
          false,
        );
      });
    });

    describe('structural integrity parsing', () => {
      it('should parse structural integrity correctly', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 10 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.structuralIntegrity).toBe(10);
      });

      it('should handle missing structural integrity with default 0', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: undefined });
        const result = handler.parse(doc);

        expect(result.data?.unit?.structuralIntegrity).toBe(0);
      });
    });

    describe('heat sinks parsing', () => {
      it('should parse heat sinks count correctly', () => {
        const doc = createMockBlkDocument({ heatsinks: 5 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinks).toBe(5);
      });

      it('should parse heat sink type correctly', () => {
        const doc = createMockBlkDocument({ sinkType: 1 }); // Double
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinkType).toBe(1);
      });

      it('should default heat sinks to 0', () => {
        const doc = createMockBlkDocument({ heatsinks: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinks).toBe(0);
      });
    });

    describe('engine type mapping', () => {
      it('should map engine type 0 to ICE', () => {
        const doc = createMockBlkDocument({ engineType: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ICE,
        );
      });

      it('should map engine type 1 to FUEL_CELL', () => {
        const doc = createMockBlkDocument({ engineType: 1 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FUEL_CELL,
        );
      });

      it('should map engine type 2 to ELECTRIC', () => {
        const doc = createMockBlkDocument({ engineType: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ELECTRIC,
        );
      });

      it('should map engine type 3 to FISSION', () => {
        const doc = createMockBlkDocument({ engineType: 3 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FISSION,
        );
      });

      it('should map engine type 4 to FUSION', () => {
        const doc = createMockBlkDocument({ engineType: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FUSION,
        );
      });

      it('should map engine type 5 to SOLAR', () => {
        const doc = createMockBlkDocument({ engineType: 5 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.SOLAR,
        );
      });

      it('should map engine type 6 to MAGLEV', () => {
        const doc = createMockBlkDocument({ engineType: 6 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.MAGLEV,
        );
      });

      it('should default unknown engine type to ICE', () => {
        const doc = createMockBlkDocument({ engineType: 99 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ICE,
        );
      });
    });

    describe('armor by arc parsing', () => {
      it('should parse armor correctly into arcs', () => {
        const doc = createMockBlkDocument({ armor: [20, 15, 15, 10] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(20);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(15);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(15);
        expect(result.data?.unit?.armorByArc.aft).toBe(10);
      });

      it('should calculate total armor points correctly', () => {
        const doc = createMockBlkDocument({ armor: [20, 15, 15, 10] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.totalArmorPoints).toBe(60);
      });

      it('should handle empty armor array', () => {
        const doc = createMockBlkDocument({ armor: [] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(0);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(0);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(0);
        expect(result.data?.unit?.armorByArc.aft).toBe(0);
        expect(result.data?.unit?.totalArmorPoints).toBe(0);
      });

      it('should handle partial armor array', () => {
        const doc = createMockBlkDocument({ armor: [20, 15] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(20);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(15);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(0);
        expect(result.data?.unit?.armorByArc.aft).toBe(0);
      });
    });

    describe('cockpit type parsing', () => {
      it('should parse cockpit type 0 as STANDARD', () => {
        const doc = createMockBlkDocument({ cockpitType: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.STANDARD,
        );
      });

      it('should parse cockpit type 1 as SMALL', () => {
        const doc = createMockBlkDocument({ cockpitType: 1 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(AerospaceCockpitType.SMALL);
      });

      it('should parse cockpit type 2 as PRIMITIVE', () => {
        const doc = createMockBlkDocument({ cockpitType: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.PRIMITIVE,
        );
      });

      it('should default unknown cockpit type to STANDARD', () => {
        const doc = createMockBlkDocument({ cockpitType: 99 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.STANDARD,
        );
      });
    });

    describe('equipment parsing', () => {
      it('should parse equipment from all locations', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Large Laser'],
            'Left Wing Equipment': ['Medium Laser'],
            'Right Wing Equipment': ['SRM 6'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.equipment.length).toBe(3);
      });

      it('should normalize location names correctly', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            nose: ['Large Laser'],
            'left wing': ['Medium Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        const noseEquip = result.data?.unit?.equipment.find(
          (e) => e.location === AerospaceLocation.NOSE,
        );
        expect(noseEquip).toBeDefined();
      });

      it('should assign unique mount IDs to equipment', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Medium Laser', 'Medium Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        const ids = result.data?.unit?.equipment.map((e) => e.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids?.length);
      });

      it('should default unknown locations to FUSELAGE', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Unknown Location': ['Large Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.equipment[0].location).toBe(
          AerospaceLocation.FUSELAGE,
        );
      });
    });

    describe('bomb bay detection', () => {
      it('should detect bomb bay in equipment', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Fuselage Equipment': ['Bomb Bay'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(true);
      });

      it('should calculate bomb capacity as 10% of tonnage', () => {
        const doc = createMockBlkDocument({
          tonnage: 80,
          equipmentByLocation: {
            'Fuselage Equipment': ['Bomb Bay'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.bombCapacity).toBe(8); // 80 * 0.1
      });

      it('should set bombCapacity to 0 without bomb bay', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Large Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(false);
        expect(result.data?.unit?.bombCapacity).toBe(0);
      });

      it('should detect bomb in lowercase', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Fuselage Equipment': ['bomb rack'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(true);
      });
    });

    describe('tonnage limit validation', () => {
      it('should fail parsing when tonnage exceeds 100', () => {
        const doc = createMockBlkDocument({ tonnage: 120 });
        const result = handler.parse(doc);

        expect(result.success).toBe(false);
        expect(
          result.error!.errors.some((e) =>
            e.includes('cannot exceed 100 tons'),
          ),
        ).toBe(true);
      });

      it('should parse valid 100 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 100 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.tonnage).toBe(100);
      });
    });

    describe('weight class determination', () => {
      it('should classify tonnage <= 45 as LIGHT', () => {
        const doc = createLightFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      });

      it('should classify tonnage 46-70 as MEDIUM', () => {
        const doc = createMediumFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      });

      it('should classify tonnage > 70 as HEAVY', () => {
        const doc = createHeavyFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.HEAVY);
      });

      it('should classify 45 ton as LIGHT (boundary)', () => {
        const doc = createMockBlkDocument({ tonnage: 45 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      });

      it('should classify 70 ton as MEDIUM (boundary)', () => {
        const doc = createMockBlkDocument({ tonnage: 70 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      });
    });

    describe('tech base parsing', () => {
      it('should parse Inner Sphere tech base', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });

      it('should parse Clan tech base', () => {
        const doc = createMockBlkDocument({ type: 'Clan Level 3' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
      });

      it('should default to Inner Sphere for unknown tech base', () => {
        const doc = createMockBlkDocument({ type: 'Unknown' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });
    });

    describe('rules level parsing', () => {
      it('should parse Level 1 as INTRODUCTORY', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 1' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      });

      it('should parse Level 2 as STANDARD', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
      });

      it('should parse Level 3 as ADVANCED', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 3' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
      });

      it('should parse Introductory keyword as INTRODUCTORY', () => {
        const doc = createMockBlkDocument({ type: 'IS Introductory' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      });

      it('should default to STANDARD for unknown rules level', () => {
        const doc = createMockBlkDocument({ type: 'Unknown' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
      });
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('validate', () => {
    describe('tonnage limits', () => {
      it('should fail validation for tonnage less than 5 tons', () => {
        const doc = createMockBlkDocument({ tonnage: 3 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('at least 5 tons')),
        ).toBe(true);
      });

      it('should fail validation for tonnage exceeding 100 tons', () => {
        // Need to bypass parsing check first
        const doc = createMockBlkDocument({ tonnage: 50 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // Manually create a unit with invalid tonnage for validation
        const invalidUnit = {
          ...result.data!.unit,
          tonnage: 150,
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('cannot exceed 100 tons')),
        ).toBe(true);
      });

      it('should pass validation for 5 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 5 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('at least 5 tons')),
        ).toBe(false);
      });

      it('should pass validation for 100 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 100 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('cannot exceed 100 tons')),
        ).toBe(false);
      });
    });

    describe('thrust validation', () => {
      it('should fail validation for zero safe thrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 1 }); // Parse with valid value
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // Create unit with invalid thrust
        const invalidUnit = {
          ...result.data!.unit,
          movement: { safeThrust: 0, maxThrust: 0 },
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('at least 1 safe thrust')),
        ).toBe(true);
      });

      it('should pass validation with at least 1 safe thrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('at least 1 safe thrust')),
        ).toBe(false);
      });
    });

    describe('SI validation', () => {
      it('should fail validation for zero structural integrity', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 1 }); // Parse with valid
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const invalidUnit = {
          ...result.data!.unit,
          structuralIntegrity: 0,
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some((e) => e.includes('at least 1 SI'))).toBe(
          true,
        );
      });

      it('should pass validation with at least 1 SI', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.errors.some((e) => e.includes('at least 1 SI'))).toBe(
          false,
        );
      });
    });

    describe('atmosphere-only info', () => {
      it('should include atmosphere-only info message', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.infos.some((i) => i.includes('cannot operate in space')),
        ).toBe(true);
      });
    });

    describe('combined validation', () => {
      it('should pass validation for valid fighter', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // Calculation Tests
  // ============================================================================

  describe('calculations', () => {
    describe('calculateWeight', () => {
      it('should calculate weight greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        expect(weight).toBeGreaterThan(0);
      });

      it('should include engine weight component', () => {
        // Higher thrust should mean more engine weight
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 3 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include armor weight component', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [10, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include fuel weight component', () => {
        const lowFuelDoc = createMockBlkDocument({ fuel: 50 });
        const highFuelDoc = createMockBlkDocument({ fuel: 500 });

        const lowResult = handler.parse(lowFuelDoc);
        const highResult = handler.parse(highFuelDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include structural weight based on tonnage', () => {
        const lightDoc = createMockBlkDocument({ tonnage: 20, safeThrust: 10 });
        const heavyDoc = createMockBlkDocument({
          tonnage: 100,
          safeThrust: 10,
        });

        const lightResult = handler.parse(lightDoc);
        const heavyResult = handler.parse(heavyDoc);

        expect(lightResult.success).toBe(true);
        expect(heavyResult.success).toBe(true);

        const lightWeight = handler.calculateWeight(lightResult.data!.unit);
        const heavyWeight = handler.calculateWeight(heavyResult.data!.unit);

        expect(heavyWeight).toBeGreaterThan(lightWeight);
      });

      it('should include cockpit weight (2 tons)', () => {
        const doc = createMockBlkDocument({
          tonnage: 50,
          safeThrust: 5,
          armor: [0, 0, 0, 0],
          fuel: 0,
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        // Weight should include at least cockpit (2) + structure (5) + engine
        expect(weight).toBeGreaterThanOrEqual(7);
      });
    });

    describe('calculateBV', () => {
      it('should calculate BV greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.data!.unit);
        expect(bv).toBeGreaterThan(0);
      });

      it('should include armor BV contribution', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [5, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should include SI BV contribution', () => {
        const lowSIDoc = createMockBlkDocument({ structuralIntegrity: 2 });
        const highSIDoc = createMockBlkDocument({ structuralIntegrity: 10 });

        const lowResult = handler.parse(lowSIDoc);
        const highResult = handler.parse(highSIDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should apply thrust modifier to BV', () => {
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 3 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should return rounded integer BV', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.data!.unit);
        expect(Number.isInteger(bv)).toBe(true);
      });
    });

    describe('calculateCost', () => {
      it('should calculate cost greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        expect(cost).toBeGreaterThan(0);
      });

      it('should include base structure cost (tonnage * 20000)', () => {
        const lightDoc = createMockBlkDocument({ tonnage: 20, safeThrust: 1 });
        const heavyDoc = createMockBlkDocument({ tonnage: 100, safeThrust: 1 });

        const lightResult = handler.parse(lightDoc);
        const heavyResult = handler.parse(heavyDoc);

        expect(lightResult.success).toBe(true);
        expect(heavyResult.success).toBe(true);

        const lightCost = handler.calculateCost(lightResult.data!.unit);
        const heavyCost = handler.calculateCost(heavyResult.data!.unit);

        expect(heavyCost).toBeGreaterThan(lightCost);
      });

      it('should include engine cost based on thrust rating', () => {
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 2 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowCost = handler.calculateCost(lowResult.data!.unit);
        const highCost = handler.calculateCost(highResult.data!.unit);

        expect(highCost).toBeGreaterThan(lowCost);
      });

      it('should include armor cost (points * 5000)', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [5, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowCost = handler.calculateCost(lowResult.data!.unit);
        const highCost = handler.calculateCost(highResult.data!.unit);

        expect(highCost).toBeGreaterThan(lowCost);
      });

      it('should include avionics cost (50000)', () => {
        const doc = createMockBlkDocument({
          tonnage: 50,
          safeThrust: 5,
          armor: [0, 0, 0, 0],
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // Should include structure (1M) + engine + avionics (50k)
        expect(cost).toBeGreaterThanOrEqual(1050000);
      });

      it('should return rounded integer cost', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        expect(Number.isInteger(cost)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Serialization Tests
  // ============================================================================

  describe('serialization', () => {
    describe('serialize', () => {
      it('should serialize successfully', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.success).toBe(true);
        expect(serializeResult.data?.serialized).toBeDefined();
      });

      it('should include id in serialized output', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.id).toBeDefined();
      });

      it('should include chassis and model', () => {
        const doc = createMockBlkDocument({
          name: 'Test Fighter',
          model: 'TF-1',
        });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.chassis).toBe('Test Fighter');
        expect(serializeResult.data?.serialized?.model).toBe('TF-1');
      });

      it('should include unitType', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.unitType).toBe(
          UnitType.CONVENTIONAL_FIGHTER,
        );
      });

      it('should include tonnage', () => {
        const doc = createMockBlkDocument({ tonnage: 65 });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.tonnage).toBe(65);
      });
    });

    describe('serializeTypeSpecificFields', () => {
      it('should include configuration with engine type', () => {
        const doc = createMockBlkDocument({ engineType: 0 });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.configuration).toContain(
          'ICE',
        );
      });

      it('should include Conventional Fighter in configuration', () => {
        const doc = createMockBlkDocument();
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.configuration).toContain(
          'Conventional Fighter',
        );
      });

      it('should include rules level in serialized output', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const parseResult = handler.parse(doc);
        expect(parseResult.success).toBe(true);

        const serializeResult = handler.serialize(parseResult.data!.unit);
        expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
      });
    });

    describe('deserialize', () => {
      it('should return failure result (not implemented)', () => {
        const serialized: ISerializedUnit = {
          id: 'test-id',
          chassis: 'Test',
          model: 'T-1',
          unitType: String(UnitType.CONVENTIONAL_FIGHTER),
          configuration: 'Conventional Fighter (ICE)',
          techBase: 'Inner Sphere',
          rulesLevel: 'Standard',
          era: 'Succession Wars',
          year: 3025,
          tonnage: 50,
          engine: { type: 'ICE', rating: 200 },
          gyro: { type: 'Standard' },
          cockpit: 'Standard',
          structure: { type: 'Standard' },
          armor: {
            type: 'Standard',
            allocation: { nose: 16, leftWing: 12, rightWing: 12, aft: 8 },
          },
          heatSinks: { type: 'Single', count: 0 },
          movement: { walk: 6, jump: 0 },
          equipment: [],
          criticalSlots: {},
        };

        const result = handler.deserialize(serialized);
        expect(result.success).toBe(false);
        expect(
          result.error!.errors.some((e) => e.includes('not yet implemented')),
        ).toBe(true);
      });
    });
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createConventionalFighterHandler', () => {
    it('should create a new handler instance', () => {
      const newHandler = createConventionalFighterHandler();
      expect(newHandler).toBeInstanceOf(ConventionalFighterUnitHandler);
    });

    it('should create independent instances', () => {
      const handler1 = createConventionalFighterHandler();
      const handler2 = createConventionalFighterHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should have correct properties on created instance', () => {
      const newHandler = createConventionalFighterHandler();
      expect(newHandler.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
      expect(newHandler.displayName).toBe('Conventional Fighter');
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('edge cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalDoc: IBlkDocument = {
        blockVersion: 1,
        version: 'MAM0',
        unitType: 'ConvFighter',
        mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
        name: 'Minimal Fighter',
        model: '',
        year: 3025,
        type: 'IS Level 2',
        tonnage: 50,
        safeThrust: 5,
        armor: [10, 8, 8, 6],
        equipmentByLocation: {},
        rawTags: {},
      };

      const result = handler.parse(minimalDoc);
      expect(result.success).toBe(true);
      expect(result.data?.unit?.fuel).toBe(0);
      expect(result.data?.unit?.structuralIntegrity).toBe(0);
    });

    it('should generate IDs with conv-fighter prefix', () => {
      const doc = createMockBlkDocument();

      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.id).toMatch(/^conv-fighter-\d+$/);
    });

    it('should handle empty equipment list', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });

      const result = handler.parse(doc);
      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment).toHaveLength(0);
    });

    it('should parse all fighter weight classes correctly', () => {
      const lightResult = handler.parse(createLightFighterDocument());
      const mediumResult = handler.parse(createMediumFighterDocument());
      const heavyResult = handler.parse(createHeavyFighterDocument());

      expect(lightResult.success).toBe(true);
      expect(mediumResult.success).toBe(true);
      expect(heavyResult.success).toBe(true);

      expect(lightResult.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      expect(mediumResult.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      expect(heavyResult.data?.unit?.weightClass).toBe(WeightClass.HEAVY);
    });
  });
});
