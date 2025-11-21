/**
 * Component Database Helper Functions
 * Provides API layer for querying the Rich Component Database
 */

import { 
  COMPONENT_DATABASE,
  validateComponentDatabase 
} from './componentDatabase';
import {
  ComponentSpec,
  ComponentCategory,
  TechBase,
  TechLevel,
  RulesLevel,
  DropdownOption,
  DropdownGenerationOptions,
  ValidationResult,
  ComponentQuery,
  ComponentFilter,
  ComponentSorter,
  ComponentNotFoundError,
  InvalidTechProgressionError,
  ComponentResolutionWithMemory,
  TechBaseMemory,
  COMPONENT_CATEGORIES,
  TECH_BASES
} from '../types/componentDatabase';

// ===== CORE QUERY FUNCTIONS =====

/**
 * Get all components for a specific category and tech base
 */
export function getComponentsByCategory(
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): ComponentSpec[] {
  if (!COMPONENT_DATABASE[category]) {
    throw new InvalidTechProgressionError(category, techBase);
  }
  
  if (!COMPONENT_DATABASE[category][techBase]) {
    throw new InvalidTechProgressionError(category, techBase);
  }
  
  let components = COMPONENT_DATABASE[category][techBase];
  
  // Filter by rules level if specified
  if (rulesLevel) {
    components = components.filter(component => 
      isComponentAllowedForRulesLevel(component, rulesLevel)
    );
  }
  
  return [...components]; // Return copy to prevent mutations
}

/**
 * Find a specific component by name within a category and tech base
 */
