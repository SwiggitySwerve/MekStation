/**
 * Component Resolution System - Smart tech base component transitions
 * Handles intelligent component switching when tech base changes
 */

import { 
  COMPONENT_AVAILABILITY, 
  ComponentCategory, 
  TechBase,
  getAvailableComponents,
  getDefaultComponent,
  isComponentAvailable
} from './componentAvailability';

/**
 * Resolve component for a new tech base, with intelligent matching
 */
export function resolveComponentForTechBase(
  currentComponent: string,
  category: ComponentCategory,
  newTechBase: TechBase
): string {
  // If current component is available for new tech base, keep it
  if (isComponentAvailable(currentComponent, category, newTechBase)) {
    return currentComponent;
  }
  
  // Try to find intelligent equivalent
  const intelligentMatch = findIntelligentMatch(currentComponent, category, newTechBase);
  if (intelligentMatch) {
    return intelligentMatch;
  }
  
  // Fallback to default for that tech base
  return getDefaultComponent(category, newTechBase);
}

/**
 * Find intelligent component match based on base type and patterns
 */
function findIntelligentMatch(
  currentComponent: string,
  category: ComponentCategory,
  newTechBase: TechBase
): string | null {
  const availableComponents = getAvailableComponents(category, newTechBase);
  
  // Remove tech base suffixes to find base type
  const baseType = extractBaseType(currentComponent);
  
  // Look for exact base match with new tech base suffix
  const exactMatch = availableComponents.find(comp => {
    const compBaseType = extractBaseType(comp);
    return compBaseType === baseType;
  });
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Handle special case equivalencies
  const specialMatch = findSpecialEquivalent(currentComponent, category, newTechBase);
  if (specialMatch && availableComponents.includes(specialMatch)) {
    return specialMatch;
  }
  
  return null;
}

/**
 * Extract base component type by removing tech base suffixes
 */
function extractBaseType(componentName: string): string {
  return componentName
    .replace(/ \(Inner Sphere\)/gi, '')
    .replace(/ \(Clan\)/gi, '')
    .replace(/ \(IS\)/gi, '')
    .trim();
}

/**
 * Handle special case component equivalents between tech bases
 */
function findSpecialEquivalent(
  currentComponent: string,
  category: ComponentCategory,
  newTechBase: TechBase
): string | null {
  // Handle myomer special cases
  if (category === 'myomer') {
    if (currentComponent === 'Triple Strength Myomer' && newTechBase === 'Clan') {
      return 'MASC'; // Clan equivalent of enhancement
    }
    if (currentComponent === 'MASC' && newTechBase === 'Inner Sphere') {
      // Could go to either TSM or MASC - prefer MASC if available
      return 'MASC';
    }
  }
  
  // Handle heat sink transitions
  if (category === 'heatsink') {
    if (currentComponent === 'Double' && newTechBase === 'Clan') {
      return 'Double (Clan)';
    }
    if (currentComponent === 'Double (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Double';
    }
    if (currentComponent === 'Single' && newTechBase === 'Clan') {
      return 'Double (Clan)'; // Clan doesn't use single heat sinks
    }
  }
  
  // Handle engine transitions
  if (category === 'engine') {
    if (currentComponent === 'XL' && newTechBase === 'Clan') {
      return 'XL (Clan)';
    }
    if (currentComponent === 'XL (Clan)' && newTechBase === 'Inner Sphere') {
      return 'XL';
    }
    if (currentComponent === 'Light' && newTechBase === 'Clan') {
      return 'Light (Clan)';
    }
    if (currentComponent === 'Light (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Light';
    }
  }
  
  // Handle armor transitions
  if (category === 'armor') {
    if (currentComponent === 'Ferro-Fibrous' && newTechBase === 'Clan') {
      return 'Ferro-Fibrous (Clan)';
    }
    if (currentComponent === 'Ferro-Fibrous (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Ferro-Fibrous';
    }
    if (currentComponent === 'Stealth' && newTechBase === 'Clan') {
      return 'Stealth (Clan)';
    }
    if (currentComponent === 'Stealth (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Stealth';
    }
  }
  
  // Handle structure/chassis transitions
  if (category === 'chassis') {
    if (currentComponent === 'Endo Steel' && newTechBase === 'Clan') {
      return 'Endo Steel (Clan)';
    }
    if (currentComponent === 'Endo Steel (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Endo Steel';
    }
  }
  
  // Handle targeting transitions
  if (category === 'targeting') {
    if (currentComponent === 'Artemis IV' && newTechBase === 'Clan') {
      return 'Artemis IV (Clan)';
    }
    if (currentComponent === 'Artemis IV (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Artemis IV';
    }
    if (currentComponent === 'Targeting Computer' && newTechBase === 'Clan') {
      return 'Targeting Computer (Clan)';
    }
    if (currentComponent === 'Targeting Computer (Clan)' && newTechBase === 'Inner Sphere') {
      return 'Targeting Computer';
    }
  }
  
  // Handle movement/jump jet transitions
  if (category === 'movement') {
    if (currentComponent.includes('Jump Jets') && newTechBase === 'Clan') {
      if (currentComponent.includes('Improved')) {
        return 'Improved Jump Jets (Clan)';
      }
      return 'Jump Jets (Clan)';
    }
    if (currentComponent.includes('Jump Jets (Clan)') && newTechBase === 'Inner Sphere') {
      if (currentComponent.includes('Improved')) {
        return 'Improved Jump Jets';
      }
      return 'Standard Jump Jets';
    }
  }
  
  return null;
}

