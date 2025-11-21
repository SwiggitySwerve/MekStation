/**
 * Equipment Integration Service
 * Connects enhanced construction rules with the equipment database
 */

import { ConstructionRulesEngine } from './ConstructionRulesEngine';
import { 
  TechBase, 
  ConstructionContext, 
  ComponentOption,
  EquipmentCompatibilityResult 
} from '../../types/enhancedSystemComponents';

export interface EquipmentTechVariant {
  id: string;
  baseEquipmentId: string;
  name: string;
  techBase: TechBase | 'Both';
  weight: number;
  criticalSlots: number;
  cost: number;
  performanceModifiers: {
    damage?: number;
    heat?: number;
    range?: {
      short: number;
      medium: number;
      long: number;
    };
    special?: string[];
  };
  restrictions: string[];
  introductionYear: number;
  extinctionYear?: number;
}

export interface EquipmentFilterCriteria {
  techBase: TechBase;
  era: string;
  techLevel: string;
  tonnage: number;
  category?: string;
  weaponType?: string;
  equipmentType?: string;
}

export class EquipmentIntegrationService {
  private constructionEngine: ConstructionRulesEngine;
  private equipmentCache: Map<string, EquipmentTechVariant[]>;
  private compatibilityCache: Map<string, EquipmentCompatibilityResult>;

  constructor() {
    this.constructionEngine = new ConstructionRulesEngine();
    this.equipmentCache = new Map();
    this.compatibilityCache = new Map();
  }

  /**
   * Get equipment variants filtered by tech base and construction context
   */
  getCompatibleEquipment(
    criteria: EquipmentFilterCriteria,
    context: ConstructionContext
  ): EquipmentTechVariant[] {
    const cacheKey = this.generateEquipmentCacheKey(criteria, context);
    
    if (this.equipmentCache.has(cacheKey)) {
      return this.equipmentCache.get(cacheKey)!;
    }

    const compatibleEquipment = this.filterEquipmentByCompatibility(criteria, context);
    this.equipmentCache.set(cacheKey, compatibleEquipment);
    
    return compatibleEquipment;
  }

  /**
   * Validate equipment compatibility with current mech configuration
   */
  validateEquipmentCompatibility(
    equipment: EquipmentTechVariant,
    context: ConstructionContext
  ): EquipmentCompatibilityResult {
    const cacheKey = `${equipment.id}-${this.generateContextKey(context)}`;
    
    if (this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey)!;
    }

    const compatibility = this.calculateCompatibility(equipment, context);
    this.compatibilityCache.set(cacheKey, compatibility);
    