export function findComponent(
  name: string,
  category: ComponentCategory,
  techBase: TechBase
): ComponentSpec | null {
  try {
    const components = getComponentsByCategory(category, techBase);
    return components.find(component => 
      component.name === name || component.id === name
    ) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the default component for a category and tech base
 * CRITICAL FIX: Always return the most conservative/safest option
 */
export function getDefaultComponent(
  category: ComponentCategory,
  techBase: TechBase
): ComponentSpec {
  const components = getComponentsByCategory(category, techBase);
  
  // CRITICAL FIX: For enhancement categories, prioritize "None" option
  if (category === 'myomer' || category === 'targeting') {
    const noneOption = components.find(comp => 
      comp.name === 'None' || comp.id === 'none'
    );
    if (noneOption) {
      return noneOption;
    }
  }
  
  // Find explicitly marked default
  const defaultComponent = components.find(component => component.isDefault);
  if (defaultComponent) {
    return defaultComponent;
  }
  
  // CRITICAL FIX: For categories without explicit defaults, prioritize conservative options
  if (category === 'myomer') {
    // For myomer, prioritize "None" over any active enhancement
    const conservativeOptions = ['None', 'Standard'];
    for (const optionName of conservativeOptions) {
      const option = components.find(comp => comp.name === optionName);
      if (option) {
        return option;
      }
    }
  }
  
  if (category === 'targeting') {
    // For targeting, prioritize "None" over any active targeting system
    const conservativeOptions = ['None'];
    for (const optionName of conservativeOptions) {
      const option = components.find(comp => comp.name === optionName);
      if (option) {
        return option;
      }
    }
  }
  
  // For other categories, prioritize "Standard" over advanced options
  const standardOption = components.find(comp => 
    comp.name === 'Standard' || comp.techLevel === 'Introductory'
  );
  if (standardOption) {
    return standardOption;
  }
  
  // Final fallback to first component
  if (components.length > 0) {
    return components[0];
  }
  
  throw new ComponentNotFoundError('default', category, techBase);
}

/**
 * Check if a component is available for a specific tech base and rules level
 */
export function isComponentAvailable(
  componentName: string,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): boolean {
  const component = findComponent(componentName, category, techBase);
  if (!component) {
    return false;
  }
  
  if (rulesLevel && !isComponentAllowedForRulesLevel(component, rulesLevel)) {
    return false;
  }
  
  return true;
}

/**
 * Validate and resolve a component selection
 * CRITICAL FIX: Always resolve to the safest/most conservative default when invalid
 */
export function validateAndResolveComponent(
  componentName: string | undefined,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): string {
  // Handle undefined/null input
  if (!componentName) {
    return getDefaultComponent(category, techBase).name;
  }
  
  // Check if current selection is valid
  if (isComponentAvailable(componentName, category, techBase, rulesLevel)) {
    return componentName;
  }
  
  // CRITICAL FIX: Invalid selection - ALWAYS resolve to the conservative default
  // For enhancement systems like myomer, this should be "None", not any active enhancement
  return getDefaultComponent(category, techBase).name;
}

/**
 * Enhanced component resolution with tech base memory support
 * Handles tech base switching with memory restoration
 */
export function validateAndResolveComponentWithMemory(
  currentComponent: string | undefined,
  category: ComponentCategory,
  oldTechBase: TechBase,
  newTechBase: TechBase,
  memory: TechBaseMemory,
  rulesLevel?: RulesLevel
): ComponentResolutionWithMemory {
  // Import memory functions (to avoid circular dependencies, we'll delegate to techBaseMemory.ts)
  const { validateAndResolveComponentWithMemory: memoryResolve } = require('./techBaseMemory');
  
  return memoryResolve(
    currentComponent,
    category,
    oldTechBase,
    newTechBase,
    memory,
    rulesLevel
  );
}

/**
 * Comprehensive component validation with detailed results
 */
export function validateComponentSelection(
  componentName: string | undefined,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let resolvedComponent: ComponentSpec | undefined;
  let autoResolved = false;
  let resolutionReason: string | undefined;
  
  // Handle undefined/null input
  if (!componentName) {
    resolvedComponent = getDefaultComponent(category, techBase);
    autoResolved = true;
    resolutionReason = 'No component specified, using default';
    warnings.push(resolutionReason);
    
    return {
      isValid: false,
      resolvedComponent,
      errors,
      warnings,
      autoResolved,
      resolutionReason
    };
  }
  
  // Find the component
  const component = findComponent(componentName, category, techBase);
  
  if (!component) {
    // Component doesn't exist for this tech base
    resolvedComponent = getDefaultComponent(category, techBase);
    autoResolved = true;
    resolutionReason = `${componentName} not available for ${techBase}, using default`;
    errors.push(`Component "${componentName}" not found for ${techBase} ${category}`);
    warnings.push(resolutionReason);
    
    return {
      isValid: false,
      resolvedComponent,
      errors,
      warnings,
      autoResolved,
      resolutionReason
    };
  }
  
  // Check rules level restrictions
  if (rulesLevel && !isComponentAllowedForRulesLevel(component, rulesLevel)) {
    // Find alternative component that meets rules level
    const alternatives = getComponentsByCategory(category, techBase, rulesLevel);
    resolvedComponent = alternatives.length > 0 ? alternatives[0] : getDefaultComponent(category, techBase);
    autoResolved = true;
    resolutionReason = `${componentName} not allowed for ${rulesLevel} rules, using ${resolvedComponent.name}`;
    errors.push(`Component "${componentName}" not allowed for rules level ${rulesLevel}`);
    warnings.push(resolutionReason);
    
    return {
      isValid: false,
      resolvedComponent,
      errors,
      warnings,
      autoResolved,
      resolutionReason
    };
  }
  
  // Component is valid
  return {
    isValid: true,
    resolvedComponent: component,
    errors,
    warnings,
    autoResolved: false
  };
}

// ===== DROPDOWN GENERATION FUNCTIONS =====

/**
 * Generate dropdown options for a component category
 */
export function getDropdownOptions(
  category: ComponentCategory,
  techBase: TechBase,
  options: Partial<DropdownGenerationOptions> = {}
): DropdownOption[] {
  const {
    rulesLevel,
    currentYear,
    currentSelection,
    showMetadata = true,
    showTechLevels = false,
    groupByTechLevel = false
  } = options;
  
  let components = getComponentsByCategory(category, techBase, rulesLevel);
  
  // Filter by introduction year if specified
  if (currentYear) {
    components = components.filter(component => 
      component.introductionYear <= currentYear
    );
  }
  
  // Sort components
  components = sortComponents(components, getDefaultComponentSorter());
  
  // Convert to dropdown options
  const dropdownOptions: DropdownOption[] = components.map(component => ({
    id: component.id,
    name: component.name,
    description: showMetadata ? formatComponentDescription(component, category) : undefined,
    weight: showMetadata ? formatComponentWeight(component, category) : undefined,
    criticalSlots: showMetadata && component.criticalSlots > 0 ? `${component.criticalSlots} slots` : undefined,
    isDisabled: false, // Could be used for advanced filtering
    isDefault: component.isDefault || false,
    techLevel: showTechLevels ? component.techLevel : undefined,
    introYear: showTechLevels ? component.introductionYear : undefined
  }));
  
  // Group by tech level if requested
  if (groupByTechLevel) {
    return groupOptionsByTechLevel(dropdownOptions);
  }
  
  return dropdownOptions;
}

/**
 * Format component description for display
 */
function formatComponentDescription(component: ComponentSpec, category: ComponentCategory): string {
  const parts: string[] = [];
  
  // Add weight information
  if (component.weightMultiplier) {
    parts.push(`${(component.weightMultiplier * 100).toFixed(0)}% tonnage`);
  } else if (component.weightMod) {
    parts.push(`${(component.weightMod * 100).toFixed(0)}% weight`);
  } else if (component.weight) {
    parts.push(`${component.weight} tons`);
  }
  
  // Add critical slots
  if (component.criticalSlots > 0) {
    parts.push(`${component.criticalSlots} slots`);
  }
  
  // Add heat dissipation for heat sinks
  if (component.dissipation) {
    parts.push(`${component.dissipation} heat`);
  }
  
  // Add heat generation
  if (component.heatGeneration) {
    parts.push(`+${component.heatGeneration} heat`);
  }
  
  return parts.join(', ');
}

/**
 * Format component weight for display
 */
function formatComponentWeight(component: ComponentSpec, category: ComponentCategory): string {
  if (component.weightMultiplier) {
    return `${(component.weightMultiplier * 100).toFixed(0)}% tonnage`;
  } else if (component.weightMod && component.weightMod !== 1.0) {
    return `${(component.weightMod * 100).toFixed(0)}% weight`;
  } else if (component.weight) {
    return `${component.weight}t`;
  }
  return '';
}

/**
 * Group dropdown options by tech level
 */
function groupOptionsByTechLevel(options: DropdownOption[]): DropdownOption[] {
  const grouped: Record<TechLevel, DropdownOption[]> = {
    'Introductory': [],
    'Standard': [],
    'Advanced': [],
    'Experimental': []
  };
  
  // Group options
  options.forEach(option => {
    const techLevel = option.techLevel as TechLevel || 'Standard';
    grouped[techLevel].push(option);
  });
  
  // Flatten with separators (could be enhanced with optgroup support)
  const result: DropdownOption[] = [];
  
  Object.entries(grouped).forEach(([techLevel, techOptions]) => {
    if (techOptions.length > 0) {
      // Add tech level separator (disabled option)
      if (result.length > 0) {
        result.push({
          id: `separator_${techLevel}`,
          name: `--- ${techLevel} Technology ---`,
          isDisabled: true,
          isDefault: false
        });
      }
      result.push(...techOptions);
    }
  });
  
  return result;
}

// ===== COMPONENT FILTERING AND SORTING =====

/**
 * Advanced component query with multiple filters
 */
export function queryComponents(query: ComponentQuery): ComponentSpec[] {
  let components = getComponentsByCategory(query.category, query.techBase || 'Inner Sphere');
  
  // Apply filters
  if (query.rulesLevel) {
    components = components.filter(comp => isComponentAllowedForRulesLevel(comp, query.rulesLevel!));
  }
  
  if (query.techLevel) {
    components = components.filter(comp => comp.techLevel === query.techLevel);
  }
  
  if (query.minYear) {
    components = components.filter(comp => comp.introductionYear >= query.minYear!);
  }
  
  if (query.maxYear) {
    components = components.filter(comp => comp.introductionYear <= query.maxYear!);
  }
  
  if (query.excludeExperimental) {
    components = components.filter(comp => comp.techLevel !== 'Experimental');
  }
  
  return components;
}

/**
 * Filter components with custom filter function
 */
export function filterComponents(
  category: ComponentCategory,
  techBase: TechBase,
  filter: ComponentFilter
): ComponentSpec[] {
  const components = getComponentsByCategory(category, techBase);
  return components.filter(filter);
}

/**
 * Sort components with custom sorter function
 */
export function sortComponents(
  components: ComponentSpec[],
  sorter: ComponentSorter
): ComponentSpec[] {
  return [...components].sort(sorter);
}

/**
 * Get default component sorter (defaults first, then by tech level, then by name)
 */
function getDefaultComponentSorter(): ComponentSorter {
  return (a: ComponentSpec, b: ComponentSpec) => {
    // Defaults first
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    
    // Then by tech level (Introductory -> Standard -> Advanced -> Experimental)
    const techLevelOrder = { 'Introductory': 0, 'Standard': 1, 'Advanced': 2, 'Experimental': 3 };
    const aOrder = techLevelOrder[a.techLevel] || 99;
    const bOrder = techLevelOrder[b.techLevel] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Finally by name
    return a.name.localeCompare(b.name);
  };
}

// ===== RULES LEVEL VALIDATION =====

/**
 * Check if component is allowed for specified rules level
 */
export function isComponentAllowedForRulesLevel(
  component: ComponentSpec,
  rulesLevel: RulesLevel
): boolean {
  const rulesLevelOrder = { 'Introductory': 0, 'Standard': 1, 'Advanced': 2, 'Experimental': 3 };
  const componentLevel = rulesLevelOrder[component.rulesLevel] || 99;
  const allowedLevel = rulesLevelOrder[rulesLevel] || 0;
  
  return componentLevel <= allowedLevel;
}

/**
 * Get components allowed for specific rules level
 */
export function getComponentsForRulesLevel(
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel: RulesLevel
): ComponentSpec[] {
  return getComponentsByCategory(category, techBase, rulesLevel);
}

/**
 * Find best alternative component for rules level
 */
export function findAlternativeComponentForRulesLevel(
  originalComponent: ComponentSpec,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel: RulesLevel
): ComponentSpec | null {
  const allowedComponents = getComponentsForRulesLevel(category, techBase, rulesLevel);
  
  if (allowedComponents.length === 0) {
    return null;
  }
  
  // Try to find similar component (same tech level or lower)
  const rulesLevelOrder = { 'Introductory': 0, 'Standard': 1, 'Advanced': 2, 'Experimental': 3 };
  const originalLevel = rulesLevelOrder[originalComponent.techLevel] || 99;
  
  // Find components at same or lower tech level
  const suitableComponents = allowedComponents.filter(comp => {
    const compLevel = rulesLevelOrder[comp.techLevel] || 99;
    return compLevel <= originalLevel;
  });
  
  if (suitableComponents.length > 0) {
    // Return highest tech level among suitable components
    return suitableComponents.reduce((best, current) => {
      const bestLevel = rulesLevelOrder[best.techLevel] || 0;
      const currentLevel = rulesLevelOrder[current.techLevel] || 0;
      return currentLevel > bestLevel ? current : best;
    });
  }
  
  // Fallback to default
  return allowedComponents.find(comp => comp.isDefault) || allowedComponents[0];
}

// ===== COMPATIBILITY CHECKING =====

/**
 * Check if components are compatible with each other
 */
export function checkComponentCompatibility(
  components: Array<{ component: ComponentSpec; category: ComponentCategory }>
): {
  isCompatible: boolean;
  conflicts: string[];
  warnings: string[];
} {
  const conflicts: string[] = [];
  const warnings: string[] = [];
  
  // Check for conflicting special rules
  const allSpecialRules = components.flatMap(({ component }) => component.specialRules || []);
  
  // Example compatibility checks (can be extended)
  // Check for tech base conflicts
  const techBases = new Set(components.map(({ component }) => 
    component.name.includes('Clan') ? 'Clan' : 'Inner Sphere'
  ));
  
  if (techBases.size > 1) {
    warnings.push('Mixed tech base components detected');
  }
  
  // Check for rules level consistency
  const rulesLevels = components.map(({ component }) => component.rulesLevel);
  const maxRulesLevel = rulesLevels.reduce((max, current) => {
    const levels = { 'Introductory': 0, 'Standard': 1, 'Advanced': 2, 'Experimental': 3 };
    const currentLevel = levels[current] || 0;
    const maxLevel = levels[max] || 0;
    return currentLevel > maxLevel ? current : max;
  }, 'Introductory');
  
  if (maxRulesLevel === 'Experimental') {
    warnings.push('Configuration uses experimental technology');
  }
  
  return {
    isCompatible: conflicts.length === 0,
    conflicts,
    warnings
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Get all available component names for a category and tech base
 */
export function getComponentNames(
  category: ComponentCategory,
  techBase: TechBase
): string[] {
  const components = getComponentsByCategory(category, techBase);
  return components.map(component => component.name);
}

/**
 * Get component by ID
 */
export function getComponentById(
  id: string,
  category: ComponentCategory,
  techBase: TechBase
): ComponentSpec | null {
  const components = getComponentsByCategory(category, techBase);
  return components.find(component => component.id === id) || null;
}

/**
 * Search components by partial name match
 */
export function searchComponents(
  searchTerm: string,
  category?: ComponentCategory,
  techBase?: TechBase
): ComponentSpec[] {
  const results: ComponentSpec[] = [];
  const searchLower = searchTerm.toLowerCase();
  
  const categoriesToSearch = category ? [category] : COMPONENT_CATEGORIES;
  const techBasesToSearch = techBase ? [techBase] : TECH_BASES;
  
  for (const cat of categoriesToSearch) {
    for (const tech of techBasesToSearch) {
      try {
        const components = getComponentsByCategory(cat, tech);
        const matches = components.filter(component =>
          component.name.toLowerCase().includes(searchLower) ||
          component.description?.toLowerCase().includes(searchLower) ||
          component.id.toLowerCase().includes(searchLower)
        );
        results.push(...matches);
      } catch (error) {
        // Skip invalid category/tech base combinations
        continue;
      }
    }
  }
  
  return results;
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  totalComponents: number;
  componentsByCategory: Record<ComponentCategory, number>;
  componentsByTechBase: Record<TechBase, number>;
  componentsByTechLevel: Record<TechLevel, number>;
} {
  const stats = {
    totalComponents: 0,
    componentsByCategory: {} as Record<ComponentCategory, number>,
    componentsByTechBase: {} as Record<TechBase, number>,
    componentsByTechLevel: {} as Record<TechLevel, number>
  };
  
  // Initialize counters
  COMPONENT_CATEGORIES.forEach(category => {
    stats.componentsByCategory[category] = 0;
  });
  
  TECH_BASES.forEach(techBase => {
    stats.componentsByTechBase[techBase] = 0;
  });
  
  const techLevels: TechLevel[] = ['Introductory', 'Standard', 'Advanced', 'Experimental'];
  techLevels.forEach(techLevel => {
    stats.componentsByTechLevel[techLevel] = 0;
  });
  
  // Count components
  for (const category of COMPONENT_CATEGORIES) {
    for (const techBase of TECH_BASES) {
      try {
        const components = getComponentsByCategory(category, techBase);
        stats.componentsByCategory[category] += components.length;
        stats.componentsByTechBase[techBase] += components.length;
        stats.totalComponents += components.length;
        
        components.forEach(component => {
          stats.componentsByTechLevel[component.techLevel]++;
        });
      } catch (error) {
        // Skip invalid combinations
        continue;
      }
    }
  }
  
  return stats;
}

/**
 * Validate entire database and return comprehensive report
 */
export function validateDatabase(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: any;
  categoryReport: Array<{
    category: ComponentCategory;
    techBases: Array<{
      techBase: TechBase;
      componentCount: number;
      hasDefault: boolean;
      issues: string[];
    }>;
  }>;
} {
  const validation = validateComponentDatabase();
  const stats = getDatabaseStats();
  
  const categoryReport = COMPONENT_CATEGORIES.map(category => ({
    category,
    techBases: TECH_BASES.map(techBase => {
      try {
        const components = getComponentsByCategory(category, techBase);
        const hasDefault = components.some(comp => comp.isDefault);
        const issues: string[] = [];
        
        if (!hasDefault) {
          issues.push('No default component specified');
        }
        
        if (components.length === 0) {
          issues.push('No components available');
        }
        
        return {
          techBase,
          componentCount: components.length,
          hasDefault,
          issues
        };
      } catch (error) {
        return {
          techBase,
          componentCount: 0,
          hasDefault: false,
          issues: ['Failed to load components']
        };
      }
    })
  }));
  
  return {
    ...validation,
    stats,
    categoryReport
  };
}