/**
 * Batch resolve multiple components for tech base change
 */
export function resolveMultipleComponents(
  componentConfig: Record<ComponentCategory, string>,
  techProgression: Record<ComponentCategory, TechBase>
): Record<ComponentCategory, string> {
  const resolved: Record<ComponentCategory, string> = {} as Record<ComponentCategory, string>;
  
  for (const category of Object.keys(componentConfig) as ComponentCategory[]) {
    const currentComponent = componentConfig[category];
    const targetTechBase = techProgression[category];
    
    resolved[category] = resolveComponentForTechBase(
      currentComponent,
      category,
      targetTechBase
    );
  }
  
  return resolved;
}

/**
 * Get component changes that would occur from tech base transition
 */
export function getComponentChanges(
  componentConfig: Record<ComponentCategory, string>,
  currentTechProgression: Record<ComponentCategory, TechBase>,
  newTechProgression: Record<ComponentCategory, TechBase>
): { category: ComponentCategory; from: string; to: string }[] {
  const changes: { category: ComponentCategory; from: string; to: string }[] = [];
  
  for (const category of Object.keys(componentConfig) as ComponentCategory[]) {
    const currentTechBase = currentTechProgression[category];
    const newTechBase = newTechProgression[category];
    
    // Only check categories where tech base is changing
    if (currentTechBase !== newTechBase) {
      const currentComponent = componentConfig[category];
      const newComponent = resolveComponentForTechBase(
        currentComponent,
        category,
        newTechBase
      );
      
      if (currentComponent !== newComponent) {
        changes.push({
          category,
          from: currentComponent,
          to: newComponent
        });
      }
    }
  }
  
  return changes;
}

/**
 * Validate component resolution for debugging
 */
export function validateComponentResolution(
  component: string,
  category: ComponentCategory,
  fromTechBase: TechBase,
  toTechBase: TechBase
): {
  isValid: boolean;
  originalAvailable: boolean;
  resolvedComponent: string;
  resolvedAvailable: boolean;
  resolutionPath: string;
} {
  const originalAvailable = isComponentAvailable(component, category, fromTechBase);
  const resolvedComponent = resolveComponentForTechBase(component, category, toTechBase);
  const resolvedAvailable = isComponentAvailable(resolvedComponent, category, toTechBase);
  
  let resolutionPath = 'unknown';
  
  if (component === resolvedComponent) {
    resolutionPath = 'no-change';
  } else if (isComponentAvailable(component, category, toTechBase)) {
    resolutionPath = 'kept-original';
  } else {
    const intelligentMatch = findIntelligentMatch(component, category, toTechBase);
    if (intelligentMatch === resolvedComponent) {
      resolutionPath = 'intelligent-match';
    } else {
      resolutionPath = 'default-fallback';
    }
  }
  
  return {
    isValid: resolvedAvailable,
    originalAvailable,
    resolvedComponent,
    resolvedAvailable,
    resolutionPath
  };
}
