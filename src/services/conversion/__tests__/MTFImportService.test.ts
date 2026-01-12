/**
 * MTFImportService Tests
 *
 * Tests for MTF import and validation service.
 */

import { MTFImportService, getMTFImportService } from '../MTFImportService';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

// Mock dependencies
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: jest.fn(() => ({
    resolveEquipmentName: jest.fn((name: string) => {
      const knownEquipment: Record<string, string> = {
        'medium-laser': 'medium-laser',
        'ac-20': 'ac-20',
        'lrm-20': 'lrm-20',
      };
      return knownEquipment[name] || null;
    }),
  })),
  EquipmentRegistry: jest.fn(),
}));

jest.mock('@/services/equipment/EquipmentNameMapper', () => ({
  getEquipmentNameMapper: jest.fn(() => ({
    mapName: jest.fn((name: string) => {
      const knownEquipment = ['medium-laser', 'ac-20', 'lrm-20'];
      if (knownEquipment.includes(name)) {
        return { success: true, mappedName: name };
      }
      return { success: false, alternates: ['medium-laser'] };
    }),
  })),
  EquipmentNameMapper: jest.fn(),
}));

/**
 * Create a valid serialized unit for testing
 */
function createValidSerializedUnit(overrides: Partial<ISerializedUnit> = {}): ISerializedUnit {
  return {
    id: 'test-unit-1',
    chassis: 'Atlas',
    model: 'AS7-D',
    unitType: 'BattleMech',
    configuration: 'BIPED',
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    era: 'LATE_SUCCESSION_WARS',
    year: 3025,
    tonnage: 100,
    engine: { type: 'STANDARD', rating: 300 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: 47,
        LEFT_TORSO: 32,
        RIGHT_TORSO: 32,
        LEFT_ARM: 34,
        RIGHT_ARM: 34,
        LEFT_LEG: 41,
        RIGHT_LEG: 41,
      },
    },
    heatSinks: { type: 'SINGLE', count: 20 },
    movement: { walk: 3, jump: 0 },
    equipment: [
      { id: 'ac-20', location: 'RIGHT_TORSO' },
      { id: 'lrm-20', location: 'LEFT_TORSO' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
    ],
    criticalSlots: {
      HEAD: ['Life Support', 'Sensors', 'Cockpit', 'Sensors', 'Life Support', null] as (string | null)[],
      CENTER_TORSO: Array<string | null>(12).fill(null),
      LEFT_TORSO: Array<string | null>(12).fill(null),
      RIGHT_TORSO: Array<string | null>(12).fill(null),
      LEFT_ARM: Array<string | null>(12).fill(null),
      RIGHT_ARM: Array<string | null>(12).fill(null),
      LEFT_LEG: Array<string | null>(6).fill(null),
      RIGHT_LEG: Array<string | null>(6).fill(null),
    },
    ...overrides,
  } as ISerializedUnit;
}

