/**
 * WeightBalanceAnalysisService - Focused service for weight balance and stability analysis
 * 
 * Extracted from WeightBalanceService to handle balance analysis and center of gravity calculations
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { IEquipmentInstance } from '../../types/core/UnitInterfaces';

export interface WeightDistribution {
  frontHeavy: boolean;
  rearHeavy: boolean;
  leftHeavy: boolean;
  rightHeavy: boolean;
  distribution: {
    head: number;
    centerTorso: number;
    leftTorso: number;
    rightTorso: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  balance: {
    frontToRear: number;
    leftToRight: number;
  };
}

export interface CenterOfGravity {
  x: number; // Left (-) to Right (+)
  y: number; // Front (-) to Rear (+)
  z: number; // Bottom (-) to Top (+)
  stability: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unstable';
  recommendations: string[];
}

export interface StabilityAnalysis {
  overallStability: number; // 0-100 score
  balanceScore: number;
  weightDistributionScore: number;
  structuralIntegrityScore: number;
  recommendations: string[];
  warnings: string[];
}

export interface WeightBalanceAnalysisService {
  analyzeWeightDistribution(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightDistribution;
  calculateCenterOfGravity(config: UnitConfiguration, equipment: IEquipmentInstance[]): CenterOfGravity;
  analyzeStability(config: UnitConfiguration, equipment: IEquipmentInstance[]): StabilityAnalysis;
}

export class WeightBalanceAnalysisServiceImpl implements WeightBalanceAnalysisService {
  
  analyzeWeightDistribution(config: UnitConfiguration, equipment: IEquipmentInstance[]): WeightDistribution {
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
  
  calculateCenterOfGravity(config: UnitConfiguration, equipment: IEquipmentInstance[]): CenterOfGravity {
    const distribution = this.calculateLocationWeights(config, equipment);
    const totalWeight = Object.values(distribution).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) {
      return {
        x: 0, y: 0, z: 0,
        stability: 'unstable',
        recommendations: ['Add weight to stabilize unit']
      };
    }
    
    // Calculate weighted center positions (simplified model)
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
  
  analyzeStability(config: UnitConfiguration, equipment: IEquipmentInstance[]): StabilityAnalysis {
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
  
  // ===== PRIVATE HELPER METHODS =====
  
  private calculateLocationWeights(config: UnitConfiguration, equipment: IEquipmentInstance[]) {
    // Simplified location weight calculation
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
    
    // Add equipment weights to locations
    // This is simplified - in reality we'd need to track equipment locations
    return baseWeights;
  }
  
  private calculateStabilityRating(x: number, y: number, z: number): CenterOfGravity['stability'] {
    const deviation = Math.sqrt(x * x + y * y + z * z);
    
    if (deviation < 0.1) return 'excellent';
    if (deviation < 0.2) return 'good';
    if (deviation < 0.4) return 'acceptable';
    if (deviation < 0.6) return 'poor';
    return 'unstable';
  }
  
  private generateStabilityRecommendations(x: number, y: number, z: number): string[] {
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
    
    return recommendations;
  }
  
  private calculateBalanceScore(distribution: WeightDistribution): number {
    let score = 100;
    
    if (distribution.frontHeavy || distribution.rearHeavy) score -= 15;
    if (distribution.leftHeavy || distribution.rightHeavy) score -= 10;
    
    return Math.max(0, score);
  }
  
  private calculateWeightDistributionScore(distribution: WeightDistribution): number {
    const totalWeight = Object.values(distribution.distribution).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;
    
    // Check for reasonable distribution
    let score = 100;
    
    // Center torso should carry significant weight
    const ctRatio = distribution.distribution.centerTorso / totalWeight;
    if (ctRatio < 0.2) score -= 20; // Too little weight in center
    if (ctRatio > 0.4) score -= 10; // Too much weight in center
    
    return Math.max(0, score);
  }
  
  private calculateStructuralIntegrityScore(config: UnitConfiguration): number {
    let score = 100;
    
    // Check for structural vulnerabilities
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 75) score -= 15;
    
    // Check engine vulnerability
    if (config.engineType === 'XL' || config.engineType === 'XXL') score -= 10;
    
    return Math.max(0, score);
  }
  
  private generateStabilityWarnings(distribution: WeightDistribution, stability: number): string[] {
    const warnings: string[] = [];
    
    if (stability < 50) {
      warnings.push('Poor overall stability - unit may be prone to falling');
    }
    
    if (distribution.frontHeavy) {
      warnings.push('Front-heavy design may affect movement');
    }
    
    if (distribution.rearHeavy) {
      warnings.push('Rear-heavy design may affect turning');
    }
    
    return warnings;
  }
  
  private extractComponentType(component: any): string {
    if (typeof component === 'string') return component;
    if (component && typeof component === 'object') {
      return component.type || component.name || 'Standard';
    }
    return 'Standard';
  }
}

export const createWeightBalanceAnalysisService = (): WeightBalanceAnalysisService => {
  return new WeightBalanceAnalysisServiceImpl();
};




