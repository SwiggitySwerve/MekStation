/**
 * Tech Base Memory Management System
 * Handles remembering component selections per tech base for seamless switching
 */

import {
  TechBaseMemory,
  ComponentMemoryState,
  ComponentResolutionWithMemory,
  MemoryUpdateResult,
  ComponentCategory,
  TechBase,
  RulesLevel,
  COMPONENT_CATEGORIES,
  TECH_BASES
} from '../types/componentDatabase';

import {
  getDefaultComponent,
  isComponentAvailable,
  getComponentsByCategory
} from './componentDatabaseHelpers';

// ===== CONSTANTS =====

export const MEMORY_VERSION = '1.0.0';
export const MEMORY_STORAGE_KEY = 'battletech_tech_base_memory';

// ===== CORE MEMORY FUNCTIONS =====

/**
 * Create default memory with database defaults for each tech base
 */
export function createDefaultMemory(): TechBaseMemory {
  const memory: Partial<TechBaseMemory> = {};
  
  // Initialize each category with defaults for both tech bases
  for (const category of COMPONENT_CATEGORIES) {
    memory[category] = {} as { [K in TechBase]: string };
    
    for (const techBase of TECH_BASES) {
      try {
        const defaultComponent = getDefaultComponent(category, techBase);
        memory[category]![techBase] = defaultComponent.name;
      } catch (error) {
        // Fallback for categories that might not have components for both tech bases
        console.warn(`No default component for ${category} + ${techBase}, using empty string`);
        memory[category]![techBase] = '';
      }
    }
  }
  
  return memory as TechBaseMemory;
}

/**
 * Update memory with a new component selection
 */
export function updateMemory(
  memory: TechBaseMemory,
  category: ComponentCategory,
  techBase: TechBase,
  componentName: string
): MemoryUpdateResult {
  const previousValue = memory[category][techBase];
  const changed = previousValue !== componentName;
  
  if (!changed) {
    return {
      updatedMemory: memory,
      changed: false
    };
  }
  
  // Create new memory object (immutable update)
  const updatedMemory: TechBaseMemory = {
    ...memory,
    [category]: {
      ...memory[category],
      [techBase]: componentName
    }
  };
  
  return {
    updatedMemory,
    changed: true,
    previousValue
  };
}

/**
 * Get remembered component for a specific category and tech base
 * Returns null if component is not available or memory is invalid
 */
export function getRememberedComponent(
  memory: TechBaseMemory,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): string | null {
  const remembered = memory[category]?.[techBase];
  
  if (!remembered) {
    return null;
  }
  
  // Validate that the remembered component is still available
  if (!isComponentAvailable(remembered, category, techBase, rulesLevel)) {
    return null;
  }
  
  return remembered;
}

/**
 * Resolve component with memory support - core function for tech base switching
 */
export function validateAndResolveComponentWithMemory(
  currentComponent: string | undefined,
  category: ComponentCategory,
  oldTechBase: TechBase,
  newTechBase: TechBase,
  memory: TechBaseMemory,
  rulesLevel?: RulesLevel
): ComponentResolutionWithMemory {
  let updatedMemory = memory;
  
  // Step 1: Save current selection to old tech base memory
  if (currentComponent && oldTechBase !== newTechBase) {
    const saveResult = updateMemory(memory, category, oldTechBase, currentComponent);
    updatedMemory = saveResult.updatedMemory;
  }
  
  // Step 2: Try to restore from new tech base memory
  const remembered = getRememberedComponent(updatedMemory, category, newTechBase, rulesLevel);
  
  if (remembered) {
    return {
      resolvedComponent: remembered,
      updatedMemory,
      wasRestored: true,
      resolutionReason: `Restored from memory: ${remembered} for ${newTechBase}`
    };
  }
  
  // Step 3: Fallback to default for new tech base
  try {
    const defaultComponent = getDefaultComponent(category, newTechBase);
    
    // Update memory with the default we're using
    const defaultResult = updateMemory(updatedMemory, category, newTechBase, defaultComponent.name);
    
    return {
      resolvedComponent: defaultComponent.name,
      updatedMemory: defaultResult.updatedMemory,
      wasRestored: false,
      resolutionReason: `No valid memory, using default: ${defaultComponent.name} for ${newTechBase}`
    };
  } catch (error) {
    return {
      resolvedComponent: '',
      updatedMemory,
      wasRestored: false,
      resolutionReason: `Error: Could not resolve component for ${category} + ${newTechBase}`
    };
  }
}

/**
 * Validate memory integrity and clean up invalid entries
 */
