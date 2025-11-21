/**
 * SlotValidationManager
 * Handles validation logic and report generation for critical slots.
 * Extracted from CriticalSlotCalculator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from './UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  locationStatus: {
    [location: string]: {
      valid: boolean;
      used: number;
      capacity: number;
      conflicts: string[];
    };
  };
}

export interface ValidationError {
  type: 'slot_overflow' | 'invalid_location' | 'component_conflict' | 'rule_violation';
  location: string;
  component: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationWarning {
  type: 'inefficient_placement' | 'suboptimal_allocation' | 'potential_conflict';
  location: string;
  component: string;
  message: string;
  recommendation: string;
}

export interface EfficiencyAnalysis {
  overallEfficiency: number; // 0-100 score
  locationEfficiency: {
    [location: string]: {
      efficiency: number;
      utilization: number;
      wastedSlots: number;
      suggestions: string[];
    };
  };
  bottlenecks: string[];
  optimizationPotential: number;
  recommendations: string[];
}

export interface SlotReport {
  summary: {
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    utilization: number;
    efficiency: string;
  };
  locationBreakdown: {
    [location: string]: {
      capacity: number;
      used: number;
      available: number;
      equipment: string[];
      specialComponents: string[];
      conflicts: string[];
    };
  };
  specialComponents: any; // SpecialComponentAllocation
  conflicts: any[]; // SlotConflict[]
  recommendations: string[];
}

export interface AvailableSlotLocation {
  location: string;
  availableSlots: number[];
  contiguous: boolean;
  suitableFor: string[];
  restrictions: string[];
}

export class SlotValidationManager {
  private readonly STANDARD_SLOT_COUNTS = {
    head: 6,
    centerTorso: 12,
    leftTorso: 12,
    rightTorso: 12,
    leftArm: 8,
    rightArm: 8,
    leftLeg: 6,
    rightLeg: 6
  };

  /**
   * Extract type string from ComponentConfiguration or return string as-is
   */
  public extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') {
      return component;
    }
    return component.type;
  }

  /**
   * Validate slot allocation
   */
  validateSlotAllocation(config: UnitConfiguration, equipment: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const locationStatus: { [location: string]: any } = {};

    // Validate each location
    Object.entries(this.STANDARD_SLOT_COUNTS).forEach(([location, capacity]) => {
      const usedSlots = this.getUsedSlotsInLocation(equipment, location);
      const conflicts = this.getConflictsInLocation(equipment, location);

      locationStatus[location] = {
        valid: usedSlots <= capacity,
        used: usedSlots,
        capacity,
        conflicts
      };

      if (usedSlots > capacity) {
        errors.push({
          type: 'slot_overflow',
          location,
          component: 'Multiple equipment',
          message: `Location ${location} exceeds capacity: ${usedSlots}/${capacity}`,
          severity: 'high'
        });
      }

      if (usedSlots > capacity * 0.9) {
        warnings.push({
          type: 'inefficient_placement',
          location,
          component: 'Equipment',
          message: `High utilization in ${location}: ${usedSlots}/${capacity}`,
          recommendation: 'Consider redistributing equipment to other locations'
        });
      }
    });

    // Validate BattleTech rules
    this.validateBattleTechRules(config, equipment, errors, warnings);

    const suggestions = this.generateValidationSuggestions(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      locationStatus
    };
  }

  /**
   * Analyze slot efficiency
   */
  analyzeSlotEfficiency(config: UnitConfiguration, equipment: any[]): EfficiencyAnalysis {
    const locationEfficiency: { [location: string]: any } = {};
    const bottlenecks: string[] = [];
    let totalEfficiency = 0;
    let locationCount = 0;

    Object.entries(this.STANDARD_SLOT_COUNTS).forEach(([location, capacity]) => {
      const usedSlots = this.getUsedSlotsInLocation(equipment, location);
      const utilization = (usedSlots / capacity) * 100;
      const wastedSlots = capacity - usedSlots;
      
      let efficiency: number;
      if (utilization <= 70) efficiency = 100;
      else if (utilization <= 85) efficiency = 80;
      else if (utilization <= 95) efficiency = 60;
      else if (utilization <= 100) efficiency = 40;
      else efficiency = 20;

      locationEfficiency[location] = {
        efficiency,
        utilization,
        wastedSlots,
        suggestions: this.generateLocationSuggestions(location, { efficiency, utilization, wastedSlots })
      };

      totalEfficiency += efficiency;
      locationCount++;

      if (utilization > 90) {
        bottlenecks.push(location);
      }
    });

    const overallEfficiency = locationCount > 0 ? totalEfficiency / locationCount : 0;
    const optimizationPotential = this.calculateOptimizationPotential(locationEfficiency);
    const recommendations = this.generateEfficiencyRecommendations(locationEfficiency, overallEfficiency);

    return {
      overallEfficiency,
      locationEfficiency,
      bottlenecks,
      optimizationPotential,
      recommendations
    };
  }

  /**
   * Generate slot report
   */
  generateSlotReport(config: UnitConfiguration, equipment: any[]): SlotReport {
    const totalSlots = Object.values(this.STANDARD_SLOT_COUNTS).reduce((sum, count) => sum + count, 0);
    const usedSlots = equipment.reduce((total, item) => total + (item.requiredSlots || 1), 0);
    const availableSlots = totalSlots - usedSlots;
    const utilization = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;
    const efficiency = this.calculateOverallEfficiency(config, equipment);

    const locationBreakdown: { [location: string]: any } = {};
    Object.entries(this.STANDARD_SLOT_COUNTS).forEach(([location, capacity]) => {
      const used = this.getUsedSlotsInLocation(equipment, location);
      const available = capacity - used;
      const equipmentInLocation = this.getEquipmentInLocation(equipment, location);
      const specialComponents = this.getSpecialComponentsInLocation(config, location);
      const conflicts = this.getConflictsInLocation(equipment, location);

      locationBreakdown[location] = {
        capacity,
        used,
        available,
        equipment: equipmentInLocation,
        specialComponents,
        conflicts
      };
    });

    const specialComponents = this.getAllocatedSpecialComponents(config);
    const conflicts = this.detectAllConflicts(config, equipment);
    const recommendations = this.generateReportRecommendations(
      { totalSlots, usedSlots, availableSlots, utilization, efficiency },
      locationBreakdown,
      conflicts
    );

    return {
      summary: {
        totalSlots,
        usedSlots,
        availableSlots,
        utilization,
        efficiency
      },
      locationBreakdown,
      specialComponents,
      conflicts,
      recommendations
    };
  }

  /**
   * Find available slots
   */
  findAvailableSlots(config: UnitConfiguration, equipment: any[], requiredSlots: number): AvailableSlotLocation[] {
    const availableLocations: AvailableSlotLocation[] = [];

    Object.entries(this.STANDARD_SLOT_COUNTS).forEach(([location, capacity]) => {
      const usedSlots = this.getUsedSlotsInLocation(equipment, location);
      const availableSlots = this.getAvailableSlotNumbers(location, capacity, usedSlots);

      if (availableSlots.length >= requiredSlots) {
        const contiguous = this.hasContiguousSlots(availableSlots, requiredSlots);
        const suitableFor = this.getSuitableEquipmentTypes(location);
        const restrictions = this.getLocationRestrictions(location, config);

        availableLocations.push({
          location,
          availableSlots,
          contiguous,
          suitableFor,
          restrictions
        });
      }
    });

    return availableLocations;
  }

  /**
   * Get used slots in location
   */
  private getUsedSlotsInLocation(equipment: any[], location: string): number {
    return equipment.reduce((total, item) => {
      if (item.location === location) {
        return total + (item.requiredSlots || 1);
      }
      return total;
    }, 0);
  }

  /**
   * Get conflicts in location
   */
  private getConflictsInLocation(equipment: any[], location: string): string[] {
    const conflicts: string[] = [];
    const usedSlots = new Set<number>();

    equipment.forEach(item => {
      if (item.location === location && item.slots) {
        item.slots.forEach((slot: number) => {
          if (usedSlots.has(slot)) {
            conflicts.push(`Slot ${slot} conflict`);
          } else {
            usedSlots.add(slot);
          }
        });
      }
    });

    return conflicts;
  }

  /**
   * Validate BattleTech rules
   */
  private validateBattleTechRules(config: UnitConfiguration, equipment: any[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate engine placement
    const engineType = this.extractComponentType(config.engineType);
    if (engineType === 'XL' || engineType === 'XL (IS)' || engineType === 'XL (Clan)') {
      // XL engines must be placed in side torsos
      const engineInSideTorsos = equipment.some(item => 
        item.type === 'engine' && (item.location === 'leftTorso' || item.location === 'rightTorso')
      );
      
      if (!engineInSideTorsos) {
        errors.push({
          type: 'rule_violation',
          location: 'engine',
          component: 'XL Engine',
          message: 'XL engines must be placed in side torsos',
          severity: 'high'
        });
      }
    }

    // Validate gyro placement
    const gyroType = this.extractComponentType(config.gyroType);
    if (gyroType === 'Compact') {
      const gyroInCenterTorso = equipment.some(item => 
        item.type === 'gyro' && item.location === 'centerTorso'
      );
      
      if (!gyroInCenterTorso) {
        errors.push({
          type: 'rule_violation',
          location: 'gyro',
          component: 'Compact Gyro',
          message: 'Compact gyros must be placed in center torso',
          severity: 'high'
        });
      }
    }
  }

  /**
   * Generate validation suggestions
   */
  private generateValidationSuggestions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];

    if (errors.length > 0) {
      suggestions.push(`Found ${errors.length} validation errors that must be resolved`);
    }

    if (warnings.length > 0) {
      suggestions.push(`Found ${warnings.length} warnings that should be addressed`);
    }

    errors.forEach(error => {
      switch (error.type) {
        case 'slot_overflow':
          suggestions.push(`Reduce equipment in ${error.location} or redistribute`);
          break;
        case 'rule_violation':
          suggestions.push(`Follow BattleTech rules for ${error.component}`);
          break;
        default:
          suggestions.push(`Resolve ${error.type} in ${error.location}`);
      }
    });

    return suggestions;
  }

  /**
   * Generate location suggestions
   */
  private generateLocationSuggestions(location: string, locationData: any): string[] {
    const suggestions: string[] = [];

    if (locationData.utilization > 90) {
      suggestions.push(`Critical utilization in ${location}: ${locationData.utilization.toFixed(1)}%`);
      suggestions.push('Consider redistributing equipment to other locations');
    } else if (locationData.utilization > 75) {
      suggestions.push(`High utilization in ${location}: ${locationData.utilization.toFixed(1)}%`);
    }

    if (locationData.wastedSlots > 0) {
      suggestions.push(`${locationData.wastedSlots} slots available in ${location}`);
    }

    return suggestions;
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(locationEfficiency: any): number {
    let potential = 0;
    let count = 0;

    Object.values(locationEfficiency).forEach((data: any) => {
      if (data.efficiency < 80) {
        potential += (80 - data.efficiency);
        count++;
      }
    });

    return count > 0 ? potential / count : 0;
  }

  /**
   * Generate efficiency recommendations
   */
  private generateEfficiencyRecommendations(locationEfficiency: any, overallEfficiency: number): string[] {
    const recommendations: string[] = [];

    if (overallEfficiency < 70) {
      recommendations.push('Overall slot efficiency is low - consider optimization');
    }

    Object.entries(locationEfficiency).forEach(([location, data]: [string, any]) => {
      if (data.efficiency < 60) {
        recommendations.push(`Low efficiency in ${location}: ${data.efficiency.toFixed(1)}%`);
      }
    });

    return recommendations;
  }

  /**
   * Calculate overall efficiency
   */
  private calculateOverallEfficiency(config: UnitConfiguration, equipment: any[]): string {
    const totalSlots = Object.values(this.STANDARD_SLOT_COUNTS).reduce((sum, count) => sum + count, 0);
    const usedSlots = equipment.reduce((total, item) => total + (item.requiredSlots || 1), 0);
    const utilization = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;

    if (utilization <= 70) return 'excellent';
    if (utilization <= 85) return 'good';
    if (utilization <= 95) return 'fair';
    if (utilization <= 100) return 'poor';
    return 'critical';
  }

  /**
   * Get equipment in location
   */
  private getEquipmentInLocation(equipment: any[], location: string): string[] {
    return equipment
      .filter(item => item.location === location)
      .map(item => item.name || 'Unknown');
  }

  /**
   * Get special components in location
   */
  private getSpecialComponentsInLocation(config: UnitConfiguration, location: string): string[] {
    const specialComponents: string[] = [];

    // Check for Endo Steel
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      specialComponents.push(structureType);
    }

    // Check for Ferro Fibrous
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Ferro-Fibrous' || armorType === 'Ferro-Fibrous (Clan)' || 
        armorType === 'Light Ferro-Fibrous' || armorType === 'Heavy Ferro-Fibrous') {
      specialComponents.push(armorType);
    }

    return specialComponents;
  }

  /**
   * Get allocated special components
   */
  private getAllocatedSpecialComponents(config: UnitConfiguration): any {
    // Simplified special component allocation
    return {
      endoSteel: { required: 0, allocated: {}, conflicts: [] },
      ferroFibrous: { required: 0, allocated: {}, conflicts: [] },
      altri: { required: 0, allocated: {}, conflicts: [] }
    };
  }

  /**
   * Detect all conflicts
   */
  private detectAllConflicts(config: UnitConfiguration, equipment: any[]): any[] {
    // Simplified conflict detection
    return [];
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(summary: any, locationBreakdown: any, conflicts: any[]): string[] {
    const recommendations: string[] = [];

    if (summary.utilization > 90) {
      recommendations.push('Critical overall slot utilization - consider optimization');
    }

    if (conflicts.length > 0) {
      recommendations.push(`${conflicts.length} conflicts detected - resolve before proceeding`);
    }

    Object.entries(locationBreakdown).forEach(([location, data]: [string, any]) => {
      if (data.used > data.capacity * 0.9) {
        recommendations.push(`High utilization in ${location}: ${data.used}/${data.capacity}`);
      }
    });

    return recommendations;
  }

  /**
   * Get available slot numbers
   */
  private getAvailableSlotNumbers(location: string, capacity: number, usedCount: number): number[] {
    const availableSlots: number[] = [];
    const usedSlots = new Set<number>();

    // Simplified - in practice this would track actual used slots
    for (let i = 0; i < capacity; i++) {
      if (i >= usedCount) {
        availableSlots.push(i);
      }
    }

    return availableSlots;
  }

  /**
   * Check if slots are contiguous
   */
  private hasContiguousSlots(availableSlots: number[], requiredSlots: number): boolean {
    if (availableSlots.length < requiredSlots) {
      return false;
    }

    // Check for contiguous slots
    for (let i = 0; i <= availableSlots.length - requiredSlots; i++) {
      let contiguous = true;
      for (let j = 0; j < requiredSlots - 1; j++) {
        if (availableSlots[i + j + 1] - availableSlots[i + j] !== 1) {
          contiguous = false;
          break;
        }
      }
      if (contiguous) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get suitable equipment types for location
   */
  private getSuitableEquipmentTypes(location: string): string[] {
    switch (location) {
      case 'head':
        return ['cockpit', 'sensors', 'communications'];
      case 'centerTorso':
        return ['engine', 'gyro', 'heat_sinks', 'weapons', 'equipment'];
      case 'leftTorso':
      case 'rightTorso':
        return ['engine', 'heat_sinks', 'weapons', 'equipment', 'ammunition'];
      case 'leftArm':
      case 'rightArm':
        return ['actuators', 'weapons', 'equipment'];
      case 'leftLeg':
      case 'rightLeg':
        return ['actuators', 'equipment'];
      default:
        return ['equipment'];
    }
  }

  /**
   * Get location restrictions
   */
  private getLocationRestrictions(location: string, config: UnitConfiguration): string[] {
    const restrictions: string[] = [];

    // Engine type restrictions
    const engineType = this.extractComponentType(config.engineType);
    if (engineType === 'XL' || engineType === 'XL (IS)' || engineType === 'XL (Clan)') {
      if (location === 'centerTorso') {
        restrictions.push('XL engines cannot be placed in center torso');
      }
    }

    // Gyro type restrictions
    const gyroType = this.extractComponentType(config.gyroType);
    if (gyroType === 'Compact') {
      if (location !== 'centerTorso') {
        restrictions.push('Compact gyros must be placed in center torso');
      }
    }

    return restrictions;
  }
} 