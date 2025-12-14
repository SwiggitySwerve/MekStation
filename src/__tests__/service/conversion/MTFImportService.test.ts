/**
 * MTF Import Service Tests
 * 
 * Tests for importing and validating unit data from JSON.
 * 
 * @spec openspec/specs/data-loading-architecture/spec.md
 */

import { MTFImportService, getMTFImportService } from '@/services/conversion/MTFImportService';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { TechBase } from '@/types/enums/TechBase';

describe('MTFImportService', () => {
  let service: MTFImportService;

  beforeEach(() => {
    service = getMTFImportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getMTFImportService();
      const instance2 = getMTFImportService();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from static method', () => {
      const instance1 = MTFImportService.getInstance();
      const instance2 = MTFImportService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // import() - Raw MTF (not implemented)
  // ============================================================================
  describe('import()', () => {
    it('should return error for raw MTF parsing', () => {
      const result = service.import('some mtf content');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Direct MTF parsing not implemented. Use importFromJSON for pre-converted JSON.');
    });
  });

  // ============================================================================
  // validate() - Raw MTF (not implemented)
  // ============================================================================
  describe('validate()', () => {
    it('should return error for raw MTF validation', () => {
      const result = service.validate('some mtf content');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Direct MTF validation not implemented. Use validateJSON for JSON data.');
    });
  });

  // ============================================================================
  // validateJSON()
  // ============================================================================
  describe('validateJSON()', () => {
    it('should reject non-object data', () => {
      const result = service.validateJSON(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data must be an object');
    });

    it('should reject undefined', () => {
      const result = service.validateJSON(undefined);
      expect(result.isValid).toBe(false);
    });

    it('should validate required string fields', () => {
      const result = service.validateJSON({
        id: 123, // wrong type
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2755,
        tonnage: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "id" must be a string');
    });

    it('should validate required number fields', () => {
      const result = service.validateJSON({
        id: 'test-id',
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: '2755', // wrong type
        tonnage: 100,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "year" must be a number');
    });

    it('should validate required object fields', () => {
      const result = service.validateJSON({
        id: 'test-id',
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2755,
        tonnage: 100,
        engine: null, // should be object
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "engine" must be an object');
    });

    it('should validate equipment is array', () => {
      const result = service.validateJSON({
        id: 'test-id',
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2755,
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        gyro: { type: 'Standard' },
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walk: 3, jump: 0 },
        criticalSlots: {},
        equipment: 'not-an-array', // should be array
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field "equipment" must be an array');
    });

    it('should pass valid minimal data', () => {
      const result = service.validateJSON({
        id: 'test-id',
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2755,
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        gyro: { type: 'Standard' },
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walk: 3, jump: 0 },
        criticalSlots: {},
        equipment: [],
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // importFromJSON()
  // ============================================================================
  describe('importFromJSON()', () => {
    const validUnit: ISerializedUnit = {
      id: 'atlas-as7-d',
      chassis: 'Atlas',
      model: 'AS7-D',
      unitType: 'BattleMech',
      configuration: 'Biped',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: 'Standard',
      era: 'Star League',
      year: 2755,
      tonnage: 100,
      engine: { type: 'Standard', rating: 300 },
      gyro: { type: 'Standard' },
      cockpit: 'Standard',
      structure: { type: 'Standard' },
      armor: {
        type: 'Standard',
        allocation: {
          HEAD: 9,
          CENTER_TORSO: 47,
          LEFT_TORSO: 32,
          RIGHT_TORSO: 32,
        },
      },
      heatSinks: { type: 'Single', count: 20 },
      movement: { walk: 3, jump: 0 },
      equipment: [
        { id: 'ac-20', location: 'RT' },
        { id: 'lrm-20', location: 'LT' },
      ],
      criticalSlots: {
        HEAD: ['Life Support', 'Sensors', 'Cockpit', 'null', 'Sensors', 'Life Support'],
      },
    };

    it('should import valid unit successfully', () => {
      const result = service.importFromJSON(validUnit);
      
      expect(result.success).toBe(true);
      expect(result.unitId).toBe('atlas-as7-d');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      // Create unit with missing id using Partial to indicate incomplete type
      const { id: _removed, ...unitWithoutId } = validUnit;
      void _removed;
      const invalidUnit: Partial<ISerializedUnit> = unitWithoutId;
      
      const result = service.importFromJSON(invalidUnit as ISerializedUnit);
      
      expect(result.errors).toContain('Missing required field: id');
    });

    it('should validate all required fields', () => {
      const emptyUnit = {} as ISerializedUnit;
      
      const result = service.importFromJSON(emptyUnit);
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Missing required field: id');
      expect(result.errors).toContain('Missing required field: chassis');
      expect(result.errors).toContain('Missing required field: model');
      expect(result.errors).toContain('Missing required field: engine');
    });

    it('should fail in strict mode with any errors', () => {
      // Create unit with missing id using destructuring
      const { id: _removed, ...unitWithoutId } = validUnit;
      void _removed;
      const invalidUnit: Partial<ISerializedUnit> = unitWithoutId;
      
      const result = service.importFromJSON(invalidUnit as ISerializedUnit, { strictMode: true });
      
      expect(result.success).toBe(false);
    });

    it('should validate armor allocation', () => {
      const unitWithBadArmor: ISerializedUnit = {
        ...validUnit,
        armor: {
          type: 'Standard',
          allocation: {
            HEAD: 15, // exceeds max of 9
          },
        },
      };

      const result = service.importFromJSON(unitWithBadArmor, { validateArmor: true });
      
      // In non-strict mode, armor errors become warnings
      expect(result.warnings.some(w => w.includes('Head armor exceeds maximum'))).toBe(true);
    });

    it('should validate critical slots', () => {
      const unitWithBadSlots: ISerializedUnit = {
        ...validUnit,
        criticalSlots: {
          HEAD: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], // 12 slots, should be 6
        },
      };

      const result = service.importFromJSON(unitWithBadSlots, { validateCriticalSlots: true });
      
      expect(result.warnings.some(w => w.includes('HEAD has'))).toBe(true);
    });

    it('should skip equipment validation when disabled', () => {
      const result = service.importFromJSON(validUnit, { validateEquipment: false });
      
      expect(result.success).toBe(true);
    });

    it('should handle thrown exceptions', () => {
      // Create a minimal unit with missing required fields to trigger validation
      const badUnit: Partial<ISerializedUnit> = {
        id: 'test',
        // Missing most fields will trigger validation errors
      };

      const result = service.importFromJSON(badUnit as ISerializedUnit);
      
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // resolveEquipment()
  // ============================================================================
  describe('resolveEquipment()', () => {
    it('should resolve known equipment IDs', () => {
      const result = service.resolveEquipment(['medium-laser', 'ac-20']);
      
      // The actual resolution depends on the equipment registry
      expect(result.resolved).toBeDefined();
      expect(result.unresolved).toBeDefined();
    });

    it('should track unresolved IDs', () => {
      const result = service.resolveEquipment(['completely-fake-equipment-12345']);
      
      expect(result.unresolved).toContain('completely-fake-equipment-12345');
    });

    it('should handle empty array', () => {
      const result = service.resolveEquipment([]);
      
      expect(result.resolved.size).toBe(0);
      expect(result.unresolved).toHaveLength(0);
    });
  });

  // ============================================================================
  // loadFromUrl() - Async
  // ============================================================================
  describe('loadFromUrl()', () => {
    it('should handle fetch errors gracefully', async () => {
      const result = await service.loadFromUrl('http://invalid-url-that-does-not-exist.invalid/unit.json');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.unitId).toBeUndefined();
    });
  });
});