    return compatibility;
  }

  /**
   * Get available weapons filtered by tech base
   */
  getAvailableWeapons(context: ConstructionContext): EquipmentTechVariant[] {
    return this.getCompatibleEquipment({
      techBase: context.techBase,
      era: context.era,
      techLevel: context.techLevel,
      tonnage: context.mechTonnage,
      category: 'Weapons'
    }, context);
  }

  /**
   * Get available electronics/equipment filtered by tech base
   */
  getAvailableElectronics(context: ConstructionContext): EquipmentTechVariant[] {
    return this.getCompatibleEquipment({
      techBase: context.techBase,
      era: context.era,
      techLevel: context.techLevel,
      tonnage: context.mechTonnage,
      category: 'Electronics'
    }, context);
  }

  /**
   * Get available special equipment filtered by tech base
   */
  getAvailableSpecialEquipment(context: ConstructionContext): EquipmentTechVariant[] {
    return this.getCompatibleEquipment({
      techBase: context.techBase,
      era: context.era,
      techLevel: context.techLevel,
      tonnage: context.mechTonnage,
      category: 'Special'
    }, context);
  }

  /**
   * Calculate equipment upgrade options (IS to Clan, etc.)
   */
  getEquipmentUpgradeOptions(
    currentEquipment: EquipmentTechVariant,
    targetTechBase: TechBase,
    context: ConstructionContext
  ): EquipmentTechVariant[] {
    // Find equivalent equipment in target tech base
    const upgrades: EquipmentTechVariant[] = [];
    
    // Logic to find equivalent equipment with different tech bases
    const potentialUpgrades = this.findEquipmentByBaseName(currentEquipment.name);
    
    potentialUpgrades.forEach(upgrade => {
      if (this.isTechBaseCompatible(upgrade.techBase, targetTechBase)) {
        const compatibility = this.validateEquipmentCompatibility(upgrade, context);
        if (compatibility.isCompatible) {
          upgrades.push(upgrade);
        }
      }
    });

    return upgrades;
  }

  /**
   * Calculate battle value modifications for mixed tech equipment
   */
  calculateMixedTechModifiers(
    equipment: EquipmentTechVariant[],
    context: ConstructionContext
  ): {
    battleValueMultiplier: number;
    costMultiplier: number;
    restrictions: string[];
  } {
    if (!context.techBase.includes('Mixed')) {
      return {
        battleValueMultiplier: 1.0,
        costMultiplier: 1.0,
        restrictions: []
      };
    }

    const chassisTechBase = context.techBase.includes('IS') ? 'Inner Sphere' : 'Clan';
    const mixedTechCount = equipment.filter(eq => eq.techBase !== chassisTechBase && eq.techBase !== 'Both').length;
    const totalEquipmentCount = equipment.length;
    
    const mixedTechPercentage = mixedTechCount / totalEquipmentCount;
    
    // Calculate penalties based on mixed tech percentage
    let battleValueMultiplier = 1.0;
    let costMultiplier = 1.0;
    const restrictions: string[] = [];

    if (mixedTechPercentage > 0) {
      battleValueMultiplier = 1.0 + (mixedTechPercentage * 0.25); // 25% penalty per mixed tech item
      costMultiplier = 1.0 + (mixedTechPercentage * 0.5); // 50% cost penalty per mixed tech item
      restrictions.push('Mixed technology requires specialized maintenance');
      restrictions.push('Mixed technology may be difficult to repair in the field');
    }

    if (mixedTechPercentage > 0.5) {
      restrictions.push('High mixed tech percentage may cause reliability issues');
    }

    return {
      battleValueMultiplier: Math.min(battleValueMultiplier, 2.0), // Cap at 100% penalty
      costMultiplier: Math.min(costMultiplier, 3.0), // Cap at 200% penalty
      restrictions
    };
  }

  /**
   * Clear caches (useful for testing or configuration changes)
   */
  clearCaches(): void {
    this.equipmentCache.clear();
    this.compatibilityCache.clear();
  }

  private filterEquipmentByCompatibility(
    criteria: EquipmentFilterCriteria,
    context: ConstructionContext
  ): EquipmentTechVariant[] {
    // This would integrate with the actual equipment database
    // For now, return mock data that demonstrates the filtering logic
    
    const mockEquipment = this.getMockEquipmentDatabase();
    
    return mockEquipment.filter(equipment => {
      // Tech base compatibility
      if (!this.isTechBaseCompatible(equipment.techBase, criteria.techBase)) {
        return false;
      }

      // Era availability
      const eraYear = this.parseEraYear(criteria.era);
      if (equipment.introductionYear > eraYear) {
        return false;
      }
      if (equipment.extinctionYear && equipment.extinctionYear < eraYear) {
        return false;
      }

      // Category filter
      if (criteria.category && !this.equipmentMatchesCategory(equipment, criteria.category)) {
        return false;
      }

      // Additional compatibility checks
      const compatibility = this.calculateCompatibility(equipment, context);
      return compatibility.isCompatible;
    });
  }

  private calculateCompatibility(
    equipment: EquipmentTechVariant,
    context: ConstructionContext
  ): EquipmentCompatibilityResult {
    const result: EquipmentCompatibilityResult = {
      isCompatible: true,
      issues: [],
      warnings: [],
      recommendations: []
    };

    // Tech base compatibility
    if (!this.isTechBaseCompatible(equipment.techBase, context.techBase)) {
      result.isCompatible = false;
      result.issues.push(`${equipment.name} (${equipment.techBase}) incompatible with ${context.techBase} chassis`);
    }

    // Era availability
    const eraYear = this.parseEraYear(context.era);
    if (equipment.introductionYear > eraYear) {
      result.isCompatible = false;
      result.issues.push(`${equipment.name} not available until ${equipment.introductionYear} (current era: ${context.era})`);
    }

    // Weight and tonnage restrictions
    if (equipment.weight > context.mechTonnage * 0.2) { // No single item should exceed 20% of mech weight
      result.warnings.push(`${equipment.name} is very heavy for a ${context.mechTonnage}-ton mech`);
    }

    // Mixed tech warnings
    if (context.techBase.includes('Mixed') && equipment.techBase !== 'Both') {
      const chassisTechBase = context.techBase.includes('IS') ? 'Inner Sphere' : 'Clan';
      if (equipment.techBase !== chassisTechBase) {
        result.warnings.push(`Mixed tech equipment will incur Battle Value and cost penalties`);
      }
    }

    // Special restrictions
    equipment.restrictions.forEach(restriction => {
      if (this.checkRestriction(restriction, context)) {
        result.issues.push(`${equipment.name}: ${restriction}`);
        result.isCompatible = false;
      }
    });

    return result;
  }

  private isTechBaseCompatible(equipmentTechBase: TechBase | 'Both', chassisTechBase: TechBase): boolean {
    if (equipmentTechBase === 'Both') return true;
    
    const compatibilityRules = {
      'Inner Sphere': ['Inner Sphere', 'Mixed (IS Chassis)'],
      'Clan': ['Clan', 'Mixed (Clan Chassis)']
    };

    return compatibilityRules[equipmentTechBase as keyof typeof compatibilityRules]?.includes(chassisTechBase) || false;
  }

  private parseEraYear(era: string): number {
    const eraYearMap: { [key: string]: number } = {
      'Succession Wars': 3025,
      'Clan Invasion': 3050,
      'FedCom Civil War': 3057,
      'Jihad': 3067,
      'Dark Age': 3135
    };

    const numericYear = parseInt(era);
    if (!isNaN(numericYear)) return numericYear;

    return eraYearMap[era] || 3025;
  }

  private equipmentMatchesCategory(equipment: EquipmentTechVariant, category: string): boolean {
    // This would use actual equipment categorization logic
    // For now, use simple name-based matching
    const categoryKeywords = {
      'Weapons': ['Laser', 'AC/', 'LRM', 'SRM', 'Gauss', 'PPC'],
      'Electronics': ['C3', 'ECM', 'BAP', 'TAG', 'NARC'],
      'Special': ['CASE', 'AMS', 'Jump Jet', 'Heat Sink']
    };

    const keywords = categoryKeywords[category as keyof typeof categoryKeywords] || [];
    return keywords.some(keyword => equipment.name.includes(keyword));
  }

  private checkRestriction(restriction: string, context: ConstructionContext): boolean {
    // Check specific equipment restrictions against context
    // This is a simplified implementation
    return false; // Most restrictions don't apply in this mock
  }

  private findEquipmentByBaseName(baseName: string): EquipmentTechVariant[] {
    // Find all tech variants of the same base equipment
    const mockEquipment = this.getMockEquipmentDatabase();
    const baseNameNormalized = baseName.replace(/\s*\([^)]*\)/, ''); // Remove tech base suffixes
    
    return mockEquipment.filter(eq => 
      eq.name.replace(/\s*\([^)]*\)/, '') === baseNameNormalized
    );
  }

  private generateEquipmentCacheKey(criteria: EquipmentFilterCriteria, context: ConstructionContext): string {
    return `${criteria.techBase}-${criteria.era}-${criteria.techLevel}-${criteria.tonnage}-${criteria.category || 'all'}`;
  }

  private generateContextKey(context: ConstructionContext): string {
    return `${context.techBase}-${context.era}-${context.techLevel}-${context.mechTonnage}`;
  }

  private getMockEquipmentDatabase(): EquipmentTechVariant[] {
    // Mock equipment database for demonstration
    // In real implementation, this would query the actual equipment database
    return [
      {
        id: 'large_laser_is',
        baseEquipmentId: 'large_laser',
        name: 'Large Laser (IS)',
        techBase: 'Inner Sphere',
        weight: 5.0,
        criticalSlots: 2,
        cost: 100000,
        performanceModifiers: {
          damage: 8,
          heat: 8,
          range: { short: 5, medium: 10, long: 15 }
        },
        restrictions: [],
        introductionYear: 2470
      },
      {
        id: 'large_laser_clan',
        baseEquipmentId: 'large_laser',
        name: 'Large Laser (Clan)',
        techBase: 'Clan',
        weight: 4.0,
        criticalSlots: 1,
        cost: 100000,
        performanceModifiers: {
          damage: 8,
          heat: 8,
          range: { short: 7, medium: 14, long: 21 }
        },
        restrictions: [],
        introductionYear: 2824
      },
      {
        id: 'ac5_is',
        baseEquipmentId: 'ac5',
        name: 'AC/5 (IS)',
        techBase: 'Inner Sphere',
        weight: 8.0,
        criticalSlots: 4,
        cost: 125000,
        performanceModifiers: {
          damage: 5,
          heat: 1,
          range: { short: 6, medium: 12, long: 18 }
        },
        restrictions: [],
        introductionYear: 2250
      },
      {
        id: 'ac5_clan',
        baseEquipmentId: 'ac5',
        name: 'AC/5 (Clan)',
        techBase: 'Clan',
        weight: 7.0,
        criticalSlots: 3,
        cost: 125000,
        performanceModifiers: {
          damage: 5,
          heat: 1,
          range: { short: 7, medium: 14, long: 21 }
        },
        restrictions: [],
        introductionYear: 2824
      }
    ];
  }
}
