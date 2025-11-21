/**
 * UnitStateManager - Unit state management and persistence
 * 
 * Extracted from UnitCriticalManager as part of large file refactoring.
 * Handles unit state management, persistence, observer pattern, and serialization.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration, CompleteUnitState, SerializedEquipment, StateValidationResult } from '../criticalSlots/UnitCriticalManager';
import { isUnitConfigurationData, getConfigurationProperty, IUnitConfigurationData } from '../../types/core/DynamicDataTypes';

export interface UnitData {
  configuration: UnitConfiguration;
  unallocatedEquipment: any[];
  criticalSlotAllocations: Record<string, any>;
  timestamp: number;
}

export interface UnitStateManager {
  // Core state methods
  getUnitState(): UnitData;
  updateUnitState(updates: Partial<UnitData>): void;
  resetUnitState(): void;
  
  // Persistence methods
  saveToStorage(key: string): Promise<void>;
  loadFromStorage(key: string): Promise<UnitData | null>;
  
  // History management
  pushState(state: UnitData): void;
  undo(): UnitData | null;
  redo(): UnitData | null;
  canUndo(): boolean;
  canRedo(): boolean;
  
  // Observer pattern
  subscribeToChanges(callback: (state: UnitData) => void): () => void;
  notifyStateChange(changes: Partial<UnitData>): void;
}

export interface UndoRedoState<T> {
  current: T;
  undoStack: T[];
  redoStack: T[];
  maxStackSize: number;
}

export class UnitStateManagerImpl implements UnitStateManager {
  private currentState: UnitData;
  private listeners: ((state: UnitData) => void)[] = [];
  private undoRedoState: UndoRedoState<UnitData>;
  
  constructor(initialState: UnitData, maxUndoStackSize: number = 50) {
    this.currentState = initialState;
    this.undoRedoState = {
      current: initialState,
      undoStack: [],
      redoStack: [],
      maxStackSize: maxUndoStackSize
    };
  }

  // ===== CORE STATE METHODS =====

  getUnitState(): UnitData {
    return { ...this.currentState };
  }

  updateUnitState(updates: Partial<UnitData>): void {
    // Create the new state
    const newTimestamp = Date.now();
    const newState: UnitData = {
      ...this.currentState,
      ...updates,
      timestamp: newTimestamp
    };
    
    // Compare states excluding timestamp for meaningful changes
    const currentStateWithoutTimestamp = { ...this.currentState };
    const currentWithoutTimestamp = currentStateWithoutTimestamp as Omit<UnitData, 'timestamp'> & { timestamp?: number };
    delete currentWithoutTimestamp.timestamp;
    
    const newStateWithoutTimestamp = { ...newState };
    const newWithoutTimestamp = newStateWithoutTimestamp as Omit<UnitData, 'timestamp'> & { timestamp?: number };
    delete newWithoutTimestamp.timestamp;
    
    const hasActualChanges = !this.deepEqual(currentStateWithoutTimestamp, newStateWithoutTimestamp);
    
    // Push current state to undo stack before updating (if meaningful content changed)
    if (hasActualChanges) {
      this.undoRedoState.undoStack.push({ ...this.currentState });
      
      // Limit stack size
      if (this.undoRedoState.undoStack.length > this.undoRedoState.maxStackSize) {
        this.undoRedoState.undoStack.shift();
      }
      
      // Clear redo stack when new state is added
      this.undoRedoState.redoStack = [];
    }
    
    // Update current state
    this.currentState = newState;
    this.undoRedoState.current = { ...newState };
    
    // Notify listeners
    this.notifyStateChange(updates);
  }

  resetUnitState(): void {
    // Create a clean state with default configuration
    const defaultState: UnitData = {
      configuration: this.getDefaultConfiguration(),
      unallocatedEquipment: [],
      criticalSlotAllocations: {},
      timestamp: Date.now()
    };
    
    this.updateUnitState(defaultState);
  }

  // ===== PERSISTENCE METHODS =====

  async saveToStorage(key: string): Promise<void> {
    try {
      const serializedState = this.serializeState(this.currentState);
      const stateString = JSON.stringify(serializedState);
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, stateString);
      } else {
        throw new Error('localStorage not available');
      }
    } catch (error) {
      console.error('[UnitStateManager] Failed to save state to storage:', error);
      throw error;
    }
  }

  async loadFromStorage(key: string): Promise<UnitData | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stateString = localStorage.getItem(key);
        if (!stateString) {
          return null;
        }
        
        const serializedState = JSON.parse(stateString);
        const validationResult = this.validateSerializedState(serializedState);
        
        if (!validationResult.isValid && !validationResult.canRecover) {
          console.error('[UnitStateManager] Cannot load invalid state:', validationResult.errors);
          return null;
        }
        
        if (validationResult.warnings.length > 0) {
          console.warn('[UnitStateManager] State load warnings:', validationResult.warnings);
        }
        
        return this.deserializeState(serializedState);
      } else {
        throw new Error('localStorage not available');
      }
    } catch (error) {
      console.error('[UnitStateManager] Failed to load state from storage:', error);
      return null;
    }
  }

  // ===== HISTORY MANAGEMENT =====

  pushState(state: UnitData): void {
    // Don't add to stack if the state hasn't actually changed
    if (this.deepEqual(this.undoRedoState.current, state)) {
      return;
    }
    
    // Add current state to undo stack
    this.undoRedoState.undoStack.push(this.undoRedoState.current);
    
    // Limit stack size
    if (this.undoRedoState.undoStack.length > this.undoRedoState.maxStackSize) {
      this.undoRedoState.undoStack.shift();
    }
    
    // Clear redo stack when new state is added
    this.undoRedoState.redoStack = [];
    
    // Update current state
    this.undoRedoState.current = state;
  }

  undo(): UnitData | null {
    if (this.undoRedoState.undoStack.length === 0) {
      return null;
    }
    
    const previousState = this.undoRedoState.undoStack.pop()!;
    this.undoRedoState.redoStack.push(this.undoRedoState.current);
    this.undoRedoState.current = previousState;
    this.currentState = previousState;
    
    this.notifyStateChange({});
    return this.currentState;
  }

  redo(): UnitData | null {
    if (this.undoRedoState.redoStack.length === 0) {
      return null;
    }
    
    const nextState = this.undoRedoState.redoStack.pop()!;
    this.undoRedoState.undoStack.push(this.undoRedoState.current);
    this.undoRedoState.current = nextState;
    this.currentState = nextState;
    
    this.notifyStateChange({});
    return this.currentState;
  }

  canUndo(): boolean {
    return this.undoRedoState.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoRedoState.redoStack.length > 0;
  }

  // ===== OBSERVER PATTERN =====

  subscribeToChanges(callback: (state: UnitData) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyStateChange(changes: Partial<UnitData>): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('[UnitStateManager] Error in state change listener:', error);
      }
    });
  }

  // ===== SERIALIZATION HELPERS =====

  private serializeState(state: UnitData): CompleteUnitState {
    return {
      version: '1.0.0',
      configuration: state.configuration,
      criticalSlotAllocations: state.criticalSlotAllocations,
      unallocatedEquipment: state.unallocatedEquipment as SerializedEquipment[],
      timestamp: state.timestamp
    };
  }

  private deserializeState(serializedState: CompleteUnitState): UnitData {
    return {
      configuration: serializedState.configuration,
      criticalSlotAllocations: serializedState.criticalSlotAllocations,
      unallocatedEquipment: serializedState.unallocatedEquipment,
      timestamp: serializedState.timestamp
    };
  }

  private validateSerializedState(state: CompleteUnitState): StateValidationResult {
    const result: StateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canRecover: true
    };
    
    // Check version compatibility
    if (!state.version) {
      result.warnings.push('Missing state version, assuming v1.0.0');
    } else if (state.version !== '1.0.0') {
      result.warnings.push(`State version ${state.version} may not be fully compatible`);
    }
    
    // Validate configuration
    if (!state.configuration) {
      result.errors.push('Missing unit configuration');
      result.isValid = false;
      result.canRecover = false;
      return result;
    }
    
    // Validate required configuration fields
    const requiredFields = ['tonnage', 'engineType', 'gyroType', 'structureType', 'armorType'] as const;
    for (const field of requiredFields) {
      // Type-safe property access using proper types
      if (!isUnitConfigurationData(state.configuration)) {
        result.errors.push(`Invalid configuration structure`);
        result.isValid = false;
        continue;
      }
      const value = getConfigurationProperty(state.configuration, field);
      if (value === undefined || value === null) {
        result.errors.push(`Missing required configuration field: ${field}`);
        result.isValid = false;
      }
    }
    
    // Validate equipment data
    if (state.unallocatedEquipment) {
      state.unallocatedEquipment.forEach((equipment, index) => {
        if (!equipment.equipmentData || !equipment.equipmentGroupId) {
          result.errors.push(`Invalid unallocated equipment at index ${index}`);
          result.isValid = false;
        }
      });
    }
    
    return result;
  }

  private getDefaultConfiguration(): UnitConfiguration {
    return {
      // Default chassis/model for new units
      chassis: 'Custom',
      model: 'New Design',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
      structureType: { type: 'Standard', techBase: 'Inner Sphere' },
      armorType: { type: 'Standard', techBase: 'Inner Sphere' },
      // Default armor allocation (reasonable distribution)
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 30, rear: 10 },
        LT: { front: 24, rear: 8 },
        RT: { front: 24, rear: 8 },
        LA: { front: 20, rear: 0 },
        RA: { front: 20, rear: 0 },
        LL: { front: 30, rear: 0 },
        RL: { front: 30, rear: 0 }
      },
      armorTonnage: 0, // User input
      heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
      totalHeatSinks: 10,
      internalHeatSinks: 0,
      externalHeatSinks: 0,
      // Enhancement systems
      enhancements: [],
      // Jump jet defaults
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    };
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }
}

// Export factory function for dependency injection
export const createUnitStateManager = (
  initialState: UnitData, 
  maxUndoStackSize: number = 50
): UnitStateManager => {
  return new UnitStateManagerImpl(initialState, maxUndoStackSize);
};