describe('MTFImportService', () => {
  let service: MTFImportService;

  beforeEach(() => {
    // Reset singleton
    // @ts-expect-error - accessing private static for testing
    MTFImportService.instance = null;
    service = getMTFImportService();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = getMTFImportService();
      const instance2 = getMTFImportService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('import', () => {
    it('should return error for direct MTF parsing', () => {
      const result = service.import('some mtf content');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('not implemented');
    });
  });

  describe('validate', () => {
    it('should return error for direct MTF validation', () => {
      const result = service.validate('some mtf content');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not implemented');
    });
  });

  describe('importFromJSON', () => {
    it('should successfully import a valid unit', () => {
      const unit = createValidSerializedUnit();
      const result = service.importFromJSON(unit);

      expect(result.success).toBe(true);
      expect(result.unitId).toBe('test-unit-1');
      expect(result.errors.length).toBe(0);
    });

    it('should report missing required fields', () => {
      const undefinedId: string = undefined!;
      const unit = createValidSerializedUnit({ id: undefinedId });
      const result = service.importFromJSON(unit);

      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should report all missing required fields', () => {
      const unit = {
        id: 'test',
      } as ISerializedUnit;

      const result = service.importFromJSON(unit);

      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.includes('chassis'))).toBe(true);
      expect(result.errors.some(e => e.includes('model'))).toBe(true);
      expect(result.errors.some(e => e.includes('tonnage'))).toBe(true);
    });

    it('should validate equipment references', () => {
      const unit = createValidSerializedUnit({
        equipment: [
          { id: 'unknown-weapon', location: 'LEFT_ARM' },
        ],
      });

      const result = service.importFromJSON(unit);

      expect(result.equipmentResolutionErrors.length).toBeGreaterThan(0);
    });

    it('should not validate equipment when disabled', () => {
      const unit = createValidSerializedUnit({
        equipment: [
          { id: 'unknown-weapon', location: 'LEFT_ARM' },
        ],
      });

      const result = service.importFromJSON(unit, { validateEquipment: false });

      expect(result.equipmentResolutionErrors.length).toBe(0);
    });

    it('should validate armor allocation', () => {
      const unit = createValidSerializedUnit({
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 15, // Exceeds max of 9
          },
        },
      });

      const result = service.importFromJSON(unit);

      expect(result.warnings.some(w => w.includes('Head'))).toBe(true);
    });

    it('should not validate armor when disabled', () => {
      const unit = createValidSerializedUnit({
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 15,
          },
        },
      });

      const result = service.importFromJSON(unit, { validateArmor: false });

      expect(result.warnings.filter(w => w.includes('Head')).length).toBe(0);
    });

    it('should validate critical slot counts', () => {
      const unit = createValidSerializedUnit({
        criticalSlots: {
          HEAD: Array<string | null>(10).fill(null), // Should be 6
        },
      });

      const result = service.importFromJSON(unit);

      expect(result.warnings.some(w => w.includes('HEAD') && w.includes('slots'))).toBe(true);
    });

    it('should not validate critical slots when disabled', () => {
      const unit = createValidSerializedUnit({
        criticalSlots: {
          HEAD: Array<string | null>(10).fill(null),
        },
      });

      const result = service.importFromJSON(unit, { validateCriticalSlots: false });

      expect(result.warnings.filter(w => w.includes('HEAD') && w.includes('slots')).length).toBe(0);
    });

    it('should fail in strict mode with required field errors', () => {
      const undefinedId: string = undefined!;
      const unit = createValidSerializedUnit({ id: undefinedId });

      const result = service.importFromJSON(unit, { strictMode: true });

      expect(result.success).toBe(false);
    });

    it('should treat armor errors as errors in strict mode', () => {
      const unit = createValidSerializedUnit();
      // Force large armor value
      (unit.armor.allocation as Record<string, number>).HEAD = 15;

      const result = service.importFromJSON(unit, { strictMode: true });

      expect(result.errors.some(e => e.includes('Head'))).toBe(true);
    });

    it('should handle malformed data gracefully', () => {
      // Test with data that will cause validation failures
      const unit = {} as ISerializedUnit;

      const result = service.importFromJSON(unit);

      expect(result.success).toBe(false);
      // Should have errors for missing required fields
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateJSON', () => {
    it('should return valid for properly structured data', () => {
      const data = createValidSerializedUnit();
      const result = service.validateJSON(data);

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail for non-object data', () => {
      expect(service.validateJSON(null).isValid).toBe(false);
      expect(service.validateJSON('string').isValid).toBe(false);
      expect(service.validateJSON(123).isValid).toBe(false);
    });

    it('should check required string fields', () => {
      const data = { id: 123 }; // id should be string
      const result = service.validateJSON(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('id') && e.includes('string'))).toBe(true);
    });

    it('should check required number fields', () => {
      const data = { ...createValidSerializedUnit(), tonnage: 'hundred' };
      const result = service.validateJSON(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('tonnage') && e.includes('number'))).toBe(true);
    });

    it('should check required object fields', () => {
      const data = { ...createValidSerializedUnit(), engine: 'not an object' };
      const result = service.validateJSON(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('engine') && e.includes('object'))).toBe(true);
    });

    it('should check equipment array', () => {
      const data = { ...createValidSerializedUnit(), equipment: 'not an array' };
      const result = service.validateJSON(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('equipment') && e.includes('array'))).toBe(true);
    });
  });

  describe('resolveEquipment', () => {
    it('should resolve known equipment', () => {
      const { resolved, unresolved } = service.resolveEquipment([
        'medium-laser',
        'ac-20',
      ]);

      expect(resolved.size).toBe(2);
      expect(unresolved.length).toBe(0);
    });

    it('should track unresolved equipment', () => {
      const { resolved, unresolved } = service.resolveEquipment([
        'medium-laser',
        'unknown-weapon',
      ]);

      expect(resolved.size).toBe(1);
      expect(unresolved).toContain('unknown-weapon');
    });
  });

  describe('loadFromUrl', () => {
    it('should load and import from URL', async () => {
      const unit = createValidSerializedUnit();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unit),
      });

      const result = await service.loadFromUrl('http://example.com/unit.json');

      expect(result.success).toBe(true);
      expect(result.unitId).toBe('test-unit-1');
    });

    it('should handle HTTP errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.loadFromUrl('http://example.com/unit.json');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('404');
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.loadFromUrl('http://example.com/unit.json');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Network error');
    });

    it('should pass validation options through', async () => {
      const unit = createValidSerializedUnit({
        equipment: [{ id: 'unknown-weapon', location: 'LA' }],
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(unit),
      });

      const result = await service.loadFromUrl('http://example.com/unit.json', {
        validateEquipment: false,
      });

      expect(result.equipmentResolutionErrors.length).toBe(0);
    });
  });
});
