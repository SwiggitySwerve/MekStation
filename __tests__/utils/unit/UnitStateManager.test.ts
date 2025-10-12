/**
 * Tests for UnitStateManager
 * 
 * Validates unit state management, persistence, and observer functionality.
 */

import { UnitStateManager, UnitStateManagerImpl, createUnitStateManager, UnitData } from '../../../utils/unit/UnitStateManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';

describe('UnitStateManager', () => {
  let stateManager: UnitStateManager;
  let mockInitialState: UnitData;

  beforeEach(() => {
    mockInitialState = createMockUnitData();
    stateManager = createUnitStateManager(mockInitialState);
  });

  describe('Core State Methods', () => {
    it('should return current unit state', () => {
      const state = stateManager.getUnitState();
      
      expect(state).toEqual(mockInitialState);
      expect(state).not.toBe(mockInitialState); // Should be a copy
    });

    it('should update unit state with partial data', async () => {
      const originalTimestamp = mockInitialState.timestamp;
      
      // Add sufficient delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updates = {
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Updated Chassis'
        }
      };

      stateManager.updateUnitState(updates);
      const newState = stateManager.getUnitState();

      expect(newState.configuration.chassis).toBe('Updated Chassis');
      expect(newState.timestamp).toBeGreaterThanOrEqual(originalTimestamp);
    });

    it('should reset unit state to defaults', () => {
      // Modify state first
      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Modified'
        }
      });

      // Reset state
      stateManager.resetUnitState();
      const state = stateManager.getUnitState();

      expect(state.configuration.chassis).toBe('Custom');
      expect(state.unallocatedEquipment).toEqual([]);
      expect(state.criticalSlotAllocations).toEqual({});
    });
  });

  describe('Persistence Methods', () => {
    const testKey = 'test-unit-state';

    afterEach(() => {
      // Clean up localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(testKey);
      }
    });

    it('should save state to localStorage', async () => {
      await stateManager.saveToStorage(testKey);

      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(testKey);
        expect(saved).toBeTruthy();
        
        const parsed = JSON.parse(saved!);
        expect(parsed.version).toBe('1.0.0');
        expect(parsed.configuration).toEqual(mockInitialState.configuration);
      }
    });

    it('should load state from localStorage', async () => {
      // Save state first
      await stateManager.saveToStorage(testKey);

      // Create new manager and load
      const newManager = createUnitStateManager(createMockUnitData());
      const loadedState = await newManager.loadFromStorage(testKey);

      expect(loadedState).toBeTruthy();
      expect(loadedState!.configuration).toEqual(mockInitialState.configuration);
    });

    it('should return null for non-existent key', async () => {
      const loadedState = await stateManager.loadFromStorage('non-existent-key');
      expect(loadedState).toBeNull();
    });

    it('should handle invalid stored data gracefully', async () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(testKey, 'invalid-json');
      }

      const loadedState = await stateManager.loadFromStorage(testKey);
      expect(loadedState).toBeNull();
    });
  });

  describe('History Management', () => {
    it('should support undo operations', () => {
      const originalState = stateManager.getUnitState();
      
      // Make a change
      stateManager.updateUnitState({
        configuration: {
          ...originalState.configuration,
          chassis: 'Modified'
        }
      });

      expect(stateManager.canUndo()).toBe(true);

      // Undo the change
      const undoResult = stateManager.undo();
      expect(undoResult).toBeTruthy();
      expect(undoResult!.configuration.chassis).toBe(originalState.configuration.chassis);
    });

    it('should support redo operations', () => {
      const originalChassis = mockInitialState.configuration.chassis;
      
      // Make a change
      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Modified'
        }
      });

      // Undo the change
      stateManager.undo();
      expect(stateManager.canRedo()).toBe(true);

      // Redo the change
      const redoResult = stateManager.redo();
      expect(redoResult).toBeTruthy();
      expect(redoResult!.configuration.chassis).toBe('Modified');
    });

    it('should limit undo stack size', () => {
      const smallStackManager = new UnitStateManagerImpl(mockInitialState, 2);

      // Make 3 changes (should only keep last 2 in stack)
      smallStackManager.updateUnitState({ configuration: { ...mockInitialState.configuration, chassis: 'Change1' } });
      smallStackManager.updateUnitState({ configuration: { ...mockInitialState.configuration, chassis: 'Change2' } });
      smallStackManager.updateUnitState({ configuration: { ...mockInitialState.configuration, chassis: 'Change3' } });

      // Should only be able to undo 2 times
      expect(smallStackManager.undo()).toBeTruthy(); // Back to Change2
      expect(smallStackManager.undo()).toBeTruthy(); // Back to Change1
      expect(smallStackManager.undo()).toBeNull();   // Can't undo further
    });

    it('should clear redo stack when new changes are made', () => {
      // Make change, undo, then make new change
      stateManager.updateUnitState({ configuration: { ...mockInitialState.configuration, chassis: 'First' } });
      stateManager.undo();
      
      expect(stateManager.canRedo()).toBe(true);
      
      stateManager.updateUnitState({ configuration: { ...mockInitialState.configuration, chassis: 'Second' } });
      
      expect(stateManager.canRedo()).toBe(false);
    });

    it('should not create undo entry for identical states', () => {
      const originalState = stateManager.getUnitState();
      
      // "Update" with same data
      stateManager.updateUnitState(originalState);
      
      expect(stateManager.canUndo()).toBe(false);
    });
  });

  describe('Observer Pattern', () => {
    it('should notify listeners on state changes', () => {
      const listener = jest.fn();
      stateManager.subscribeToChanges(listener);

      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Updated'
        }
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        configuration: expect.objectContaining({
          chassis: 'Updated'
        })
      }));
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      stateManager.subscribeToChanges(listener1);
      stateManager.subscribeToChanges(listener2);

      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Updated'
        }
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should allow unsubscribing from changes', () => {
      const listener = jest.fn();
      const unsubscribe = stateManager.subscribeToChanges(listener);

      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'First Update'
        }
      });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      stateManager.updateUnitState({
        configuration: {
          ...mockInitialState.configuration,
          chassis: 'Second Update'
        }
      });

      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      stateManager.subscribeToChanges(errorListener);
      stateManager.subscribeToChanges(normalListener);

      // Should not throw despite error listener
      expect(() => {
        stateManager.updateUnitState({
          configuration: {
            ...mockInitialState.configuration,
            chassis: 'Updated'
          }
        });
      }).not.toThrow();

      expect(normalListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Validation', () => {
    it('should validate complete state structure', () => {
      const validState = {
        version: '1.0.0',
        configuration: mockInitialState.configuration,
        criticalSlotAllocations: {},
        unallocatedEquipment: [],
        timestamp: Date.now()
      };

      // Access private method through type assertion for testing
      const manager = stateManager as any;
      const result = manager.validateSerializedState(validState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidState = {
        version: '1.0.0',
        configuration: {
          ...mockInitialState.configuration,
          tonnage: undefined // Missing required field
        },
        criticalSlotAllocations: {},
        unallocatedEquipment: [],
        timestamp: Date.now()
      };

      const manager = stateManager as any;
      const result = manager.validateSerializedState(invalidState);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle version warnings', () => {
      const futureVersionState = {
        version: '2.0.0',
        configuration: mockInitialState.configuration,
        criticalSlotAllocations: {},
        unallocatedEquipment: [],
        timestamp: Date.now()
      };

      const manager = stateManager as any;
      const result = manager.validateSerializedState(futureVersionState);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Factory Function', () => {
    it('should create UnitStateManager with default stack size', () => {
      const manager = createUnitStateManager(mockInitialState);
      expect(manager).toBeInstanceOf(UnitStateManagerImpl);
    });

    it('should create UnitStateManager with custom stack size', () => {
      const manager = createUnitStateManager(mockInitialState, 10);
      expect(manager).toBeInstanceOf(UnitStateManagerImpl);
    });
  });

  describe('BattleTech Rule Compliance', () => {
    it('should maintain valid default configuration', () => {
      stateManager.resetUnitState();
      const state = stateManager.getUnitState();

      // Check required fields are present and valid
      expect(state.configuration.tonnage).toBeGreaterThan(0);
      expect(state.configuration.engineType).toBeTruthy();
      expect(state.configuration.gyroType).toBeTruthy();
      expect(state.configuration.structureType).toBeTruthy();
      expect(state.configuration.armorType).toBeTruthy();
      expect(state.configuration.heatSinkType).toBeTruthy();
    });

    it('should preserve configuration integrity during updates', () => {
      const updates = {
        configuration: {
          ...mockInitialState.configuration,
          tonnage: 75,
          walkMP: 4
        }
      };

      stateManager.updateUnitState(updates);
      const state = stateManager.getUnitState();

      expect(state.configuration.tonnage).toBe(75);
      expect(state.configuration.walkMP).toBe(4);
    });
  });

  describe('Performance', () => {
    it('should handle state operations efficiently', () => {
      const startTime = performance.now();

      // Perform multiple operations
      for (let i = 0; i < 100; i++) {
        stateManager.updateUnitState({
          configuration: {
            ...mockInitialState.configuration,
            chassis: `Test ${i}`
          }
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 100 operations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});

// Helper function to create mock unit data
function createMockUnitData(): UnitData {
  const mockConfiguration: UnitConfiguration = {
    chassis: 'Test Chassis',
    model: 'Test Model',
    tonnage: 50,
    unitType: 'BattleMech',
    techBase: 'Inner Sphere',
    walkMP: 4,
    engineRating: 200,
    runMP: 6,
    engineType: 'Standard',
    gyroType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    armorAllocation: {
      HD: { front: 9, rear: 0 },
      CT: { front: 20, rear: 6 },
      LT: { front: 15, rear: 4 },
      RT: { front: 15, rear: 4 },
      LA: { front: 12, rear: 0 },
      RA: { front: 12, rear: 0 },
      LL: { front: 15, rear: 0 },
      RL: { front: 15, rear: 0 }
    },
    armorTonnage: 6.5,
    heatSinkType: 'Single',
    totalHeatSinks: 10,
    internalHeatSinks: 8,
    externalHeatSinks: 2,
    enhancements: [],
    jumpMP: 0,
    jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
    jumpJetCounts: {},
    hasPartialWing: false,
    mass: 50
  };

  return {
    configuration: mockConfiguration,
    unallocatedEquipment: [],
    criticalSlotAllocations: {},
    timestamp: Date.now()
  };
}
