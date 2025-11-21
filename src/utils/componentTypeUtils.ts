/**
 * Component Type Utilities
 * 
 * Helper functions for extracting component types from ComponentConfiguration objects
 * and handling legacy string types during migration.
 */

import { ComponentConfiguration } from '../types/componentConfiguration';

/**
 * Extract the type string from a component configuration or legacy string
 * @param component - ComponentConfiguration object or legacy string
 * @returns The component type as a string
 */
export function getComponentType(component: ComponentConfiguration | string | undefined): string {
  if (!component) return 'Standard';
  if (typeof component === 'string') return component;
  return component.type;
}

/**
 * Extract the tech base from a component configuration or legacy string
 * @param component - ComponentConfiguration object or legacy string
 * @param fallback - Default tech base if not available
 * @returns The tech base as a string
 */
export function getComponentTechBase(
  component: ComponentConfiguration | string | undefined, 
  fallback: 'Inner Sphere' | 'Clan' = 'Inner Sphere'
): 'Inner Sphere' | 'Clan' {
  if (!component) return fallback;
  if (typeof component === 'string') {
    // Infer tech base from string (legacy compatibility)
    return component.includes('Clan') ? 'Clan' : fallback;
  }
  return component.techBase;
}

/**
 * Get a display name for a component configuration
 * @param component - ComponentConfiguration object or legacy string
 * @returns A human-readable display name
 */
export function getComponentDisplayName(component: ComponentConfiguration | string | undefined): string {
  const type = getComponentType(component);
  const techBase = getComponentTechBase(component);
  
  // Add tech base suffix for clarity if it's Clan and not already in the name
  if (techBase === 'Clan' && !type.includes('Clan')) {
    return `${type} (Clan)`;
  }
  
  return type;
}

/**
 * Create a ComponentConfiguration object from a type string
 * @param type - The component type string
 * @param techBase - The tech base
 * @returns A ComponentConfiguration object
 */
export function createComponentConfiguration(
  type: string, 
  techBase: 'Inner Sphere' | 'Clan' = 'Inner Sphere'
): ComponentConfiguration {
  return {
    type,
    techBase
  };
}

/**
 * Check if a component is a ComponentConfiguration object
 * @param component - Component to check
 * @returns True if it's a ComponentConfiguration object
 */
export function isComponentConfiguration(component: any): component is ComponentConfiguration {
  return component && typeof component === 'object' && 'type' in component && 'techBase' in component;
}

/**
 * Check if a component is a legacy string
 * @param component - Component to check
 * @returns True if it's a legacy string
 */
export function isLegacyString(component: any): component is string {
  return typeof component === 'string';
} 