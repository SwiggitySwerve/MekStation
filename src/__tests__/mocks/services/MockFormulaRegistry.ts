/**
 * Mock Formula Registry
 * 
 * Mock implementation of IFormulaRegistry for testing.
 */

import { IFormulaRegistry } from '@/services/equipment/FormulaRegistry';
import { 
  IVariableFormulas, 
  ceilDivide, 
  floorDivide,
  equalsWeight, 
  multiply, 
  fixed,
  plus,
  multiplyRound,
} from '@/types/equipment/VariableEquipment';

/**
 * Built-in test formulas for common equipment
 * Uses proper IFormula structure matching builtinFormulas.ts
 */
const TEST_FORMULAS: Map<string, IVariableFormulas> = new Map([
  ['targeting-computer-is', {
    weight: ceilDivide('directFireWeaponTonnage', 4),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  }],
  ['targeting-computer-clan', {
    weight: ceilDivide('directFireWeaponTonnage', 5),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  }],
  ['masc-is', {
    weight: ceilDivide('engineRating', 20),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['engineRating', 'tonnage'],
  }],
  ['masc-clan', {
    weight: ceilDivide('engineRating', 25),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['engineRating', 'tonnage'],
  }],
  ['supercharger', {
    weight: multiplyRound('engineWeight', 0.1, 0.5),
    criticalSlots: fixed(1),
    cost: multiply('engineWeight', 10000),
    requiredContext: ['engineWeight'],
  }],
  ['hatchet', {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 5000),
    damage: floorDivide('tonnage', 5),
    requiredContext: ['tonnage'],
  }],
  ['sword', {
    weight: ceilDivide('tonnage', 15),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    damage: plus(floorDivide('tonnage', 10), 1),
    requiredContext: ['tonnage'],
  }],
]);

/**
 * Create a mock formula registry for testing
 */
export function createMockFormulaRegistry(): jest.Mocked<IFormulaRegistry> {
  const customFormulas = new Map<string, IVariableFormulas>();

  return {
    initialize: jest.fn().mockImplementation(async () => {
      // No-op for mock
    }),

    getFormulas: jest.fn().mockImplementation((equipmentId: string) => {
      // Check custom formulas first
      if (customFormulas.has(equipmentId)) {
        return customFormulas.get(equipmentId);
      }
      // Then check built-in test formulas
      return TEST_FORMULAS.get(equipmentId);
    }),

    isVariable: jest.fn().mockImplementation((equipmentId: string) => {
      return TEST_FORMULAS.has(equipmentId) || customFormulas.has(equipmentId);
    }),

    getRequiredContext: jest.fn().mockImplementation((equipmentId: string) => {
      const formulas = TEST_FORMULAS.get(equipmentId) || customFormulas.get(equipmentId);
      return formulas?.requiredContext ?? [];
    }),

    getAllVariableEquipmentIds: jest.fn().mockImplementation(() => {
      return [
        ...Array.from(TEST_FORMULAS.keys()),
        ...Array.from(customFormulas.keys()),
      ];
    }),

    registerCustomFormulas: jest.fn().mockImplementation(async (equipmentId: string, formulas: IVariableFormulas) => {
      customFormulas.set(equipmentId, formulas);
    }),

    unregisterCustomFormulas: jest.fn().mockImplementation(async (equipmentId: string) => {
      customFormulas.delete(equipmentId);
    }),

    getCustomFormulaIds: jest.fn().mockImplementation(() => {
      return Array.from(customFormulas.keys());
    }),
  };
}

/**
 * Create a formula registry that throws errors for testing error handling
 */
export function createFailingFormulaRegistry(): jest.Mocked<IFormulaRegistry> {
  return {
    initialize: jest.fn().mockRejectedValue(new Error('Storage unavailable')),
    getFormulas: jest.fn().mockReturnValue(undefined),
    isVariable: jest.fn().mockReturnValue(false),
    getRequiredContext: jest.fn().mockReturnValue([]),
    getAllVariableEquipmentIds: jest.fn().mockReturnValue([]),
    registerCustomFormulas: jest.fn().mockRejectedValue(new Error('Cannot save')),
    unregisterCustomFormulas: jest.fn().mockRejectedValue(new Error('Cannot delete')),
    getCustomFormulaIds: jest.fn().mockReturnValue([]),
  };
}

/**
 * Export test formulas for direct access in tests
 */
export { TEST_FORMULAS };

