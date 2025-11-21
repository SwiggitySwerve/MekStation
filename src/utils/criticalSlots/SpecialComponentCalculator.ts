/**
 * SpecialComponentCalculator
 * Handles special component allocation calculations including Endo Steel, Ferro Fibrous, and other special components.
 * This is a STATIC calculation service - it does not manage component lifecycle, only calculates requirements.
 * Extracted from CriticalSlotCalculator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from './UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';

export interface SpecialComponentAllocation {
  endoSteel: {
    required: number;
    allocated: EndoSteelSlotAllocation;
    conflicts: string[];
  };
  ferroFibrous: {
    required: number;
    allocated: FerroFibrousSlotAllocation;
    conflicts: string[];
  };
  altri: {
    required: number;
    allocated: { [location: string]: number[] };
    conflicts: string[];
  };
}

export interface EndoSteelSlotAllocation {
  total: number;
  allocations: {
    [location: string]: {
      slots: number[];
      count: number;
    };
  };
  isComplete: boolean;
  remainingSlots: number;
}

export interface FerroFibrousSlotAllocation {
  total: number;
  allocations: {
    [location: string]: {
      slots: number[];
      count: number;
    };
  };
  isComplete: boolean;
  remainingSlots: number;
}

export class SpecialComponentCalculator {
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
   * Allocate special components
   */
  allocateSpecialComponents(config: UnitConfiguration): SpecialComponentAllocation {
    const endoSteel = this.allocateEndoSteel(config);
    const ferroFibrous = this.allocateFerroFibrous(config);
    const altri = this.allocateOtherSpecialComponents(config);

    return {
      endoSteel,
      ferroFibrous,
      altri
    };
  }

  /**
   * Calculate Endo Steel slots
   */
  calculateEndoSteelSlots(config: UnitConfiguration): EndoSteelSlotAllocation {
    const requiredSlots = this.getEndoSteelRequirement(config);
    const allocations = this.distributeEndoSteelSlots(requiredSlots, config);
    const conflicts = this.detectEndoSteelConflicts(config, { total: requiredSlots, allocations, isComplete: false, remainingSlots: 0 });

    const totalAllocated = Object.values(allocations).reduce((sum, data) => sum + data.count, 0);
    const isComplete = totalAllocated >= requiredSlots;
    const remainingSlots = Math.max(0, requiredSlots - totalAllocated);

    return {
      total: requiredSlots,
      allocations,
      isComplete,
      remainingSlots
    };
  }

  /**
   * Calculate Ferro Fibrous slots
   */
  calculateFerroFibrousSlots(config: UnitConfiguration): FerroFibrousSlotAllocation {
    const requiredSlots = this.getFerroFibrousRequirement(config);
    const allocations = this.distributeFerroFibrousSlots(requiredSlots, config);
    const conflicts = this.detectFerroFibrousConflicts(config, { total: requiredSlots, allocations, isComplete: false, remainingSlots: 0 });

    const totalAllocated = Object.values(allocations).reduce((sum, data) => sum + data.count, 0);
    const isComplete = totalAllocated >= requiredSlots;
    const remainingSlots = Math.max(0, requiredSlots - totalAllocated);

    return {
      total: requiredSlots,
      allocations,
      isComplete,
      remainingSlots
    };
  }

  /**
   * Allocate Endo Steel
   */
  private allocateEndoSteel(config: UnitConfiguration): {
    required: number;
    allocated: EndoSteelSlotAllocation;
    conflicts: string[];
  } {
    const requiredSlots = this.getEndoSteelRequirement(config);
    const allocated = this.calculateEndoSteelSlots(config);
    const conflicts = this.detectEndoSteelConflicts(config, allocated);

    return {
      required: requiredSlots,
      allocated,
      conflicts
    };
  }

  /**
   * Allocate Ferro Fibrous
   */
  private allocateFerroFibrous(config: UnitConfiguration): {
    required: number;
    allocated: FerroFibrousSlotAllocation;
    conflicts: string[];
  } {
    const requiredSlots = this.getFerroFibrousRequirement(config);
    const allocated = this.calculateFerroFibrousSlots(config);
    const conflicts = this.detectFerroFibrousConflicts(config, allocated);

    return {
      required: requiredSlots,
      allocated,
      conflicts
    };
  }

  /**
   * Allocate other special components
   */
  private allocateOtherSpecialComponents(config: UnitConfiguration): {
    required: number;
    allocated: { [location: string]: number[] };
    conflicts: string[];
  } {
    const requiredSlots = this.getOtherSpecialRequirements(config);
    const allocated = this.distributeOtherSpecialSlots(requiredSlots, config);
    const conflicts = this.detectOtherSpecialConflicts(config, allocated);

    return {
      required: requiredSlots,
      allocated,
      conflicts
    };
  }

  /**
   * Get Endo Steel requirement
   */
  public getEndoSteelRequirement(config: UnitConfiguration): number {
    const tonnage = config.tonnage;
    return Math.ceil(tonnage / 5); // 1 slot per 5 tons
  }

  /**
   * Get Ferro Fibrous requirement
   */
  public getFerroFibrousRequirement(config: UnitConfiguration): number {
    const tonnage = config.tonnage;
    return Math.ceil(tonnage / 5); // 1 slot per 5 tons
  }

  /**
   * Get other special requirements
   */
  private getOtherSpecialRequirements(config: UnitConfiguration): number {
    // Simplified - in practice this would check for other special components
    return 0;
  }

  /**
   * Detect Endo Steel conflicts
   */
  private detectEndoSteelConflicts(config: UnitConfiguration, allocation: EndoSteelSlotAllocation): string[] {
    const conflicts: string[] = [];
    
    // Check if Endo Steel conflicts with other structure types
    const structureType = this.extractComponentType(config.structureType);
    if (structureType !== 'Endo Steel' && structureType !== 'Endo Steel (Clan)') {
      conflicts.push(`Endo Steel conflicts with ${structureType} structure`);
    }
    
    // Check if allocation is complete
    if (!allocation.isComplete) {
      conflicts.push(`Incomplete Endo Steel allocation: ${allocation.remainingSlots} slots remaining`);
    }
    
    return conflicts;
  }

  /**
   * Detect Ferro Fibrous conflicts
   */
  private detectFerroFibrousConflicts(config: UnitConfiguration, allocation: FerroFibrousSlotAllocation): string[] {
    const conflicts: string[] = [];
    
    // Check if Ferro Fibrous conflicts with other armor types
    const armorType = this.extractComponentType(config.armorType);
    if (armorType !== 'Ferro-Fibrous' && armorType !== 'Ferro-Fibrous (Clan)' && 
        armorType !== 'Light Ferro-Fibrous' && armorType !== 'Heavy Ferro-Fibrous') {
      conflicts.push(`Ferro Fibrous conflicts with ${armorType} armor`);
    }
    
    // Check if allocation is complete
    if (!allocation.isComplete) {
      conflicts.push(`Incomplete Ferro Fibrous allocation: ${allocation.remainingSlots} slots remaining`);
    }
    
    return conflicts;
  }

  /**
   * Detect other special conflicts
   */
  private detectOtherSpecialConflicts(config: UnitConfiguration, allocation: { [location: string]: number[] }): string[] {
    // Simplified - in practice this would check for other special component conflicts
    return [];
  }

  /**
   * Distribute Endo Steel slots across locations
   */
  private distributeEndoSteelSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    const allocations: { [location: string]: { slots: number[], count: number } } = {};
    const tonnage = config.tonnage;
    
    // Standard distribution pattern for Endo Steel
    const distribution = this.getEndoSteelDistribution(tonnage);
    
    let slotIndex = 0;
    for (const [location, count] of Object.entries(distribution)) {
      if (slotIndex >= requiredSlots) break;
      
      const slots = [];
      for (let i = 0; i < count && slotIndex < requiredSlots; i++) {
        slots.push(slotIndex + i);
      }
      
      if (slots.length > 0) {
        allocations[location] = {
          slots,
          count: slots.length
        };
        slotIndex += slots.length;
      }
    }
    
    return allocations;
  }

  /**
   * Distribute Ferro Fibrous slots across locations
   */
  private distributeFerroFibrousSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    const allocations: { [location: string]: { slots: number[], count: number } } = {};
    const tonnage = config.tonnage;
    
    // Standard distribution pattern for Ferro Fibrous
    const distribution = this.getFerroFibrousDistribution(tonnage);
    
    let slotIndex = 0;
    for (const [location, count] of Object.entries(distribution)) {
      if (slotIndex >= requiredSlots) break;
      
      const slots = [];
      for (let i = 0; i < count && slotIndex < requiredSlots; i++) {
        slots.push(slotIndex + i);
      }
      
      if (slots.length > 0) {
        allocations[location] = {
          slots,
          count: slots.length
        };
        slotIndex += slots.length;
      }
    }
    
    return allocations;
  }

  /**
   * Distribute other special slots
   */
  private distributeOtherSpecialSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: number[] } {
    // Simplified - in practice this would distribute other special components
    return {};
  }

  /**
   * Get Endo Steel distribution pattern
   */
  private getEndoSteelDistribution(tonnage: number): { [location: string]: number } {
    // Standard Endo Steel distribution pattern
    if (tonnage <= 30) {
      return {
        'Center Torso': 2,
        'Left Torso': 1,
        'Right Torso': 1
      };
    } else if (tonnage <= 50) {
      return {
        'Center Torso': 3,
        'Left Torso': 2,
        'Right Torso': 2,
        'Left Arm': 1,
        'Right Arm': 1
      };
    } else {
      return {
        'Center Torso': 4,
        'Left Torso': 3,
        'Right Torso': 3,
        'Left Arm': 2,
        'Right Arm': 2
      };
    }
  }

  /**
   * Get Ferro Fibrous distribution pattern
   */
  private getFerroFibrousDistribution(tonnage: number): { [location: string]: number } {
    // Standard Ferro Fibrous distribution pattern
    if (tonnage <= 30) {
      return {
        'Center Torso': 2,
        'Left Torso': 1,
        'Right Torso': 1
      };
    } else if (tonnage <= 50) {
      return {
        'Center Torso': 3,
        'Left Torso': 2,
        'Right Torso': 2,
        'Left Arm': 1,
        'Right Arm': 1
      };
    } else {
      return {
        'Center Torso': 4,
        'Left Torso': 3,
        'Right Torso': 3,
        'Left Arm': 2,
        'Right Arm': 2
      };
    }
  }

  /**
   * Check if location is valid for Endo Steel
   */
  private isValidEndoSteelLocation(location: string): boolean {
    const validLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm'];
    return validLocations.includes(location);
  }

  /**
   * Check if location is valid for Ferro Fibrous
   */
  private isValidFerroFibrousLocation(location: string): boolean {
    const validLocations = ['Center Torso', 'Left Torso', 'Right Torso', 'Left Arm', 'Right Arm'];
    return validLocations.includes(location);
  }

  /**
   * Calculate total special component slots
   */
  public calculateSpecialComponentSlots(config: UnitConfiguration): number {
    const endoSteelSlots = this.getEndoSteelRequirement(config);
    const ferroFibrousSlots = this.getFerroFibrousRequirement(config);
    const otherSlots = this.getOtherSpecialRequirements(config);
    
    return endoSteelSlots + ferroFibrousSlots + otherSlots;
  }

  /**
   * Validate special component placement
   */
  public validateSpecialComponentPlacement(config: UnitConfiguration, allocations: any[]): string[] {
    const errors: string[] = [];
    
    // Validate Endo Steel placement
    const endoSteelAllocation = this.calculateEndoSteelSlots(config);
    if (!endoSteelAllocation.isComplete) {
      errors.push(`Incomplete Endo Steel allocation: ${endoSteelAllocation.remainingSlots} slots remaining`);
    }
    
    // Validate Ferro Fibrous placement
    const ferroFibrousAllocation = this.calculateFerroFibrousSlots(config);
    if (!ferroFibrousAllocation.isComplete) {
      errors.push(`Incomplete Ferro Fibrous allocation: ${ferroFibrousAllocation.remainingSlots} slots remaining`);
    }
    
    return errors;
  }

  /**
   * Get special component recommendations
   */
  public getSpecialComponentRecommendations(config: UnitConfiguration): string[] {
    const recommendations: string[] = [];
    
    // Check if Endo Steel would be beneficial
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Standard' && config.tonnage >= 40) {
      recommendations.push('Consider Endo Steel for weight savings on this heavy unit');
    }
    
    // Check if Ferro Fibrous would be beneficial
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Standard' && config.tonnage >= 40) {
      recommendations.push('Consider Ferro Fibrous for additional armor protection');
    }
    
    return recommendations;
  }
} 