/**
 * Balance Analysis Service - Weight distribution and stability analysis
 * 
 * Handles weight distribution calculations, center of gravity analysis, and stability metrics
 * for BattleMech construction and validation.
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { 
  WeightDistribution, 
  CenterOfGravity, 
  StabilityAnalysis, 
  Equipment,
  LocationWeights
} from './types';

export class BalanceAnalysisService {
  
  /**
   * Analyze weight distribution across mech locations
   */
  static analyzeWeightDistribution(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): WeightDistribution {
    const distribution = this.calculateLocationWeights(config, equipment);
    
    // Calculate balance ratios
    const frontWeight = distribution.head + distribution.centerTorso * 0.6 + 
                       distribution.leftArm * 0.5 + distribution.rightArm * 0.5;
    const rearWeight = distribution.centerTorso * 0.4 + distribution.leftTorso + 
                      distribution.rightTorso + distribution.leftLeg + distribution.rightLeg;
    const leftWeight = distribution.leftTorso + distribution.leftArm + distribution.leftLeg;
    const rightWeight = distribution.rightTorso + distribution.rightArm + distribution.rightLeg;
    
    const totalWeight = frontWeight + rearWeight;
    const frontToRear = totalWeight > 0 ? (frontWeight - rearWeight) / totalWeight : 0;
    const leftToRight = totalWeight > 0 ? (leftWeight - rightWeight) / totalWeight : 0;
    
    return {
      frontHeavy: frontToRear > 0.15,
      rearHeavy: frontToRear < -0.15,
      leftHeavy: leftToRight > 0.1,
      rightHeavy: leftToRight < -0.1,
      distribution,
      balance: {
        frontToRear,
        leftToRight
      }
    };
  }
  
  /**
   * Calculate center of gravity for the unit
   */
  static calculateCenterOfGravity(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): CenterOfGravity {
    const distribution = this.calculateLocationWeights(config, equipment);
    const totalWeight = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      return {
        x: 0, y: 0, z: 0,
        stability: 'unstable',
        recommendations: ['Add weight to stabilize unit']
      };
    }
    
    // Calculate weighted center positions (simplified 3D model)
    const x = (distribution.rightTorso + distribution.rightArm + distribution.rightLeg - 
              distribution.leftTorso - distribution.leftArm - distribution.leftLeg) / totalWeight;
    const y = (distribution.centerTorso * 0.2 + distribution.head * 0.5 - 
              distribution.leftTorso * 0.3 - distribution.rightTorso * 0.3 - 
              distribution.leftLeg * 0.8 - distribution.rightLeg * 0.8) / totalWeight;
    const z = (distribution.head * 0.9 + distribution.centerTorso * 0.6 + 
              distribution.leftTorso * 0.6 + distribution.rightTorso * 0.6 +
              distribution.leftArm * 0.4 + distribution.rightArm * 0.4) / totalWeight;
    
    const stability = this.calculateStabilityRating(x, y, z);
    const recommendations = this.generateStabilityRecommendations(x, y, z);
    
    return { x, y, z, stability, recommendations };
  }
  
  /**
   * Perform comprehensive stability analysis
   */
  static analyzeStability(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): StabilityAnalysis {
    const distribution = this.analyzeWeightDistribution(config, equipment);
    const centerOfGravity = this.calculateCenterOfGravity(config, equipment);
    
    // Calculate stability scores
    const balanceScore = this.calculateBalanceScore(distribution);
    const weightDistributionScore = this.calculateWeightDistributionScore(distribution);
    const structuralIntegrityScore = this.calculateStructuralIntegrityScore(config);
    
    const overallStability = (balanceScore + weightDistributionScore + structuralIntegrityScore) / 3;
    
    const recommendations = this.generateStabilityRecommendations(
      centerOfGravity.x, centerOfGravity.y, centerOfGravity.z
    );
    const warnings = this.generateStabilityWarnings(distribution, overallStability);
    
    return {
      overallStability,
      balanceScore,
      weightDistributionScore,
      structuralIntegrityScore,
      recommendations,
      warnings
    };
  }
  
  /**
   * Check if weight distribution creates instability
   */
  static hasStabilityIssues(config: UnitConfiguration, equipment: Equipment[]): boolean {
    const stability = this.analyzeStability(config, equipment);
    return stability.overallStability < 60 || stability.warnings.length > 2;
  }
  
  /**
   * Get balance optimization suggestions
   */
  static getBalanceOptimizations(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): string[] {
    const suggestions: string[] = [];
    const distribution = this.analyzeWeightDistribution(config, equipment);
    const cog = this.calculateCenterOfGravity(config, equipment);
    
    // Left/Right balance suggestions
    if (distribution.leftHeavy) {
      suggestions.push('Move equipment from left side to right side for better balance');
    } else if (distribution.rightHeavy) {
      suggestions.push('Move equipment from right side to left side for better balance');
    }
    
    // Front/Rear balance suggestions
    if (distribution.frontHeavy) {
      suggestions.push('Move weight from arms/head to torso/legs for stability');
    } else if (distribution.rearHeavy) {
      suggestions.push('Add weight to front sections for better balance');
    }
    
    // Center of gravity suggestions
    if (cog.stability === 'poor' || cog.stability === 'unstable') {
      suggestions.push('Redistribute equipment to lower center of gravity');
    }
    
    return suggestions;
  }
  
  // ===== PRIVATE CALCULATION METHODS =====
  
  /**
   * Calculate weight distribution across all locations
   */
  private static calculateLocationWeights(
    config: UnitConfiguration, 
    equipment: Equipment[]
  ): LocationWeights {
    // Base structural weights (proportional to tonnage)
    const baseWeights = {
      head: config.tonnage * 0.05,
      centerTorso: config.tonnage * 0.25,
      leftTorso: config.tonnage * 0.15,
      rightTorso: config.tonnage * 0.15,
      leftArm: config.tonnage * 0.1,
      rightArm: config.tonnage * 0.1,
      leftLeg: config.tonnage * 0.1,
      rightLeg: config.tonnage * 0.1
    };
    
    // Add equipment weights to appropriate locations
    const equipmentWeights = this.distributeEquipmentWeight(equipment);
    
    return {
      head: baseWeights.head + (equipmentWeights.head || 0),
      centerTorso: baseWeights.centerTorso + (equipmentWeights.centerTorso || 0),
      leftTorso: baseWeights.leftTorso + (equipmentWeights.leftTorso || 0),
      rightTorso: baseWeights.rightTorso + (equipmentWeights.rightTorso || 0),
      leftArm: baseWeights.leftArm + (equipmentWeights.leftArm || 0),
      rightArm: baseWeights.rightArm + (equipmentWeights.rightArm || 0),
      leftLeg: baseWeights.leftLeg + (equipmentWeights.leftLeg || 0),
      rightLeg: baseWeights.rightLeg + (equipmentWeights.rightLeg || 0)
    };
  }
  
  /**
   * Distribute equipment weight based on location
   */
  private static distributeEquipmentWeight(equipment: Equipment[]): Partial<LocationWeights> {
    const weights: Partial<LocationWeights> = {};
    
    equipment.forEach(item => {
      if (!item?.equipmentData?.tonnage) return;
      
      const weight = item.equipmentData.tonnage * (item.quantity || 1);
      const location = item.location || 'centerTorso'; // Default to center torso
      
      const locationKey = this.normalizeLocationName(location);
      weights[locationKey] = (weights[locationKey] || 0) + weight;
    });
    
    return weights;
  }
  
  /**
   * Normalize location names to match our type system
   */
  private static normalizeLocationName(location: string): keyof LocationWeights {
    const normalized = location.toLowerCase();
    
    if (normalized.includes('head')) return 'head';
    if (normalized.includes('center') || normalized.includes('ct')) return 'centerTorso';
    if (normalized.includes('left') && normalized.includes('torso')) return 'leftTorso';
    if (normalized.includes('right') && normalized.includes('torso')) return 'rightTorso';
    if (normalized.includes('left') && normalized.includes('arm')) return 'leftArm';
    if (normalized.includes('right') && normalized.includes('arm')) return 'rightArm';
    if (normalized.includes('left') && normalized.includes('leg')) return 'leftLeg';
    if (normalized.includes('right') && normalized.includes('leg')) return 'rightLeg';
    
    return 'centerTorso'; // Default fallback
  }
  
  /**
   * Calculate stability rating from center of gravity
   */
  private static calculateStabilityRating(x: number, y: number, z: number): CenterOfGravity['stability'] {
    const deviation = Math.sqrt(x * x + y * y + z * z);
    
    if (deviation < 0.1) return 'excellent';
    if (deviation < 0.2) return 'good';
    if (deviation < 0.4) return 'acceptable';
    if (deviation < 0.6) return 'poor';
    return 'unstable';
  }
  
  /**
   * Generate stability recommendations based on COG
   */
  private static generateStabilityRecommendations(x: number, y: number, z: number): string[] {
    const recommendations: string[] = [];
    
    if (Math.abs(x) > 0.2) {
      recommendations.push(x > 0 ? 
        'Move weight from right side to left side' : 
        'Move weight from left side to right side'
      );
    }
    
    if (Math.abs(y) > 0.2) {
      recommendations.push(y > 0 ? 
        'Move weight from rear to front' : 
        'Move weight from front to rear'
      );
    }
    
    if (z > 0.3) {
      recommendations.push('Lower center of gravity by moving equipment to legs/torso');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Weight distribution is well balanced');
    }
    
    return recommendations;
  }
  
  /**
   * Calculate balance score from weight distribution
   */
  private static calculateBalanceScore(distribution: WeightDistribution): number {
    let score = 100;
    
    if (distribution.frontHeavy || distribution.rearHeavy) score -= 15;
    if (distribution.leftHeavy || distribution.rightHeavy) score -= 10;
    
    // Penalty for extreme imbalances
    if (Math.abs(distribution.balance.frontToRear) > 0.3) score -= 20;
    if (Math.abs(distribution.balance.leftToRight) > 0.25) score -= 15;
    
    return Math.max(0, score);
  }
  
  /**
   * Calculate weight distribution score
   */
  private static calculateWeightDistributionScore(distribution: WeightDistribution): number {
    const totalWeight = Object.values(distribution.distribution).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;
    
    let score = 100;
    
    // Center torso should carry significant weight
    const ctRatio = distribution.distribution.centerTorso / totalWeight;
    if (ctRatio < 0.2) score -= 20; // Too little weight in center
    if (ctRatio > 0.4) score -= 10; // Too much weight in center
    
    // Check for empty locations (except head)
    const nonHeadLocations = Object.entries(distribution.distribution)
      .filter(([location]) => location !== 'head');
    
    const emptyLocations = nonHeadLocations.filter(([, weight]) => weight === 0).length;
    if (emptyLocations > 2) score -= emptyLocations * 5;
    
    return Math.max(0, score);
  }
  
  /**
   * Calculate structural integrity score
   */
  private static calculateStructuralIntegrityScore(config: UnitConfiguration): number {
    let score = 100;
    
    // Check for structural vulnerabilities
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 75) score -= 15;
    
    // Check engine vulnerability
    if (config.engineType === 'XL' || config.engineType === 'XXL') score -= 10;
    
    // Check gyro vulnerability
    const gyroType = this.extractComponentType(config.gyroType);
    if (gyroType === 'XL') score -= 5;
    
    return Math.max(0, score);
  }
  
  /**
   * Generate stability warnings
   */
  private static generateStabilityWarnings(
    distribution: WeightDistribution, 
    stability: number
  ): string[] {
    const warnings: string[] = [];
    
    if (stability < 50) {
      warnings.push('Poor overall stability - unit may be prone to falling');
    }
    
    if (distribution.frontHeavy) {
      warnings.push('Front-heavy design may affect movement and turning');
    }
    
    if (distribution.rearHeavy) {
      warnings.push('Rear-heavy design may affect acceleration and stability');
    }
    
    if (distribution.leftHeavy || distribution.rightHeavy) {
      warnings.push('Side-heavy design creates vulnerability to knockdown');
    }
    
    return warnings;
  }
  
  /**
   * Extract component type helper
   */
  private static extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    return component?.type || 'Standard';
  }
}




