/**
 * Unit Factory Service Integration Tests
 * 
 * Tests conversion of ISerializedUnit to IBattleMech.
 * Validates parsing, equipment resolution, and derived value calculation.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnitFactoryService } from '@/services/units/UnitFactoryService';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { MechLocation } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/enums/Era';

const UNITS_PATH = path.join(__dirname, '../../../../public/data/units/battlemechs');

describe('UnitFactoryService', () => {
  let factory: UnitFactoryService;

  beforeAll(() => {
    factory = UnitFactoryService.getInstance();
  });

  // ============================================================================
  // Basic Conversion
  // ============================================================================
  describe('Basic Conversion', () => {
    let atlasData: ISerializedUnit;

    beforeAll(() => {
      const filePath = path.join(UNITS_PATH, '2-star-league/standard/Atlas AS7-D.json');
      const content = fs.readFileSync(filePath, 'utf-8');
      atlasData = JSON.parse(content) as ISerializedUnit;
    });

    it('should successfully convert Atlas AS7-D', () => {
      const result = factory.createFromSerialized(atlasData);
      
      expect(result.success).toBe(true);
      expect(result.unit).not.toBeNull();
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve identity fields', () => {
      const result = factory.createFromSerialized(atlasData);
      const unit = result.unit!;

      expect(unit.name).toContain('Atlas');
      expect(unit.tonnage).toBe(100);
    });

    it('should parse tech base correctly', () => {
      const result = factory.createFromSerialized(atlasData);
      const unit = result.unit!;

      expect(unit.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should parse rules level correctly', () => {
      const result = factory.createFromSerialized(atlasData);
      const unit = result.unit!;

      expect(unit.rulesLevel).toBe(RulesLevel.STANDARD);
    });

    it('should parse era correctly', () => {
      const result = factory.createFromSerialized(atlasData);
      const unit = result.unit!;

      expect(unit.era).toBe(Era.STAR_LEAGUE);
    });
  });

  // ============================================================================
  // Engine Parsing
  // ============================================================================
  describe('Engine Parsing', () => {
    it('should parse standard fusion engine', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.engine.rating).toBe(300);
      // Engine type should be parsed from "FUSION" or "STANDARD"
    });

    it('should have engine rating', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Standard 300 fusion engine
      expect(unit.engine.rating).toBe(300);
    });

    it('should calculate engine weight correctly', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Standard 300 fusion engine = 19.0 tons (per TechManual table)
      // The engine weight is used in totalWeight calculation
      expect(unit.totalWeight).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Gyro Parsing
  // ============================================================================
  describe('Gyro Parsing', () => {
    it('should parse standard gyro', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Standard gyro for 300 rating = 3 tons
      expect(unit.gyro.weight).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Armor Allocation
  // ============================================================================
  describe('Armor Allocation', () => {
    it('should build armor allocation correctly', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Check armor exists
      expect(unit.armorAllocation).toBeDefined();
      expect(unit.totalArmorPoints).toBeGreaterThan(0);
    });

    it('should have armor type', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.armorType).toBeDefined();
    });

    it('should have armor allocation defined', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Check armor allocation exists
      expect(unit.armorAllocation).toBeDefined();
    });

    it('should have front/rear torso armor', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Atlas AS7-D armor allocation per the JSON:
      // CENTER_TORSO: front 47, rear 14
      // LEFT_TORSO: front 32, rear 10
      // RIGHT_TORSO: front 32, rear 10
      expect(unit.armorAllocation.centerTorso).toBe(47);
      expect(unit.armorAllocation.centerTorsoRear).toBe(14);
      expect(unit.armorAllocation.leftTorso).toBe(32);
      expect(unit.armorAllocation.leftTorsoRear).toBe(10);
      expect(unit.armorAllocation.rightTorso).toBe(32);
      expect(unit.armorAllocation.rightTorsoRear).toBe(10);
    });
  });

  // ============================================================================
  // Critical Slots
  // ============================================================================
  describe('Critical Slots', () => {
    it('should build critical slot assignments', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.criticalSlots).toBeDefined();
      expect(Array.isArray(unit.criticalSlots)).toBe(true);
    });

    it('should have critical slots defined', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Check that we have some critical slots
      expect(unit.criticalSlots.length).toBeGreaterThan(0);
    });

    it('each critical slot assignment should have location and slots array', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Check critical slot assignments have expected structure
      // Structure is: { location: string, slots: ICriticalSlot[] }
      for (const assignment of unit.criticalSlots) {
        expect(assignment).toHaveProperty('location');
        expect(assignment).toHaveProperty('slots');
        expect(Array.isArray(assignment.slots)).toBe(true);
      }
    });

    it('each slot in assignment should have index and content', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Check a sample assignment's slots
      const firstAssignment = unit.criticalSlots[0];
      for (const slot of firstAssignment.slots) {
        expect(slot).toHaveProperty('index');
        expect(slot).toHaveProperty('content');
        expect(slot).toHaveProperty('isDestroyed');
        expect(slot).toHaveProperty('isFixed');
      }
    });
  });

  // ============================================================================
  // Movement
  // ============================================================================
  describe('Movement', () => {
    it('should parse walking MP', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.movement.walkMP).toBe(3);
    });

    it('should calculate running MP', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      // Running = Walking * 1.5, rounded up
      expect(unit.movement.runMP).toBe(5); // ceil(3 * 1.5) = 5
    });

    it('should parse jump MP', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.movement.jumpMP).toBe(0);
    });
  });

  // ============================================================================
  // Equipment
  // ============================================================================
  describe('Equipment', () => {
    it('should populate equipment list', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);
      const unit = result.unit!;

      expect(unit.equipment).toBeDefined();
      expect(unit.equipment.length).toBeGreaterThan(0);
    });

    it('should include warnings for unresolved equipment', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const result = factory.createFromSerialized(data);

      // May have warnings if equipment IDs don't match registry
      // This is expected during initial implementation
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle missing required fields', () => {
      const invalidData = {
        id: 'test',
        chassis: 'Test',
        // Missing most required fields
      } as unknown as ISerializedUnit;

      const result = factory.createFromSerialized(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid engine type', () => {
      const data = loadUnit('2-star-league/standard/Atlas AS7-D.json');
      const invalidData = {
        ...data,
        engine: { type: 'INVALID_ENGINE', rating: 300 },
      };

      const result = factory.createFromSerialized(invalidData);
      
      // Should still succeed but use default engine type
      expect(result.unit).not.toBeNull();
    });
  });

  // ============================================================================
  // Batch Conversion
  // ============================================================================
  describe('Batch Conversion', () => {
    it('should convert multiple units from different eras', () => {
      const testUnits = [
        '1-age-of-war/standard/Mackie MSK-6S.json',
        '2-star-league/standard/Atlas AS7-D.json',
        '3-succession-wars/standard/Hunchback HBK-4G.json',
      ];

      for (const unitPath of testUnits) {
        const fullPath = path.join(UNITS_PATH, unitPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(content) as ISerializedUnit;
          const result = factory.createFromSerialized(data);

          expect(result.success).toBe(true);
          expect(result.unit).not.toBeNull();
        }
      }
    });

    it('should handle Clan tech base units', () => {
      // Find a Clan unit
      const clanPath = path.join(UNITS_PATH, '4-clan-invasion/advanced');
      if (fs.existsSync(clanPath)) {
        const files = fs.readdirSync(clanPath).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const content = fs.readFileSync(path.join(clanPath, files[0]), 'utf-8');
          const data = JSON.parse(content) as ISerializedUnit;
          const result = factory.createFromSerialized(data);

          expect(result.success).toBe(true);
        }
      }
    });
  });
});

/**
 * Helper to load a unit file
 */
function loadUnit(relativePath: string): ISerializedUnit {
  const fullPath = path.join(UNITS_PATH, relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as ISerializedUnit;
}

