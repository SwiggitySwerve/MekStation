/**
 * Mixed Tech Management Module
 * 
 * Handles mixed tech validation, rules, and restricted combinations.
 * Extracted from TechLevelRulesValidator.ts for better modularity and testability.
 */

import { 
  MixedTechValidation,
  MixedTechRules,
  CompatibilityMatrix,
  ComponentInfo,
  TechLevelValidationContext
} from '../types/TechLevelTypes';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManagerTypes';
import { TechBaseManager } from './TechBaseManager';

export class MixedTechManager {
  /**
   * Validate mixed tech compliance
   */
  static validateMixedTech(
    config: UnitConfiguration, 
    components: ComponentInfo[], 
    context: TechLevelValidationContext
  ): MixedTechValidation {
    let innerSphereComponents = 0;
    let clanComponents = 0;
    const violations: string[] = [];
    
    // Count tech base components
    for (const component of components) {
      const techBase = component.techBase || 'Inner Sphere';
      if (techBase === 'Inner Sphere' || techBase === 'Star League') {
        innerSphereComponents++;
      } else if (techBase === 'Clan') {
        clanComponents++;
      }
    }
    
    const isMixed = innerSphereComponents > 0 && clanComponents > 0;
    const allowedMixed = context.allowMixedTech;
    
    const mixedTechRules: MixedTechRules = {
      allowMixedTech: allowedMixed,
      requiresSpecialPilot: isMixed,
      battleValueModifier: isMixed ? 1.25 : 1.0,
      restrictedCombinations: this.getRestrictedCombinations(),
      compatibilityMatrix: TechBaseManager.getTechCompatibility()
    };
    
    if (isMixed && !allowedMixed) {
      violations.push('Mixed tech detected but not allowed by current rules');
    }
    
    if (isMixed && context.enforceCanonicalRestrictions) {
      const restrictedCombos = this.checkRestrictedCombinations(components);
      violations.push(...restrictedCombos);
    }
    
    return {
      isMixed,
      innerSphereComponents,
      clanComponents,
      allowedMixed,
      mixedTechRules,
      violations
    };
  }

  /**
   * Get restricted tech combinations
   */
  static getRestrictedCombinations(): string[] {
    return [
      'Clan weapons with Inner Sphere targeting computers',
      'Inner Sphere ammunition with Clan weapons',
      'Mixed heat sink types',
      'Clan XL engines with Inner Sphere components'
    ];
  }

  /**
   * Check for restricted tech combinations in components
   */
  static checkRestrictedCombinations(components: ComponentInfo[]): string[] {
    const violations: string[] = [];
    
    // Check for common incompatible combinations
    const clanWeapons = components.filter(c => c.category === 'weapon' && c.techBase === 'Clan');
    const isTargetingComputer = components.some(c => 
      c.name.toLowerCase().includes('targeting computer') && c.techBase === 'Inner Sphere'
    );
    
    if (clanWeapons.length > 0 && isTargetingComputer) {
      violations.push('Clan weapons with Inner Sphere targeting computer detected');
    }
    
    // Check for mixed heat sink types
    const heatSinks = components.filter(c => c.name.toLowerCase().includes('heat sink'));
    const heatSinkTypes = new Set(heatSinks.map(hs => hs.techBase));
    if (heatSinkTypes.size > 1) {
      violations.push('Mixed heat sink types detected');
    }
    
    // Check for Clan XL engines with Inner Sphere components
    const clanXLEngine = components.some(c => 
      c.name.toLowerCase().includes('xl engine') && c.techBase === 'Clan'
    );
    const innerSphereComponents = components.filter(c => c.techBase === 'Inner Sphere');
    
    if (clanXLEngine && innerSphereComponents.length > 0) {
      violations.push('Clan XL engine with Inner Sphere components may have integration issues');
    }
    
    return violations;
  }

  /**
   * Calculate mixed tech penalty
   */
  static calculateMixedTechPenalty(isMixed: boolean): number {
    return isMixed ? 1.25 : 1.0;
  }

  /**
   * Check if mixed tech requires special pilot
   */
  static requiresSpecialPilot(isMixed: boolean): boolean {
    return isMixed;
  }

  /**
   * Get mixed tech compatibility rules
   */
  static getMixedTechRules(allowMixedTech: boolean): MixedTechRules {
    return {
      allowMixedTech,
      requiresSpecialPilot: true,
      battleValueModifier: 1.25,
      restrictedCombinations: this.getRestrictedCombinations(),
      compatibilityMatrix: TechBaseManager.getTechCompatibility()
    };
  }

  /**
   * Validate specific mixed tech combination
   */
  static validateMixedTechCombination(techBase1: string, techBase2: string): boolean {
    const compatibility = TechBaseManager.getTechCompatibility();
    const tech1Compat = compatibility[techBase1];
    
    if (!tech1Compat) return false;
    
    return tech1Compat.compatible.includes(techBase2) || 
           tech1Compat.restricted.includes(techBase2);
  }

  /**
   * Get mixed tech design guidelines
   */
  static getMixedTechGuidelines(): string[] {
    return [
      'Mixed tech units require experienced pilots',
      'Maintenance complexity increases significantly',
      'Battle value increases by 25%',
      'Some combinations are strictly forbidden',
      'Consider era restrictions on mixed tech availability'
    ];
  }
}




