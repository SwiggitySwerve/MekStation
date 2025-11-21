/**
 * ArmorRulesValidator - BattleTech armor validation rules
 * 
 * Extracted from ConstructionRulesValidator as part of large file refactoring.
 * Handles armor allocation limits, type validation, and weight calculations.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';
import { getInternalStructurePoints, getMaxArmorPoints, getMaxArmorPointsForLocation } from '../../utils/internalStructureTable';

export interface ArmorValidation {
  isValid: boolean;
  totalArmor: number;
  maxArmor: number;
  armorType: string;
  armorWeight: number;
  locationLimits: { [location: string]: ArmorLocationValidation };
  violations: ArmorViolation[];
  recommendations: string[];
}

export interface ArmorLocationValidation {
  location: string;
  armor: number;
  maxArmor: number;
  isValid: boolean;
  violations: string[];
}

export interface ArmorViolation {
  type: 'exceeds_maximum' | 'invalid_type' | 'weight_mismatch' | 'location_violation';
  location?: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix: string;
}

export class ArmorRulesValidator {
  
  /**
   * Validate armor rules for a unit configuration
   */
  static validateArmorRules(config: UnitConfiguration): ArmorValidation {
    const violations: ArmorViolation[] = [];
    const recommendations: string[] = [];
    const locationLimits: { [location: string]: ArmorLocationValidation } = {};
    
    const armorType = this.extractComponentType(config.armorType);
    const tonnage = config.tonnage || 100;
    const maxArmor = this.calculateMaxArmor(tonnage);
    const totalArmor = this.calculateTotalArmorFromAllocation(config.armorAllocation) || 0;
    const armorWeight = this.calculateArmorWeight(totalArmor, armorType);
    
    // Validate armor type
    if (!this.isValidArmorType(armorType)) {
      violations.push({
        type: 'invalid_type',
        message: `Invalid armor type: ${armorType}`,
        severity: 'critical',
        suggestedFix: 'Select a valid armor type'
      });
    }
    
    // Check total armor limits
    if (totalArmor > maxArmor) {
      violations.push({
        type: 'exceeds_maximum',
        message: `Total armor ${totalArmor} exceeds maximum of ${maxArmor}`,
        severity: 'critical',
        suggestedFix: `Reduce armor by ${totalArmor - maxArmor} points`
      });
    }
    
    // Validate individual location limits
    this.validateLocationLimits(config, locationLimits, violations);
    
    // Check armor efficiency
    if (totalArmor < maxArmor * 0.8) {
      recommendations.push(`Unit is underarmored (${totalArmor}/${maxArmor}). Consider adding more armor for better protection.`);
    }
    
    // Check for armor type efficiency
    if (armorType === 'Standard' && tonnage >= 55) {
      recommendations.push('Consider upgrading to Ferro-Fibrous armor for weight savings on heavier units.');
    }
    
    return {
      isValid: violations.length === 0,
      totalArmor,
      maxArmor,
      armorType,
      armorWeight,
      locationLimits,
      violations,
      recommendations
    };
  }
  
  /**
   * Calculate maximum armor for a given tonnage
   */
  static calculateMaxArmor(tonnage: number): number {
    // Use official BattleTech rule for max armor points
    return getMaxArmorPoints(tonnage);
  }
  
  /**
   * Calculate armor weight based on total points and type
   */
  static calculateArmorWeight(totalArmor: number, armorType: string): number {
    const baseWeight = totalArmor / 16; // 16 points per ton for standard armor
    
    switch (armorType) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (IS)':
        return Math.ceil(baseWeight * 1.12 * 2) / 2; // 12% weight savings, rounded to half-tons
      case 'Ferro-Fibrous (Clan)':
        return Math.ceil(baseWeight * 1.2 * 2) / 2; // 20% weight savings, rounded to half-tons
      case 'Light Ferro-Fibrous':
        return Math.ceil(baseWeight * 1.06 * 2) / 2; // 6% weight savings
      case 'Heavy Ferro-Fibrous':
        return Math.ceil(baseWeight * 1.24 * 2) / 2; // 24% weight savings
      case 'Stealth':
        return baseWeight * 1.0; // Same weight as standard, but requires stealth components
      case 'Reactive':
        return baseWeight * 1.3; // 30% heavier but self-repairing
      case 'Reflective':
        return baseWeight * 1.0; // Same weight, energy weapon protection
      case 'Hardened':
        return baseWeight * 2.0; // Double weight for superior protection
      default: // Standard
        return baseWeight;
    }
  }
  
  /**
   * Get critical slots required by armor type
   */
  static getArmorCriticalSlots(armorType: string): number {
    switch (armorType) {
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (IS)':
        return 14; // 14 critical slots
      case 'Ferro-Fibrous (Clan)':
        return 7; // Clan FF takes fewer slots
      case 'Light Ferro-Fibrous':
        return 7;
      case 'Heavy Ferro-Fibrous':
        return 21;
      case 'Stealth':
        return 12; // Plus stealth equipment
      case 'Reactive':
        return 14;
      case 'Reflective':
        return 10;
      case 'Hardened':
        return 0; // No critical slots required
      default: // Standard
        return 0;
    }
  }
  
  /**
   * Get armor protection multiplier for damage calculation
   */
  static getArmorProtectionMultiplier(armorType: string): number {
    switch (armorType) {
      case 'Hardened':
        return 2.0; // Double protection
      case 'Reactive':
        return 1.1; // Slight protection boost vs physical damage
      case 'Reflective':
        return 1.2; // Bonus vs energy weapons
      case 'Ferro-Fibrous':
      case 'Ferro-Fibrous (IS)':
      case 'Ferro-Fibrous (Clan)':
      case 'Light Ferro-Fibrous':
      case 'Heavy Ferro-Fibrous':
        return 1.0; // Same protection, just weight savings
      default:
        return 1.0;
    }
  }
  
  /**
   * Validate individual location armor limits
   */
  private static validateLocationLimits(
    config: UnitConfiguration, 
    locationLimits: { [location: string]: ArmorLocationValidation },
    violations: ArmorViolation[]
  ): void {
    const locations = [
      { name: 'head', maxArmor: 9 },
      { name: 'centerTorso', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'centerTorso') },
      { name: 'leftTorso', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'sideTorso') },
      { name: 'rightTorso', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'sideTorso') },
      { name: 'leftArm', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'arm') },
      { name: 'rightArm', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'arm') },
      { name: 'leftLeg', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'leg') },
      { name: 'rightLeg', maxArmor: this.calculateLocationMaxArmor(config.tonnage || 100, 'leg') }
    ];
    
    for (const location of locations) {
      const armor = this.getLocationArmor(config.armorAllocation, location.name);
      const locationViolations: string[] = [];
      
      if (armor > location.maxArmor) {
        locationViolations.push(`Exceeds maximum armor (${armor}/${location.maxArmor})`);
        violations.push({
          type: 'location_violation',
          location: location.name,
          message: `${location.name} armor ${armor} exceeds maximum of ${location.maxArmor}`,
          severity: location.name === 'head' ? 'critical' : 'major',
          suggestedFix: `Reduce ${location.name} armor to ${location.maxArmor} points`
        });
      }
      
      locationLimits[location.name] = {
        location: location.name,
        armor,
        maxArmor: location.maxArmor,
        isValid: locationViolations.length === 0,
        violations: locationViolations
      };
    }
  }
  
  /**
   * Calculate maximum armor for a specific location
   */
  private static calculateLocationMaxArmor(tonnage: number, locationType: string): number {
    // Map location types to internal structure table location names
    const locationMap: Record<string, string> = {
      'head': 'HD',
      'centerTorso': 'CT',
      'sideTorso': 'LT', // Use left torso as reference for side torsos
      'arm': 'LA', // Use left arm as reference for arms
      'leg': 'LL' // Use left leg as reference for legs
    };
    
    const locationKey = locationMap[locationType];
    if (!locationKey) {
      // Fallback for unknown location types
      const structure = getInternalStructurePoints(tonnage);
      return structure.CT * 2; // Default to center torso max
    }
    
    return getMaxArmorPointsForLocation(tonnage, locationKey);
  }
  
  /**
   * Check if armor type is valid
   */
  private static isValidArmorType(armorType: string): boolean {
    const validTypes = [
      'Standard',
      'Ferro-Fibrous',
      'Ferro-Fibrous (IS)',
      'Ferro-Fibrous (Clan)',
      'Light Ferro-Fibrous',
      'Heavy Ferro-Fibrous',
      'Stealth',
      'Reactive',
      'Reflective',
      'Hardened',
      'Laser Reflective',
      'Anti-Penetrative Ablation'
    ];
    return validTypes.includes(armorType);
  }
  
  /**
   * Extract component type from configuration
   */
  private static extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component.type;
  }
  
  /**
   * Calculate total armor from allocation object
   */
  private static calculateTotalArmorFromAllocation(armorAllocation: any): number {
    if (!armorAllocation) return 0;
    
    let total = 0;
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    for (const location of locations) {
      if (armorAllocation[location]) {
        if (typeof armorAllocation[location] === 'object') {
          // Handle locations with front/rear armor
          total += armorAllocation[location].front || 0;
          total += armorAllocation[location].rear || 0;
        } else {
          // Handle simple armor values
          total += armorAllocation[location] || 0;
        }
      }
    }
    
    return total;
  }
  
  /**
   * Get armor value for a specific location
   */
  private static getLocationArmor(armorAllocation: any, location: string): number {
    if (!armorAllocation || !armorAllocation[location]) return 0;
    
    if (typeof armorAllocation[location] === 'object') {
      // Handle locations with front/rear armor
      return (armorAllocation[location].front || 0) + (armorAllocation[location].rear || 0);
    } else {
      // Handle simple armor values
      return armorAllocation[location] || 0;
    }
  }
  
  /**
   * Get armor distribution analysis
   */
  static getArmorDistributionAnalysis(config: UnitConfiguration): {
    distribution: { [location: string]: { armor: number; percentage: number } };
    balance: 'front-heavy' | 'rear-heavy' | 'balanced';
    recommendations: string[];
  } {
    const distribution: { [location: string]: { armor: number; percentage: number } } = {};
    const recommendations: string[] = [];
    
    const totalArmor = this.calculateTotalArmorFromAllocation(config.armorAllocation);
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    
    let frontArmor = 0;
    let rearArmor = 0;
    
    for (const location of locations) {
      const armor = this.getLocationArmor(config.armorAllocation, location);
      distribution[location] = {
        armor,
        percentage: totalArmor > 0 ? (armor / totalArmor) * 100 : 0
      };
      
      // Calculate front/rear distribution (simplified)
      if (location.includes('Torso') && config.armorAllocation) {
        // Type-safe access to armor allocation using known location keys
        let locationArmor: { front: number; rear: number } | undefined;
        
        switch (location) {
          case 'centerTorso':
            locationArmor = config.armorAllocation.CT;
            break;
          case 'leftTorso':
            locationArmor = config.armorAllocation.LT;
            break;
          case 'rightTorso':
            locationArmor = config.armorAllocation.RT;
            break;
        }
        
        if (locationArmor) {
          frontArmor += locationArmor.front || 0;
          rearArmor += locationArmor.rear || 0;
        } else {
          frontArmor += armor;
        }
      } else {
        frontArmor += armor;
      }
    }
    
    let balance: 'front-heavy' | 'rear-heavy' | 'balanced' = 'balanced';
    if (frontArmor > rearArmor * 3) {
      balance = 'front-heavy';
      recommendations.push('Consider adding rear armor for better protection against flanking attacks');
    } else if (rearArmor > frontArmor * 0.5) {
      balance = 'rear-heavy';
      recommendations.push('Unit has substantial rear armor - good for fighting retreats');
    }
    
    // Check for weak points
    const headPercentage = distribution.head?.percentage || 0;
    if (headPercentage < 2) {
      recommendations.push('Head armor is very low - consider maximizing at 9 points');
    }
    
    return {
      distribution,
      balance,
      recommendations
    };
  }
  
  /**
   * Get tech level restrictions for armor types
   */
  static getArmorTechLevelRestrictions(armorType: string): {
    techLevel: string;
    era: string;
    availability: string;
    restrictions: string[];
  } {
    switch (armorType) {
      case 'Standard':
        return {
          techLevel: 'Introductory',
          era: 'Age of War',
          availability: 'Common',
          restrictions: []
        };
      case 'Ferro-Fibrous (IS)':
        return {
          techLevel: 'Standard',
          era: 'Succession Wars',
          availability: 'Uncommon',
          restrictions: ['Requires 14 critical slots']
        };
      case 'Ferro-Fibrous (Clan)':
        return {
          techLevel: 'Standard',
          era: 'Clan Invasion',
          availability: 'Common (Clan)',
          restrictions: ['Clan technology', 'Requires 7 critical slots']
        };
      case 'Stealth':
        return {
          techLevel: 'Advanced',
          era: 'FedCom Civil War',
          availability: 'Very Rare',
          restrictions: ['Requires Guardian ECM', 'High maintenance']
        };
      case 'Hardened':
        return {
          techLevel: 'Experimental',
          era: 'Dark Age',
          availability: 'Prototype',
          restrictions: ['Double weight', 'Extremely expensive']
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
}

export default ArmorRulesValidator;





