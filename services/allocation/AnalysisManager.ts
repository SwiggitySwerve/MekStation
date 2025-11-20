/**
 * Analysis Manager
 * Handles efficiency analysis, loadout reports, heat/firepower calculations, and optimization
 * Extracted from EquipmentAllocationService.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentPlacement } from '../../types/core/EquipmentPlacement';

export interface OptimizationResult {
  improved: boolean;
  originalScore: number;
  optimizedScore: number;
  improvements: Improvement[];
  newAllocations: EquipmentPlacement[];
  summary: string;
}

export interface Improvement {
  type: 'balance' | 'efficiency' | 'protection' | 'heat' | 'firepower';
  description: string;
  benefit: string;
  tradeoff?: string;
}

export interface EfficiencyAnalysis {
  overallScore: number; // 0-100
  categories: {
    placement: number;
    balance: number;
    protection: number;
    heat: number;
    firepower: number;
  };
  bottlenecks: string[];
  recommendations: EfficiencyRecommendation[];
}

export interface EfficiencyRecommendation {
  category: string;
  issue: string;
  suggestion: string;
  expectedImprovement: number;
  difficulty: 'easy' | 'moderate' | 'hard';
}

export interface LoadoutReport {
  summary: {
    totalEquipment: number;
    totalWeight: number;
    distribution: { [location: string]: number };
    efficiency: number;
  };
  weapons: WeaponSummary;
  ammunition: AmmoSummary;
  heatManagement: HeatSummary;
  protection: ProtectionSummary;
  recommendations: string[];
}

export interface WeaponSummary {
  count: number;
  totalWeight: number;
  firepower: {
    short: number;
    medium: number;
    long: number;
  };
  heatGeneration: number;
  distribution: { [location: string]: number };
  analysis: string[];
}

export interface AmmoSummary {
  totalTons: number;
  distribution: { [location: string]: number };
  caseProtected: number;
  vulnerableLocations: string[];
  ammoBalance: { weapon: string; tons: number; adequate: boolean }[];
  recommendations: string[];
}

export interface HeatSummary {
  generation: number;
  dissipation: number;
  efficiency: number;
  bottlenecks: string[];
  heatSinkDistribution: { [location: string]: number };
  recommendations: string[];
}

export interface ProtectionSummary {
  criticalEquipment: string[];
  vulnerableLocations: string[];
  protectionScore: number;
  caseRecommendations: string[];
  redundancy: { equipment: string; count: number; adequate: boolean }[];
}

export interface HeatAnalysis {
  totalGeneration: number;
  byLocation: { [location: string]: number };
  continuousGeneration: number;
  alphaStrikeGeneration: number;
  heatScale: {
    low: number;
    medium: number;
    high: number;
  };
  recommendations: string[];
}

export interface FirepowerAnalysis {
  totalDamage: {
    short: number;
    medium: number;
    long: number;
  };
  byLocation: {
    [location: string]: {
      short: number;
      medium: number;
      long: number;
    };
  };
  weaponTypes: {
    energy: number;
    ballistic: number;
    missile: number;
  };
  alphaStrike: number;
  sustainedFire: number;
  recommendations: string[];
}

export interface EquipmentSummary {
  totalItems: number;
  totalWeight: number;
  categories: {
    weapons: number;
    ammunition: number;
    heatSinks: number;
    jumpJets: number;
    equipment: number;
  };
  distribution: { [location: string]: number };
  technicalSummary: string[];
}

export class AnalysisManager {
  /**
   * Optimize equipment layout for better efficiency
   */
  optimizeEquipmentLayout(config: UnitConfiguration, allocations: EquipmentPlacement[]): OptimizationResult {
    const originalScore = this.calculateLayoutScore(allocations, config);
    const optimizedAllocations = this.optimizeAllocations(allocations, config);
    const optimizedScore = this.calculateLayoutScore(optimizedAllocations, config);
    
    const improvements: Improvement[] = [];
    if (optimizedScore > originalScore) {
      improvements.push({
        type: 'efficiency',
        description: 'Improved overall layout efficiency',
        benefit: `Score increased from ${originalScore} to ${optimizedScore}`,
        tradeoff: 'May require equipment movement'
      });
    }
    
    return {
      improved: optimizedScore > originalScore,
      originalScore,
      optimizedScore,
      improvements,
      newAllocations: optimizedAllocations,
      summary: `Layout optimization ${optimizedScore > originalScore ? 'improved' : 'maintained'} efficiency`
    };
  }
  
  /**
   * Analyze loadout efficiency across multiple categories
   */
  analyzeLoadoutEfficiency(config: UnitConfiguration, allocations: EquipmentPlacement[]): EfficiencyAnalysis {
    const placement = this.analyzePlacementEfficiency(allocations, config);
    const balance = this.analyzeLoadoutBalance(allocations, config);
    const protection = this.analyzeProtectionEfficiency(allocations, config);
    const heat = this.analyzeHeatEfficiency(allocations, config);
    const firepower = this.analyzeFirepowerEfficiency(allocations, config);
    
    const overallScore = Math.round((placement + balance + protection + heat + firepower) / 5);
    
    const bottlenecks: string[] = [];
    if (placement < 50) bottlenecks.push('Poor equipment placement');
    if (balance < 50) bottlenecks.push('Unbalanced loadout');
    if (protection < 50) bottlenecks.push('Inadequate protection');
    if (heat < 50) bottlenecks.push('Heat management issues');
    if (firepower < 50) bottlenecks.push('Insufficient firepower');
    
    const recommendations: EfficiencyRecommendation[] = [];
    if (placement < 70) {
      recommendations.push({
        category: 'placement',
        issue: 'Suboptimal equipment placement',
        suggestion: 'Reorganize equipment for better slot utilization',
        expectedImprovement: 15,
        difficulty: 'moderate'
      });
    }
    
    return {
      overallScore,
      categories: { placement, balance, protection, heat, firepower },
      bottlenecks,
      recommendations
    };
  }
  
  /**
   * Generate comprehensive loadout report
   */
  generateLoadoutReport(config: UnitConfiguration, allocations: EquipmentPlacement[]): LoadoutReport {
    const summary = this.generateLoadoutSummary(allocations);
    const weapons = this.generateWeaponSummary(allocations);
    const ammunition = this.generateAmmoSummary(allocations);
    const heatManagement = this.generateHeatSummary(allocations);
    const protection = this.generateProtectionSummary(allocations);
    
    const recommendations: string[] = [];
    if (weapons.heatGeneration > 20) {
      recommendations.push('Consider heat sink upgrades for high heat generation');
    }
    if (ammunition.caseProtected < ammunition.totalTons * 0.5) {
      recommendations.push('Add CASE protection for explosive ammunition');
    }
    
    return {
      summary,
      weapons,
      ammunition,
      heatManagement,
      protection,
      recommendations
    };
  }
  
  /**
   * Calculate heat generation analysis
   */
  calculateHeatGeneration(allocations: EquipmentPlacement[]): HeatAnalysis {
    const totalGeneration = allocations.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    const byLocation: { [location: string]: number } = {};
    allocations.forEach(placement => {
      const location = placement.location;
      byLocation[location] = (byLocation[location] || 0) + (placement.equipment.equipmentData?.heat || 0);
    });
    
    const continuousGeneration = totalGeneration * 0.7; // Simplified
    const alphaStrikeGeneration = totalGeneration;
    
    const heatScale = {
      low: totalGeneration < 10 ? totalGeneration : 0,
      medium: totalGeneration >= 10 && totalGeneration < 20 ? totalGeneration : 0,
      high: totalGeneration >= 20 ? totalGeneration : 0
    };
    
    const recommendations: string[] = [];
    if (totalGeneration > 20) {
      recommendations.push('High heat generation - consider heat sink upgrades');
    }
    
    return {
      totalGeneration,
      byLocation,
      continuousGeneration,
      alphaStrikeGeneration,
      heatScale,
      recommendations
    };
  }
  
  /**
   * Calculate firepower analysis
   */
  calculateFirepower(allocations: EquipmentPlacement[]): FirepowerAnalysis {
    const totalDamage = { short: 0, medium: 0, long: 0 };
    const byLocation: { [location: string]: { short: number; medium: number; long: number } } = {};
    const weaponTypes = { energy: 0, ballistic: 0, missile: 0 };
    
    allocations.forEach(placement => {
      const weapon = placement.equipment.equipmentData;
      if (weapon?.type?.includes('weapon')) {
        const damage = typeof weapon.damage === 'number' ? weapon.damage : (typeof weapon.damage === 'string' ? parseFloat(weapon.damage) || 0 : 0);
        const type = weapon.type || 'energy';
        // Default to medium range if not specified
        const range: 'short' | 'medium' | 'long' = 'medium';
        
        // Add to total damage
        switch (range) {
          case 'short':
            totalDamage.short += damage;
            break;
          case 'medium':
            totalDamage.medium += damage;
            break;
          case 'long':
            totalDamage.long += damage;
            break;
        }
        
        // Add to location damage
        if (!byLocation[placement.location]) {
          byLocation[placement.location] = { short: 0, medium: 0, long: 0 };
        }
        switch (range) {
          case 'short':
            byLocation[placement.location].short += damage;
            break;
          case 'medium':
            byLocation[placement.location].medium += damage;
            break;
          case 'long':
            byLocation[placement.location].long += damage;
            break;
        }
        
        // Add to weapon types
        if (type.includes('energy')) weaponTypes.energy += damage;
        else if (type.includes('ballistic')) weaponTypes.ballistic += damage;
        else if (type.includes('missile')) weaponTypes.missile += damage;
      }
    });
    
    const alphaStrike = totalDamage.short + totalDamage.medium + totalDamage.long;
    const sustainedFire = alphaStrike * 0.8; // Simplified
    
    const recommendations: string[] = [];
    if (totalDamage.short < totalDamage.medium * 0.5) {
      recommendations.push('Consider adding short-range weapons for close combat');
    }
    
    return {
      totalDamage,
      byLocation,
      weaponTypes,
      alphaStrike,
      sustainedFire,
      recommendations
    };
  }
  
  /**
   * Generate equipment summary
   */
  generateEquipmentSummary(allocations: EquipmentPlacement[]): EquipmentSummary {
    const totalItems = allocations.length;
    const totalWeight = allocations.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.weight || 0);
    }, 0);
    
    const categories = {
      weapons: allocations.filter(p => p.equipment.equipmentData?.type?.includes('weapon')).length,
      ammunition: allocations.filter(p => p.equipment.equipmentData?.type === 'ammunition').length,
      heatSinks: allocations.filter(p => p.equipment.equipmentData?.type === 'heat_sink').length,
      jumpJets: allocations.filter(p => p.equipment.equipmentData?.type === 'jump_jet').length,
      equipment: allocations.filter(p => !p.equipment.equipmentData?.type?.includes('weapon') && 
                                       p.equipment.equipmentData?.type !== 'ammunition' &&
                                       p.equipment.equipmentData?.type !== 'heat_sink' &&
                                       p.equipment.equipmentData?.type !== 'jump_jet').length
    };
    
    const distribution: { [location: string]: number } = {};
    allocations.forEach(placement => {
      distribution[placement.location] = (distribution[placement.location] || 0) + 1;
    });
    
    const technicalSummary = [
      `Total equipment: ${totalItems}`,
      `Total weight: ${totalWeight.toFixed(1)} tons`,
      `Weapons: ${categories.weapons}`,
      `Heat sinks: ${categories.heatSinks}`
    ];
    
    return {
      totalItems,
      totalWeight,
      categories,
      distribution,
      technicalSummary
    };
  }
  
  /**
   * Calculate layout score
   */
  private calculateLayoutScore(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    // Simplified scoring based on placement efficiency
    const placementEfficiency = this.analyzePlacementEfficiency(allocations, config);
    const balanceEfficiency = this.analyzeLoadoutBalance(allocations, config);
    return Math.round((placementEfficiency + balanceEfficiency) / 2);
  }
  
  /**
   * Optimize allocations
   */
  private optimizeAllocations(allocations: EquipmentPlacement[], config: UnitConfiguration): EquipmentPlacement[] {
    // Simplified optimization - return current allocations
    // In a real implementation, this would try different arrangements
    return [...allocations];
  }
  
  /**
   * Analyze placement efficiency
   */
  private analyzePlacementEfficiency(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    // Simplified efficiency calculation
    const totalSlots = allocations.reduce((sum, placement) => sum + placement.slots.length, 0);
    const maxSlots = 78; // Standard bipedal mech
    return Math.min(100, Math.round((totalSlots / maxSlots) * 100));
  }
  
  /**
   * Analyze loadout balance
   */
  private analyzeLoadoutBalance(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    // Simplified balance calculation
    const leftSide = allocations.filter(p => p.location.includes('left')).length;
    const rightSide = allocations.filter(p => p.location.includes('right')).length;
    const balance = Math.abs(leftSide - rightSide);
    return Math.max(0, 100 - balance * 10);
  }
  
  /**
   * Analyze protection efficiency
   */
  private analyzeProtectionEfficiency(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    // Simplified protection calculation
    const criticalEquipment = allocations.filter(p => 
      p.equipment.equipmentData?.explosive || p.equipment.equipmentData?.type?.includes('weapon')
    ).length;
    return Math.min(100, Math.round((criticalEquipment / 10) * 100));
  }
  
  /**
   * Analyze heat efficiency
   */
  private analyzeHeatEfficiency(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    const heatGeneration = allocations.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    const heatSinks = allocations.filter(p => p.equipment.equipmentData?.type === 'heat_sink').length;
    const engineHeatSinks = Math.floor((config.engineRating || 0) / 25);
    const totalHeatSinks = engineHeatSinks + heatSinks;
    
    if (heatGeneration <= totalHeatSinks) return 100;
    return Math.max(0, 100 - (heatGeneration - totalHeatSinks) * 5);
  }
  
  /**
   * Analyze firepower efficiency
   */
  private analyzeFirepowerEfficiency(allocations: EquipmentPlacement[], config: UnitConfiguration): number {
    const weapons = allocations.filter(p => p.equipment.equipmentData?.type?.includes('weapon'));
    const totalDamage = weapons.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.damage || 0);
    }, 0);
    
    // Simplified efficiency based on damage per weapon
    return Math.min(100, Math.round(totalDamage / weapons.length * 10));
  }
  
  /**
   * Generate loadout summary
   */
  private generateLoadoutSummary(allocations: EquipmentPlacement[]) {
    const totalEquipment = allocations.length;
    const totalWeight = allocations.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.weight || 0);
    }, 0);
    
    const distribution: { [location: string]: number } = {};
    allocations.forEach(placement => {
      distribution[placement.location] = (distribution[placement.location] || 0) + 1;
    });
    
    const efficiency = this.analyzePlacementEfficiency(allocations, {} as UnitConfiguration);
    
    return {
      totalEquipment,
      totalWeight,
      distribution,
      efficiency
    };
  }
  
  /**
   * Generate weapon summary
   */
  private generateWeaponSummary(allocations: EquipmentPlacement[]): WeaponSummary {
    const weapons = allocations.filter(p => p.equipment.equipmentData?.type?.includes('weapon'));
    const totalWeight = weapons.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.weight || 0);
    }, 0);
    
    const firepower = { short: 0, medium: 0, long: 0 };
    const heatGeneration = weapons.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    const distribution: { [location: string]: number } = {};
    weapons.forEach(placement => {
      distribution[placement.location] = (distribution[placement.location] || 0) + 1;
    });
    
    return {
      count: weapons.length,
      totalWeight,
      firepower,
      heatGeneration,
      distribution,
      analysis: [`${weapons.length} weapons generating ${heatGeneration} heat`]
    };
  }
  
  /**
   * Generate ammo summary
   */
  private generateAmmoSummary(allocations: EquipmentPlacement[]): AmmoSummary {
    const ammo = allocations.filter(p => p.equipment.equipmentData?.type === 'ammunition');
    const totalTons = ammo.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.weight || 0);
    }, 0);
    
    const distribution: { [location: string]: number } = {};
    ammo.forEach(placement => {
      distribution[placement.location] = (distribution[placement.location] || 0) + 1;
    });
    
    const caseProtected = ammo.filter(p => 
      p.equipment.equipmentData?.explosive && 
      ['leftTorso', 'rightTorso'].includes(p.location)
    ).length;
    
    const vulnerableLocations = ammo.filter(p => 
      p.equipment.equipmentData?.explosive && 
      !['leftTorso', 'rightTorso'].includes(p.location)
    ).map(p => p.location);
    
    return {
      totalTons,
      distribution,
      caseProtected,
      vulnerableLocations,
      ammoBalance: ammo.map(placement => ({
        weapon: placement.equipment.equipmentData?.weapon || 'Unknown',
        tons: placement.equipment.equipmentData?.tonnage || 0,
        adequate: true
      })),
      recommendations: vulnerableLocations.length > 0 ? ['Add CASE protection'] : []
    };
  }
  
  /**
   * Generate heat summary
   */
  private generateHeatSummary(allocations: EquipmentPlacement[]): HeatSummary {
    const generation = allocations.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    const heatSinks = allocations.filter(p => p.equipment.equipmentData?.type === 'heat_sink');
    const dissipation = heatSinks.length + 10; // Simplified engine heat sinks
    
    const efficiency = Math.min(100, Math.round((dissipation / generation) * 100));
    
    const heatSinkDistribution: { [location: string]: number } = {};
    heatSinks.forEach(placement => {
      heatSinkDistribution[placement.location] = (heatSinkDistribution[placement.location] || 0) + 1;
    });
    
    return {
      generation,
      dissipation,
      efficiency,
      bottlenecks: generation > dissipation ? ['Insufficient heat dissipation'] : [],
      heatSinkDistribution,
      recommendations: generation > dissipation ? ['Add more heat sinks'] : []
    };
  }
  
  /**
   * Generate protection summary
   */
  private generateProtectionSummary(allocations: EquipmentPlacement[]): ProtectionSummary {
    const criticalEquipment = allocations.filter(p => 
      p.equipment.equipmentData?.explosive || p.equipment.equipmentData?.type?.includes('weapon')
    ).map(p => p.equipment.equipmentData?.name || 'Unknown');
    
    const vulnerableLocations = allocations.filter(p => 
      p.equipment.equipmentData?.explosive && 
      !['leftTorso', 'rightTorso'].includes(p.location)
    ).map(p => p.location);
    
    const protectionScore = Math.max(0, 100 - vulnerableLocations.length * 20);
    
    return {
      criticalEquipment,
      vulnerableLocations,
      protectionScore,
      caseRecommendations: vulnerableLocations.length > 0 ? ['Add CASE to vulnerable locations'] : [],
      redundancy: []
    };
  }
} 




