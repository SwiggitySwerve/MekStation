/**
 * Component Management Utility
 * 
 * Handles component extraction, manipulation, and analysis.
 * Extracted from TechLevelRulesValidator.ts for better modularity and testability.
 */

import { ComponentInfo } from '../types/TechLevelTypes';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';

export class ComponentManager {
  /**
   * Extract all components from configuration and equipment
   */
  static getAllComponents(config: UnitConfiguration, equipment: any[]): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    const unitTechBase = config.techBase || 'Inner Sphere';
    
    // Add system components with proper tech base inheritance
    components.push({
      name: `${this.extractComponentType(config.structureType)} Structure`,
      techBase: unitTechBase,
      category: 'structure'
    });
    
    components.push({
      name: `${this.extractComponentType(config.armorType)} Armor`,
      techBase: unitTechBase,
      category: 'armor'
    });
    
    components.push({
      name: `${config.engineType || 'Standard'} Engine`,
      techBase: unitTechBase, // Use unit tech base, not hardcoded
      category: 'engine'
    });
    
    // Add equipment
    equipment.forEach(item => {
      components.push({
        name: item.equipmentData?.name || 'Unknown',
        techBase: item.equipmentData?.techBase || unitTechBase,
        category: item.equipmentData?.type || 'equipment'
      });
    });
    
    return components;
  }

  /**
   * Extract component type from configuration object
   */
  static extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }

  /**
   * Filter components by tech base
   */
  static filterComponentsByTechBase(components: ComponentInfo[], techBase: string): ComponentInfo[] {
    return components.filter(component => component.techBase === techBase);
  }

  /**
   * Filter components by category
   */
  static filterComponentsByCategory(components: ComponentInfo[], category: string): ComponentInfo[] {
    return components.filter(component => component.category === category);
  }

  /**
   * Get component counts by tech base
   */
  static getComponentCountsByTechBase(components: ComponentInfo[]): { [techBase: string]: number } {
    const counts: { [techBase: string]: number } = {};
    
    components.forEach(component => {
      const techBase = component.techBase || 'Inner Sphere';
      counts[techBase] = (counts[techBase] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Get component counts by category
   */
  static getComponentCountsByCategory(components: ComponentInfo[]): { [category: string]: number } {
    const counts: { [category: string]: number } = {};
    
    components.forEach(component => {
      const category = component.category || 'equipment';
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Find components matching a pattern
   */
  static findComponentsMatching(components: ComponentInfo[], pattern: string): ComponentInfo[] {
    const lowerPattern = pattern.toLowerCase();
    return components.filter(component => 
      component.name.toLowerCase().includes(lowerPattern)
    );
  }

  /**
   * Get unique tech bases from components
   */
  static getUniqueTechBases(components: ComponentInfo[]): string[] {
    const techBases = new Set(components.map(c => c.techBase || 'Inner Sphere'));
    return Array.from(techBases);
  }

  /**
   * Get unique categories from components
   */
  static getUniqueCategories(components: ComponentInfo[]): string[] {
    const categories = new Set(components.map(c => c.category || 'equipment'));
    return Array.from(categories);
  }

  /**
   * Check if components contain mixed tech
   */
  static hasMixedTech(components: ComponentInfo[]): boolean {
    const techBases = this.getUniqueTechBases(components);
    // Remove Star League as it's compatible with both IS and Clan
    const filteredTechBases = techBases.filter(tb => tb !== 'Star League');
    
    return filteredTechBases.length > 1;
  }

  /**
   * Validate component structure
   */
  static validateComponent(component: ComponentInfo): boolean {
    return !!(component.name && component.techBase && component.category);
  }

  /**
   * Normalize component names for comparison
   */
  static normalizeComponentName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Group components by tech base
   */
  static groupComponentsByTechBase(components: ComponentInfo[]): { [techBase: string]: ComponentInfo[] } {
    const groups: { [techBase: string]: ComponentInfo[] } = {};
    
    components.forEach(component => {
      const techBase = component.techBase || 'Inner Sphere';
      if (!groups[techBase]) {
        groups[techBase] = [];
      }
      groups[techBase].push(component);
    });
    
    return groups;
  }

  /**
   * Group components by category
   */
  static groupComponentsByCategory(components: ComponentInfo[]): { [category: string]: ComponentInfo[] } {
    const groups: { [category: string]: ComponentInfo[] } = {};
    
    components.forEach(component => {
      const category = component.category || 'equipment';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(component);
    });
    
    return groups;
  }
}




