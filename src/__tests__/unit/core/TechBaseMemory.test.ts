import {
  createDefaultMemory,
  updateMemory, // Corrected export name based on read_file
  validateAndResolveComponentWithMemory,
  getRememberedComponent
} from '../../../utils/techBaseMemory';
import { ComponentMemoryState } from '../../../types/componentDatabase';
import { ComponentCategory, TechBase } from '../../../types/core/BaseTypes';

// Mock componentDatabaseHelpers to avoid complex dependency
jest.mock('../../../utils/componentDatabaseHelpers', () => ({
  getDefaultComponent: (category: any, techBase: any) => ({ name: 'Standard' }),
  isComponentAvailable: (name: any, category: any, techBase: any) => true,
  getComponentsByCategory: () => []
}));

describe('TechBaseMemory', () => {
  describe('Initialization', () => {
    it('should create default memory state', () => {
      const memory = createDefaultMemory();
      expect(memory).toBeDefined();
      expect(memory.gyro).toBeDefined();
      expect(memory.engine).toBeDefined();
      expect(memory.gyro['Inner Sphere']).toBe('Standard'); // Changed based on implementation (string value directly)
    });
  });

  describe('Memory Updates', () => {
    it('should update memory entry correctly', () => {
      const memory = createDefaultMemory();
      const result = updateMemory(
        memory,
        ComponentCategory.GYRO,
        TechBase.INNER_SPHERE,
        'Compact'
      );
      
      expect(result.updatedMemory.gyro['Inner Sphere']).toBe('Compact');
      expect(result.changed).toBe(true);
    });
  });

  describe('Component Resolution', () => {
    it('should resolve component from memory', () => {
      // Setup memory with a preference
      const memory = createDefaultMemory();
      const updateResult = updateMemory(
        memory,
        ComponentCategory.GYRO,
        TechBase.CLAN,
        'XL'
      );

      // Resolve component when switching to Clan
      const result = validateAndResolveComponentWithMemory(
        'Standard', // Current component
        ComponentCategory.GYRO,
        TechBase.INNER_SPHERE, // Old tech base
        TechBase.CLAN, // New tech base
        updateResult.updatedMemory,
        undefined
      );

      expect(result.resolvedComponent).toBe('XL');
      expect(result.wasRestored).toBe(true);
    });

    it('should fallback to standard if no memory exists', () => {
      const memory = createDefaultMemory(); 
      // Note: In the implementation, getRememberedComponent returns "Standard" even if it's just the default,
      // so wasRestored becomes true because it found "Standard" in the memory object (since createDefaultMemory populates it).
      // To test fallback, we might need to simulate an empty or invalid memory, OR accept that "default memory" acts as "restored memory".
      
      // Let's manually clear the memory for Clan Gyro to test fallback logic
      memory.gyro[TechBase.CLAN] = ''; 

      const result = validateAndResolveComponentWithMemory(
        'Standard',
        ComponentCategory.GYRO,
        TechBase.INNER_SPHERE,
        TechBase.CLAN,
        memory,
        undefined
      );

      // Should ideally find a valid default or standard
      expect(result.resolvedComponent).toBe('Standard');
      expect(result.wasRestored).toBe(false); // Now it should be false because we forced a memory miss
    });
  });
});
