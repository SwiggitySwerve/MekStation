/**
 * Memory Persistence Layer
 * Handles saving and loading tech base memory to/from localStorage
 */

import {
  ComponentMemoryState,
  TechBaseMemory
} from '../types/componentDatabase';

import {
  MEMORY_VERSION,
  MEMORY_STORAGE_KEY,
  createDefaultMemory,
  validateAndCleanMemory
} from './techBaseMemory';

// ===== STORAGE OPERATIONS =====

/**
 * Save memory state to localStorage with error handling
 */
export function saveMemoryToStorage(memoryState: ComponentMemoryState): boolean {
  try {
    const serialized = JSON.stringify(memoryState);
    localStorage.setItem(MEMORY_STORAGE_KEY, serialized);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Tech base memory saved to localStorage', memoryState);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save tech base memory to localStorage:', error);
    
    // Handle quota exceeded errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data');
      clearMemoryStorage();
      return false;
    }
    
    return false;
  }
}

/**
 * Load memory state from localStorage with validation and migration
 */
export function loadMemoryFromStorage(): ComponentMemoryState | null {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    
    if (!stored) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No tech base memory found in localStorage');
      }
      return null;
    }
    
    const parsed = JSON.parse(stored) as ComponentMemoryState;
    
    // Validate structure
    if (!isValidMemoryState(parsed)) {
      console.warn('Invalid memory state in localStorage, clearing');
      clearMemoryStorage();
      return null;
    }
    
    // Check version compatibility
    if (parsed.version !== MEMORY_VERSION) {
      console.log(`Memory version mismatch: ${parsed.version} !== ${MEMORY_VERSION}, migrating`);
      return migrateMemoryState(parsed);
    }
    
    // Clean invalid entries
    const cleanedMemory = validateAndCleanMemory(parsed.techBaseMemory);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Tech base memory loaded from localStorage', parsed);
    }
    
    return {
      ...parsed,
      techBaseMemory: cleanedMemory
    };
    
  } catch (error) {
    console.error('Failed to load tech base memory from localStorage:', error);
    clearMemoryStorage();
    return null;
  }
}

/**
 * Clear memory storage (for reset/testing)
 */
export function clearMemoryStorage(): void {
  try {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    console.log('Tech base memory cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear tech base memory from localStorage:', error);
  }
}

/**
 * Get memory storage size for monitoring
 */
export function getMemoryStorageSize(): number {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    return stored ? stored.length : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

// ===== VALIDATION FUNCTIONS =====

/**
 * Validate memory state structure
 */
function isValidMemoryState(state: any): state is ComponentMemoryState {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  // Check required fields
  if (!state.techBaseMemory || !state.lastUpdated || !state.version) {
    return false;
  }
  
  // Check techBaseMemory structure
  const memory = state.techBaseMemory;
  if (!memory || typeof memory !== 'object') {
    return false;
  }
  
  // Check that all required categories exist
  const requiredCategories = [
    'chassis', 'engine', 'gyro', 'heatsink', 
    'armor', 'myomer', 'targeting', 'movement'
  ];
  
  for (const category of requiredCategories) {
    if (!memory[category] || typeof memory[category] !== 'object') {
      return false;
    }
    
    // Check that both tech bases exist
    if (typeof memory[category]['Inner Sphere'] !== 'string' || 
        typeof memory[category]['Clan'] !== 'string') {
      return false;
    }
  }
  
  return true;
}

// ===== MIGRATION FUNCTIONS =====

/**
 * Migrate memory state from older versions
 */
function migrateMemoryState(oldState: any): ComponentMemoryState {
  console.log('Migrating memory state from version', oldState.version, 'to', MEMORY_VERSION);
  
  // For now, we only have version 1.0.0
  // Future migrations would handle older versions here
  
  switch (oldState.version) {
    case undefined:
    case '1.0.0':
      // Current version or missing version - recreate with defaults
      return createFreshMemoryState();
      
    default:
      console.warn('Unknown memory version:', oldState.version, 'creating fresh state');
      return createFreshMemoryState();
  }
}

/**
 * Create fresh memory state with current version
 */
function createFreshMemoryState(): ComponentMemoryState {
  return {
    techBaseMemory: createDefaultMemory(),
    lastUpdated: Date.now(),
    version: MEMORY_VERSION
  };
}

// ===== AUTO-SAVE UTILITIES =====

/**
 * Auto-save wrapper with debouncing
 */
export class MemoryAutoSaver {
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly debounceMs: number;
  
  constructor(debounceMs: number = 1000) {
    this.debounceMs = debounceMs;
  }
  
  /**
   * Schedule auto-save with debouncing
   */
  scheduleSave(memoryState: ComponentMemoryState): void {
    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // Schedule new save
    this.saveTimer = setTimeout(() => {
      saveMemoryToStorage(memoryState);
      this.saveTimer = null;
    }, this.debounceMs);
  }
  
  /**
   * Force immediate save (cancels pending saves)
   */
  forceSave(memoryState: ComponentMemoryState): boolean {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    return saveMemoryToStorage(memoryState);
  }
  
  /**
   * Cancel any pending saves
   */
  cancel(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }
}

// ===== MEMORY INITIALIZATION =====

/**
 * Initialize memory system - loads from storage or creates fresh state
 */
export function initializeMemorySystem(): ComponentMemoryState {
  if (!isStorageAvailable()) {
    console.warn('localStorage not available, using session-only memory');
    return createFreshMemoryState();
  }
  
  const stored = loadMemoryFromStorage();
  if (stored) {
    return stored;
  }
  
  // No stored memory - create fresh state
  const freshState = createFreshMemoryState();
  saveMemoryToStorage(freshState);
  
  return freshState;
}

/**
 * Update memory state and optionally persist
 */
export function updateMemoryState(
  currentState: ComponentMemoryState,
  newMemory: TechBaseMemory,
  persist: boolean = true
): ComponentMemoryState {
  const updatedState: ComponentMemoryState = {
    techBaseMemory: newMemory,
    lastUpdated: Date.now(),
    version: MEMORY_VERSION
  };
  
  if (persist && isStorageAvailable()) {
    saveMemoryToStorage(updatedState);
  }
  
  return updatedState;
}

// ===== DEVELOPMENT UTILITIES =====

/**
 * Debug utilities for development
 */
export const MemoryDebug = {
  /**
   * Log current memory state
   */
  logCurrentState(): void {
    const state = loadMemoryFromStorage();
    console.log('Current tech base memory state:', state);
  },
  
  /**
   * Reset memory to defaults
   */
  resetToDefaults(): void {
    const freshState = createFreshMemoryState();
    saveMemoryToStorage(freshState);
    console.log('Memory reset to defaults');
  },
  
  /**
   * Get storage info
   */
  getStorageInfo(): {
    isAvailable: boolean;
    size: number;
    hasData: boolean;
  } {
    return {
      isAvailable: isStorageAvailable(),
      size: getMemoryStorageSize(),
      hasData: !!localStorage.getItem(MEMORY_STORAGE_KEY)
    };
  },
  
  /**
   * Import memory state (for testing)
   */
  importState(state: ComponentMemoryState): boolean {
    return saveMemoryToStorage(state);
  },
  
  /**
   * Export memory state (for backup)
   */
  exportState(): ComponentMemoryState | null {
    return loadMemoryFromStorage();
  }
};

// Expose debug utilities in development (only in browser)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Type-safe window attachment for development debugging
  interface WindowWithDebug extends Window {
    MemoryDebug?: typeof MemoryDebug;
  }
  
  const debugWindow = window as WindowWithDebug;
  debugWindow.MemoryDebug = MemoryDebug;
}
