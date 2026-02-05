/**
 * Formula Registry Tests
 *
 * Tests for the formula registry with mock storage.
 *
 * @spec openspec/specs/formula-registry/spec.md
 */

import { FormulaRegistry } from '@/services/equipment/FormulaRegistry';
import { VARIABLE_EQUIPMENT_FORMULAS } from '@/services/equipment/variableEquipmentFormulas';
import {
  IVariableFormulas,
  fixed,
  ceilDivide,
  equalsWeight,
  multiply,
} from '@/types/equipment/VariableEquipment';

// Mock the IndexedDB service
jest.mock('@/services/persistence/IndexedDBService', () => ({
  indexedDBService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn().mockResolvedValue([]),
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  STORES: {
    CUSTOM_FORMULAS: 'custom-formulas',
    CUSTOM_UNITS: 'custom-units',
    UNIT_METADATA: 'unit-metadata',
  },
}));

describe('FormulaRegistry', () => {
  let registry: FormulaRegistry;

  beforeEach(() => {
    registry = new FormulaRegistry();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Initialization
  // ============================================================================
  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(registry.initialize()).resolves.not.toThrow();
    });

    it('should only initialize once', async () => {
      await registry.initialize();
      await registry.initialize();
      // Should not throw, second call is no-op
    });
  });

  // ============================================================================
  // getFormulas
  // ============================================================================
  describe('getFormulas', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return builtin formulas', () => {
      // Get a known builtin equipment ID
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      if (builtinIds.length > 0) {
        const formulas = registry.getFormulas(builtinIds[0]);
        expect(formulas).toBeDefined();
      }
    });

    it('should return undefined for unknown equipment', () => {
      expect(registry.getFormulas('unknown-equipment')).toBeUndefined();
    });

    it('should prefer custom formulas over builtin', async () => {
      const customFormulas: IVariableFormulas = {
        weight: fixed(99),
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      };

      // Register custom formulas for a builtin ID
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      if (builtinIds.length > 0) {
        const id = builtinIds[0];
        await registry.registerCustomFormulas(id, customFormulas);

        const formulas = registry.getFormulas(id);
        expect(formulas?.weight).toEqual(fixed(99));
      }
    });
  });

  // ============================================================================
  // isVariable
  // ============================================================================
  describe('isVariable', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return true for builtin variable equipment', () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      if (builtinIds.length > 0) {
        expect(registry.isVariable(builtinIds[0])).toBe(true);
      }
    });

    it('should return false for non-variable equipment', () => {
      expect(registry.isVariable('medium-laser')).toBe(false);
      expect(registry.isVariable('unknown-equipment')).toBe(false);
    });

    it('should return true for custom variable equipment', async () => {
      const customFormulas: IVariableFormulas = {
        weight: fixed(1),
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      };

      await registry.registerCustomFormulas('custom-equipment', customFormulas);
      expect(registry.isVariable('custom-equipment')).toBe(true);
    });
  });

  // ============================================================================
  // getRequiredContext
  // ============================================================================
  describe('getRequiredContext', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return required context for known equipment', () => {
      // Most variable equipment requires tonnage or engineRating
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      for (const id of builtinIds) {
        const context = registry.getRequiredContext(id);
        expect(Array.isArray(context)).toBe(true);
      }
    });

    it('should return empty array for unknown equipment', () => {
      expect(registry.getRequiredContext('unknown')).toEqual([]);
    });
  });

  // ============================================================================
  // getAllVariableEquipmentIds
  // ============================================================================
  describe('getAllVariableEquipmentIds', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return all builtin equipment IDs', () => {
      const ids = registry.getAllVariableEquipmentIds();
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);

      for (const builtinId of builtinIds) {
        expect(ids).toContain(builtinId);
      }
    });

    it('should include custom equipment IDs', async () => {
      const customFormulas: IVariableFormulas = {
        weight: fixed(1),
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      };

      await registry.registerCustomFormulas(
        'my-custom-equipment',
        customFormulas,
      );

      const ids = registry.getAllVariableEquipmentIds();
      expect(ids).toContain('my-custom-equipment');
    });

    it('should not have duplicates', async () => {
      const ids = registry.getAllVariableEquipmentIds();
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ============================================================================
  // registerCustomFormulas
  // ============================================================================
  describe('registerCustomFormulas', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should register valid custom formulas', async () => {
      const customFormulas: IVariableFormulas = {
        weight: ceilDivide('tonnage', 10),
        criticalSlots: equalsWeight(),
        cost: multiply('weight', 5000),
        requiredContext: ['tonnage'],
      };

      await registry.registerCustomFormulas('test-equipment', customFormulas);

      expect(registry.isVariable('test-equipment')).toBe(true);
      expect(registry.getFormulas('test-equipment')).toEqual(customFormulas);
    });

    it('should reject invalid formulas', async () => {
      const invalidFormulas = {
        weight: { type: 'FIXED' }, // Missing value
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      } as IVariableFormulas;

      await expect(
        registry.registerCustomFormulas('invalid', invalidFormulas),
      ).rejects.toThrow();
    });

    it('should reject formulas with missing required fields', async () => {
      // Intentionally create an incomplete formula object to test validation
      // Use Partial to indicate incomplete implementation
      const invalidFormulas: Partial<IVariableFormulas> = {
        weight: fixed(1),
        // Missing criticalSlots
        cost: fixed(1000),
        requiredContext: [],
      };

      await expect(
        registry.registerCustomFormulas(
          'invalid',
          invalidFormulas as IVariableFormulas,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // unregisterCustomFormulas
  // ============================================================================
  describe('unregisterCustomFormulas', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should unregister custom formulas', async () => {
      const customFormulas: IVariableFormulas = {
        weight: fixed(1),
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      };

      await registry.registerCustomFormulas('temp-equipment', customFormulas);
      expect(registry.isVariable('temp-equipment')).toBe(true);

      await registry.unregisterCustomFormulas('temp-equipment');
      expect(registry.isVariable('temp-equipment')).toBe(false);
    });

    it('should not throw for non-existent equipment', async () => {
      await expect(
        registry.unregisterCustomFormulas('non-existent'),
      ).resolves.not.toThrow();
    });

    it('should not affect builtin formulas', async () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      if (builtinIds.length > 0) {
        await registry.unregisterCustomFormulas(builtinIds[0]);
        // Builtin should still be available
        expect(registry.isVariable(builtinIds[0])).toBe(true);
      }
    });
  });

  // ============================================================================
  // getCustomFormulaIds
  // ============================================================================
  describe('getCustomFormulaIds', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should return empty array initially', () => {
      expect(registry.getCustomFormulaIds()).toEqual([]);
    });

    it('should return custom formula IDs after registration', async () => {
      const customFormulas: IVariableFormulas = {
        weight: fixed(1),
        criticalSlots: fixed(1),
        cost: fixed(1000),
        requiredContext: [],
      };

      await registry.registerCustomFormulas('custom-1', customFormulas);
      await registry.registerCustomFormulas('custom-2', customFormulas);

      const ids = registry.getCustomFormulaIds();
      expect(ids).toContain('custom-1');
      expect(ids).toContain('custom-2');
      expect(ids.length).toBe(2);
    });

    it('should not include builtin IDs', () => {
      const customIds = registry.getCustomFormulaIds();
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);

      for (const builtinId of builtinIds) {
        expect(customIds).not.toContain(builtinId);
      }
    });
  });

  // ============================================================================
  // Builtin Formulas Integrity
  // ============================================================================
  describe('Builtin Formulas Integrity', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('all builtin formulas should have weight formula', () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      for (const id of builtinIds) {
        const formulas = registry.getFormulas(id);
        expect(formulas?.weight).toBeDefined();
      }
    });

    it('all builtin formulas should have criticalSlots formula', () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      for (const id of builtinIds) {
        const formulas = registry.getFormulas(id);
        expect(formulas?.criticalSlots).toBeDefined();
      }
    });

    it('all builtin formulas should have cost formula', () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      for (const id of builtinIds) {
        const formulas = registry.getFormulas(id);
        expect(formulas?.cost).toBeDefined();
      }
    });

    it('all builtin formulas should have requiredContext', () => {
      const builtinIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
      for (const id of builtinIds) {
        const formulas = registry.getFormulas(id);
        expect(Array.isArray(formulas?.requiredContext)).toBe(true);
      }
    });
  });
});