export function validateAndCleanMemory(
  memory: TechBaseMemory,
  rulesLevel?: RulesLevel
): TechBaseMemory {
  const cleanedMemory = { ...memory };
  let hasChanges = false;
  
  for (const category of COMPONENT_CATEGORIES) {
    for (const techBase of TECH_BASES) {
      const remembered = cleanedMemory[category]?.[techBase];
      
      if (remembered && !isComponentAvailable(remembered, category, techBase, rulesLevel)) {
        // Invalid component - replace with default
        try {
          const defaultComponent = getDefaultComponent(category, techBase);
          cleanedMemory[category][techBase] = defaultComponent.name;
          hasChanges = true;
          console.warn(`Cleaned invalid memory: ${remembered} → ${defaultComponent.name} for ${category}+${techBase}`);
        } catch (error) {
          cleanedMemory[category][techBase] = '';
          hasChanges = true;
          console.warn(`Cleaned invalid memory: ${remembered} → empty for ${category}+${techBase}`);
        }
      }
    }
  }
  
  return cleanedMemory;
}

/**
 * Initialize memory from current unit configuration
 */
export function initializeMemoryFromConfiguration(
  techProgression: { [K in ComponentCategory]: TechBase },
  currentComponents: { [K in ComponentCategory]: string }
): TechBaseMemory {
  const memory = createDefaultMemory();
  
  // Populate memory with current selections
  for (const category of COMPONENT_CATEGORIES) {
    const techBase = techProgression[category];
    const component = currentComponents[category];
    
    if (component && isComponentAvailable(component, category, techBase)) {
      const updateResult = updateMemory(memory, category, techBase, component);
      Object.assign(memory, updateResult.updatedMemory);
    }
  }
  
  return memory;
}

/**
 * Get memory statistics for debugging/monitoring
 */
export function getMemoryStats(memory: TechBaseMemory): {
  totalEntries: number;
  entriesPerCategory: { [K in ComponentCategory]: number };
  entriesPerTechBase: { [K in TechBase]: number };
  emptyEntries: number;
} {
  let totalEntries = 0;
  let emptyEntries = 0;
  
  const entriesPerCategory = {} as { [K in ComponentCategory]: number };
  const entriesPerTechBase = {} as { [K in TechBase]: number };
  
  // Initialize counters
  COMPONENT_CATEGORIES.forEach(category => {
    entriesPerCategory[category] = 0;
  });
  
  TECH_BASES.forEach(techBase => {
    entriesPerTechBase[techBase] = 0;
  });
  
  // Count entries
  for (const category of COMPONENT_CATEGORIES) {
    for (const techBase of TECH_BASES) {
      const entry = memory[category]?.[techBase];
      if (entry) {
        totalEntries++;
        entriesPerCategory[category]++;
        entriesPerTechBase[techBase]++;
        
        if (entry === '') {
          emptyEntries++;
        }
      }
    }
  }
  
  return {
    totalEntries,
    entriesPerCategory,
    entriesPerTechBase,
    emptyEntries
  };
}

/**
 * Compare two memory states for differences
 */
export function compareMemory(
  oldMemory: TechBaseMemory,
  newMemory: TechBaseMemory
): {
  hasChanges: boolean;
  changes: Array<{
    category: ComponentCategory;
    techBase: TechBase;
    oldValue: string;
    newValue: string;
  }>;
} {
  const changes: Array<{
    category: ComponentCategory;
    techBase: TechBase;
    oldValue: string;
    newValue: string;
  }> = [];
  
  for (const category of COMPONENT_CATEGORIES) {
    for (const techBase of TECH_BASES) {
      const oldValue = oldMemory[category]?.[techBase] || '';
      const newValue = newMemory[category]?.[techBase] || '';
      
      if (oldValue !== newValue) {
        changes.push({
          category,
          techBase,
          oldValue,
          newValue
        });
      }
    }
  }
  
  return {
    hasChanges: changes.length > 0,
    changes
  };
}

/**
 * Create a deep copy of memory for safe mutations
 */
export function cloneMemory(memory: TechBaseMemory): TechBaseMemory {
  const cloned: Partial<TechBaseMemory> = {};
  
  for (const category of COMPONENT_CATEGORIES) {
    cloned[category] = { ...memory[category] };
  }
  
  return cloned as TechBaseMemory;
}

/**
 * Reset memory to defaults for a specific category
 */
export function resetCategoryMemory(
  memory: TechBaseMemory,
  category: ComponentCategory
): TechBaseMemory {
  const updatedMemory = cloneMemory(memory);
  
  for (const techBase of TECH_BASES) {
    try {
      const defaultComponent = getDefaultComponent(category, techBase);
      updatedMemory[category][techBase] = defaultComponent.name;
    } catch (error) {
      updatedMemory[category][techBase] = '';
    }
  }
  
  return updatedMemory;
}

/**
 * Reset all memory to defaults
 */
export function resetAllMemory(): TechBaseMemory {
  return createDefaultMemory();
}
