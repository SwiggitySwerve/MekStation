/**
 * Component Availability Reference - Single source of truth for tech base component availability
 * Defines which components are available for each tech base in BattleTech
 */

export const COMPONENT_AVAILABILITY = {
  chassis: {
    "Inner Sphere": ["Standard", "Endo Steel", "Composite", "Reinforced"],
    "Clan": ["Standard", "Endo Steel (Clan)"]
  },
  
  gyro: {
    "Inner Sphere": ["Standard", "XL", "Compact", "Heavy-Duty"], 
    "Clan": ["Standard"] // Clan can't use advanced gyros
  },
  
  engine: {
    "Inner Sphere": ["Standard", "XL", "Light", "Compact"],
    "Clan": ["Standard", "XL (Clan)", "Light (Clan)"]
  },
  
  heatsink: {
    "Inner Sphere": ["Single", "Double"],
    "Clan": ["Double (Clan)"] // Clan doesn't use single heat sinks
  },
  
  myomer: {
    "Inner Sphere": ["None", "Triple Strength Myomer", "MASC"],
    "Clan": ["None", "MASC"] // No Triple Strength Myomer for Clan
  },
  
  armor: {
    "Inner Sphere": ["Standard", "Ferro-Fibrous", "Light Ferro", "Heavy Ferro", "Stealth"],
    "Clan": ["Standard", "Ferro-Fibrous (Clan)", "Stealth (Clan)"]
  },
  
  targeting: {
    "Inner Sphere": ["None", "Artemis IV", "Targeting Computer"],
    "Clan": ["None", "Artemis IV (Clan)", "Targeting Computer (Clan)"]
  },
  
  movement: {
    "Inner Sphere": ["Standard Jump Jets", "Improved Jump Jets"],
    "Clan": ["Jump Jets (Clan)", "Improved Jump Jets (Clan)"]
  }
} as const;

export type ComponentCategory = keyof typeof COMPONENT_AVAILABILITY;
export type TechBase = "Inner Sphere" | "Clan";

/**
 * Get available components for a specific category and tech base
 */
export function getAvailableComponents(
  category: ComponentCategory,
  techBase: TechBase
): readonly string[] {
  return COMPONENT_AVAILABILITY[category][techBase] || [];
}

/**
 * Get the default component for a category and tech base (first in list)
 */
export function getDefaultComponent(
  category: ComponentCategory,
  techBase: TechBase
): string {
  const components = getAvailableComponents(category, techBase);
  return components[0] || "Standard";
}

/**
 * Check if a component is available for a specific tech base
 */
export function isComponentAvailable(
  component: string,
  category: ComponentCategory,
  techBase: TechBase
): boolean {
  const availableComponents = getAvailableComponents(category, techBase);
  return availableComponents.includes(component);
}

/**
 * Get all component categories
 */
export function getComponentCategories(): ComponentCategory[] {
  return Object.keys(COMPONENT_AVAILABILITY) as ComponentCategory[];
}

/**
 * Validate that a component configuration is consistent with tech base selections
 */
export function validateComponentConfiguration(
  componentConfig: Record<ComponentCategory, string>,
  techProgression: Record<ComponentCategory, TechBase>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const category of getComponentCategories()) {
    const component = componentConfig[category];
    const techBase = techProgression[category];
    
    if (component && !isComponentAvailable(component, category, techBase)) {
      errors.push(`${component} is not available for ${techBase} in ${category}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
