/**
 * StructureRulesValidator - BattleTech structure validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles internal structure validation, type compatibility, and weight calculations.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { IComponentConfiguration } from '../../types/core/ComponentInterfaces';
import { getTotalInternalStructure } from '../../utils/internalStructureTable';

export interface StructureValidation {
  isValid: boolean;
  structureType: string;
  structureWeight: number;
  internalStructure: number;
  violations: StructureViolation[];
  recommendations: string[];
}

export interface StructureViolation {
  type: 'invalid_type' | 'weight_mismatch' | 'tonnage_incompatible' | 'tech_level_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class StructureRulesValidator {
  
  /**
   * Validate structure rules for a unit configuration
   */
  static validateStructureRules(config: UnitConfiguration): StructureValidation {
    const violations: StructureViolation[] = [];
    const recommendations: string[] = [];
    
    const structureType = this.extractComponentType(config.structureType);
    const tonnage = config.tonnage || 100;
    const structureWeight = this.calculateStructureWeight(tonnage, structureType);
    const internalStructure = this.calculateInternalStructure(tonnage);
    
    // Validate structure type
    if (!this.isValidStructureType(structureType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid structure type: ${structureType}`,
        severity: 'critical',
        suggestedFix: 'Select a valid structure type'
      });
    }
    
    // Check for tech level restrictions
    const techRestrictions = this.getStructureTechLevelRestrictions(structureType);
    if (techRestrictions.techLevel === 'Advanced') {
      // Note: Advanced structure types may require special authorization
      recommendations.push(`${structureType} is advanced technology - ensure it's allowed in your campaign`);
    }
    
    // Check weight calculation
    const expectedWeight = this.calculateStructureWeight(tonnage, 'Standard');
    const actualWeight = structureWeight;
    const weightDifference = Math.abs(expectedWeight - actualWeight);
    
    if (weightDifference > 0.1) { // Allow small rounding differences
      const isLighter = actualWeight < expectedWeight;
      if (isLighter) {
        recommendations.push(`${structureType} saves ${(expectedWeight - actualWeight).toFixed(1)} tons compared to standard structure`);
      } else {
        recommendations.push(`${structureType} weighs ${(actualWeight - expectedWeight).toFixed(1)} tons more than standard structure`);
      }
    }
    
    // Check for optimal structure type recommendations
    if (structureType === 'Standard' && tonnage >= 60) {
      recommendations.push('Consider upgrading to Endo Steel structure for significant weight savings on heavier units');
    }
    
    return {
      isValid: violations.length === 0,
      structureType,
      structureWeight,
      internalStructure,
      violations,
      recommendations
    };
  }
  
  /**
   * Calculate structure weight based on tonnage and type
   */
  static calculateStructureWeight(tonnage: number, structureType: string): number {
    const baseWeight = tonnage * 0.1; // 10% of tonnage for standard structure
    
    switch (structureType) {
      case 'Endo Steel':
      case 'Endo Steel (IS)':
        return Math.ceil(baseWeight * 0.5 * 2) / 2; // 50% weight savings, rounded to half-tons
      case 'Endo Steel (Clan)':
        return Math.ceil(baseWeight * 0.5 * 2) / 2; // Same weight savings as IS
      case 'Reinforced':
        return baseWeight * 2.0; // Double weight for extra protection
      case 'Composite':
        return baseWeight * 0.75; // 25% weight savings
      case 'Industrial':
        return baseWeight * 1.5; // 50% heavier but cheaper
      default: // Standard
        return baseWeight;
    }
  }
  
  /**
   * Calculate internal structure points
   */
  static calculateInternalStructure(tonnage: number): number {
    return getTotalInternalStructure(tonnage);
  }
  
  /**
   * Get critical slots required by structure type
   */
  static getStructureCriticalSlots(structureType: string): number {
    switch (structureType) {
      case 'Endo Steel':
      case 'Endo Steel (IS)':
        return 14; // 14 critical slots distributed across the mech
      case 'Endo Steel (Clan)':
        return 7; // Clan endo steel is more compact
      case 'Composite':
        return 4; // Requires some critical slots
      case 'Reinforced':
      case 'Industrial':
      case 'Standard':
      default:
        return 0; // No critical slots required
    }
  }
  
  /**
   * Get structure protection multiplier for damage calculation
   */
  static getStructureProtectionMultiplier(structureType: string): number {
    switch (structureType) {
      case 'Reinforced':
        return 2.0; // Double structure points
      case 'Composite':
        return 1.5; // 50% more structure points
      default:
        return 1.0; // Standard protection
    }
  }
  
  /**
   * Check if structure type is valid
   */
  private static isValidStructureType(structureType: string): boolean {
    const validTypes = [
      'Standard',
      'Endo Steel',
      'Endo Steel (IS)',
      'Endo Steel (Clan)',
      'Reinforced',
      'Composite',
      'Industrial'
    ];
    return validTypes.includes(structureType);
  }
  
  /**
   * Extract component type from configuration
   */
  private static extractComponentType(component: IComponentConfiguration | string | undefined): string {
    if (!component) return 'Standard'; // Default fallback
    return typeof component === 'string' ? component : component.type;
  }
  
  /**
   * Get structure durability analysis
   */
  static getStructureDurabilityAnalysis(config: UnitConfiguration): {
    baseStructure: number;
    modifiedStructure: number;
    locations: { [location: string]: { structure: number; multiplier: number } };
    survivability: 'Low' | 'Standard' | 'High' | 'Exceptional';
    recommendations: string[];
  } {
    const tonnage = config.tonnage || 100;
    const structureType = this.extractComponentType(config.structureType);
    const baseStructure = this.calculateInternalStructure(tonnage);
    const multiplier = this.getStructureProtectionMultiplier(structureType);
    const modifiedStructure = Math.floor(baseStructure * multiplier);
    
    // Calculate per-location structure
    const locations: { [location: string]: { structure: number; multiplier: number } } = {
      head: { structure: 3, multiplier },
      centerTorso: { structure: modifiedStructure, multiplier },
      leftTorso: { structure: Math.ceil(modifiedStructure * 0.75), multiplier },
      rightTorso: { structure: Math.ceil(modifiedStructure * 0.75), multiplier },
      leftArm: { structure: Math.ceil(modifiedStructure * 0.5), multiplier },
      rightArm: { structure: Math.ceil(modifiedStructure * 0.5), multiplier },
      leftLeg: { structure: Math.ceil(modifiedStructure * 0.75), multiplier },
      rightLeg: { structure: Math.ceil(modifiedStructure * 0.75), multiplier }
    };
    
    // Determine survivability rating
    let survivability: 'Low' | 'Standard' | 'High' | 'Exceptional' = 'Standard';
    if (multiplier >= 2.0) {
      survivability = 'Exceptional';
    } else if (multiplier >= 1.5) {
      survivability = 'High';
    } else if (modifiedStructure < baseStructure * 0.8) {
      survivability = 'Low';
    }
    
    const recommendations: string[] = [];
    
    if (survivability === 'Low') {
      recommendations.push('Consider upgrading to Reinforced or Composite structure for better survivability');
    } else if (survivability === 'Standard' && tonnage >= 55) {
      recommendations.push('Structure is adequate but consider advanced options for weight savings');
    }
    
    return {
      baseStructure,
      modifiedStructure,
      locations,
      survivability,
      recommendations
    };
  }
  
  /**
   * Get tech level restrictions for structure types
   */
  static getStructureTechLevelRestrictions(structureType: string): {
    techLevel: string;
    era: string;
    availability: string;
    restrictions: string[];
  } {
    switch (structureType) {
      case 'Standard':
        return {
          techLevel: 'Introductory',
          era: 'Age of War',
          availability: 'Common',
          restrictions: []
        };
      case 'Endo Steel (IS)':
        return {
          techLevel: 'Standard',
          era: 'Succession Wars',
          availability: 'Uncommon',
          restrictions: ['Requires 14 critical slots']
        };
      case 'Endo Steel (Clan)':
        return {
          techLevel: 'Standard',
          era: 'Clan Invasion',
          availability: 'Common (Clan)',
          restrictions: ['Clan technology', 'Requires 7 critical slots']
        };
      case 'Reinforced':
        return {
          techLevel: 'Advanced',
          era: 'FedCom Civil War',
          availability: 'Rare',
          restrictions: ['Double weight', 'High cost']
        };
      case 'Composite':
        return {
          techLevel: 'Advanced',
          era: 'Dark Age',
          availability: 'Very Rare',
          restrictions: ['Requires 4 critical slots', 'Experimental technology']
        };
      case 'Industrial':
        return {
          techLevel: 'Introductory',
          era: 'Age of War',
          availability: 'Common',
          restrictions: ['Industrial use only', 'Heavier than standard']
        };
      default:
        return {
          techLevel: 'Standard',
          era: 'Succession Wars',
          availability: 'Uncommon',
          restrictions: []
        };
    }
  }
  
  /**
   * Calculate weight savings compared to standard structure
   */
  static calculateWeightSavings(tonnage: number, structureType: string): {
    standardWeight: number;
    actualWeight: number;
    savings: number;
    percentage: number;
  } {
    const standardWeight = this.calculateStructureWeight(tonnage, 'Standard');
    const actualWeight = this.calculateStructureWeight(tonnage, structureType);
    const savings = standardWeight - actualWeight;
    const percentage = (savings / standardWeight) * 100;
    
    return {
      standardWeight,
      actualWeight,
      savings,
      percentage
    };
  }
  
  /**
   * Validate structure type compatibility with unit class
   */
  static validateStructureCompatibility(config: UnitConfiguration): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const structureType = this.extractComponentType(config.structureType);
    const tonnage = config.tonnage || 100;
    const techBase = config.techBase || 'Inner Sphere';
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check tech base compatibility
    if (structureType.includes('Clan') && techBase === 'Inner Sphere') {
      issues.push('Clan structure incompatible with Inner Sphere tech base');
    }
    
    // Check tonnage recommendations
    if (structureType === 'Endo Steel' && tonnage < 30) {
      recommendations.push('Endo Steel may not be cost-effective on very light units');
    }
    
    if (structureType === 'Reinforced' && tonnage < 50) {
      recommendations.push('Reinforced structure is typically used on heavier assault units');
    }
    
    // Check for optimal usage
    if (structureType === 'Standard' && tonnage >= 75) {
      recommendations.push('Heavy assault units benefit significantly from Endo Steel weight savings');
    }
    
    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  /**
   * Get structure allocation by location for critical hit calculations
   */
  static getStructureAllocation(tonnage: number, structureType: string): {
    [location: string]: {
      structure: number;
      criticalSlots: number;
      weight: number;
    };
  } {
    const baseStructure = this.calculateInternalStructure(tonnage);
    const totalWeight = this.calculateStructureWeight(tonnage, structureType);
    const totalSlots = this.getStructureCriticalSlots(structureType);
    
    // Distribute structure, weight, and slots across locations
    return {
      head: {
        structure: 3, // Always 3 for head
        criticalSlots: 0,
        weight: 0
      },
      centerTorso: {
        structure: baseStructure,
        criticalSlots: Math.ceil(totalSlots * 0.3), // 30% of slots in CT
        weight: totalWeight * 0.3
      },
      leftTorso: {
        structure: Math.ceil(baseStructure * 0.75),
        criticalSlots: Math.ceil(totalSlots * 0.2), // 20% of slots per side torso
        weight: totalWeight * 0.15
      },
      rightTorso: {
        structure: Math.ceil(baseStructure * 0.75),
        criticalSlots: Math.ceil(totalSlots * 0.2),
        weight: totalWeight * 0.15
      },
      leftArm: {
        structure: Math.ceil(baseStructure * 0.5),
        criticalSlots: Math.ceil(totalSlots * 0.075), // 7.5% of slots per arm
        weight: totalWeight * 0.1
      },
      rightArm: {
        structure: Math.ceil(baseStructure * 0.5),
        criticalSlots: Math.ceil(totalSlots * 0.075),
        weight: totalWeight * 0.1
      },
      leftLeg: {
        structure: Math.ceil(baseStructure * 0.75),
        criticalSlots: Math.ceil(totalSlots * 0.075), // 7.5% of slots per leg
        weight: totalWeight * 0.1
      },
      rightLeg: {
        structure: Math.ceil(baseStructure * 0.75),
        criticalSlots: Math.ceil(totalSlots * 0.075),
        weight: totalWeight * 0.1
      }
    };
  }
}

export default StructureRulesValidator;






