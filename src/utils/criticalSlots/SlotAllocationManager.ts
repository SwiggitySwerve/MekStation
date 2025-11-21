/**
 * SlotAllocationManager
 * Handles equipment allocation, optimization, and conflict resolution.
 * Extracted from CriticalSlotCalculator for modularity and SOLID compliance.
 */

import { UnitConfiguration } from './UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

export interface AllocationResult {
  success: boolean;
  allocations: EquipmentAllocation[];
  unallocated: any[];
  conflicts: SlotConflict[];
  warnings: string[];
  suggestions: string[];
}

export interface EquipmentAllocation {
  equipment: any;
  location: string;
  slots: number[];
  validated: boolean;
  conflicts: string[];
}

export interface OptimizationResult {
  optimized: boolean;
  originalAllocations: EquipmentAllocation[];
  optimizedAllocations: EquipmentAllocation[];
  improvements: {
    slotsFreed: number;
    conflictsResolved: number;
    efficiencyGain: number;
  };
  recommendations: string[];
}

export interface SlotConflict {
  type: 'overlap' | 'invalid_location' | 'capacity_exceeded' | 'rule_violation';
  location: string;
  slot?: number;
  conflictingComponents: string[];
  severity: 'critical' | 'major' | 'minor';
  resolvable: boolean;
  suggestions: string[];
}

export interface ConflictResolution {
  resolved: SlotConflict[];
  unresolved: SlotConflict[];
  newAllocations: EquipmentAllocation[];
  success: boolean;
  explanation: string;
}

export interface ReorganizationSuggestion {
  type: 'move_equipment' | 'split_equipment' | 'optimize_special' | 'relocate_system';
  component: string;
  fromLocation: string;
  toLocation: string;
  benefit: string;
  impact: 'none' | 'minor' | 'moderate' | 'major';
  feasible: boolean;
}

export class SlotAllocationManager {
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
   * Allocate equipment slots
   */
  allocateEquipmentSlots(config: UnitConfiguration, equipment: any[]): AllocationResult {
    const allocations: EquipmentAllocation[] = [];
    const unallocated: any[] = [];
    const conflicts: SlotConflict[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Allocate system components first
    const systemAllocations = this.allocateSystemComponents(config);
    allocations.push(...systemAllocations);

    // Allocate special components
    const specialResult = this.allocateSpecialComponentsToSlots(config);
    allocations.push(...specialResult.allocations);
    conflicts.push(...specialResult.conflicts);

    // Allocate equipment
    equipment.forEach(item => {
      const result = this.allocateSingleEquipment(item, config, allocations);
      if (result.success && result.allocation) {
        allocations.push(result.allocation);
        conflicts.push(...result.conflicts);
        warnings.push(...result.warnings);
      } else {
        unallocated.push(item);
        conflicts.push(...result.conflicts);
        warnings.push(...result.warnings);
      }
    });

    // Generate suggestions
    suggestions.push(...this.generateAllocationSuggestions(config, allocations, unallocated));

    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      conflicts,
      warnings,
      suggestions
    };
  }

  /**
   * Optimize slot allocation
   */
  optimizeSlotAllocation(config: UnitConfiguration, equipment: any[]): OptimizationResult {
    const originalResult = this.allocateEquipmentSlots(config, equipment);
    const originalAllocations = originalResult.allocations;

    // Try different optimization strategies
    const locationOptimized = this.optimizeByLocation(config, equipment, originalAllocations);
    const sizeOptimized = this.optimizeBySize(config, equipment, originalAllocations);
    const typeOptimized = this.optimizeByType(config, equipment, originalAllocations);
    const specialOptimized = this.optimizeSpecialComponents(config, equipment, originalAllocations);

    // Find the best optimization
    const optimizations = [locationOptimized, sizeOptimized, typeOptimized, specialOptimized];
    const bestOptimization = optimizations.reduce((best, current) => {
      const bestScore = this.calculateAllocationScore(best);
      const currentScore = this.calculateAllocationScore(current);
      return currentScore > bestScore ? current : best;
    });

    const improvements = this.calculateImprovements(originalResult, bestOptimization);
    const recommendations = this.generateOptimizationRecommendations(improvements);

    return {
      optimized: bestOptimization.success && bestOptimization.unallocated.length < originalResult.unallocated.length,
      originalAllocations,
      optimizedAllocations: bestOptimization.allocations,
      improvements,
      recommendations
    };
  }

  /**
   * Detect slot conflicts
   */
  detectSlotConflicts(config: UnitConfiguration, equipment: any[]): SlotConflict[] {
    const allocationResult = this.allocateEquipmentSlots(config, equipment);
    const conflicts: SlotConflict[] = [];

    // Detect overlaps
    conflicts.push(...this.detectSlotOverlaps(allocationResult.allocations));

    // Detect capacity violations
    conflicts.push(...this.detectCapacityViolations(config, allocationResult.allocations));

    // Detect rule violations
    conflicts.push(...this.detectRuleViolations(config, allocationResult.allocations));

    return conflicts;
  }

  /**
   * Resolve slot conflicts
   */
  resolveSlotConflicts(conflicts: SlotConflict[]): ConflictResolution {
    const resolved: SlotConflict[] = [];
    const unresolved: SlotConflict[] = [];
    const newAllocations: EquipmentAllocation[] = [];

    conflicts.forEach(conflict => {
      const result = this.resolveSingleConflict(conflict);
      if (result.success) {
        resolved.push(conflict);
        newAllocations.push(...result.allocations);
      } else {
        unresolved.push(conflict);
      }
    });

    const explanation = this.generateResolutionExplanation(resolved, unresolved);

    return {
      resolved,
      unresolved,
      newAllocations,
      success: unresolved.length === 0,
      explanation
    };
  }

  /**
   * Suggest slot reorganization
   */
  suggestSlotReorganization(config: UnitConfiguration, equipment: any[]): ReorganizationSuggestion[] {
    const suggestions: ReorganizationSuggestion[] = [];
    const utilization = this.calculateSlotUtilization(config, equipment);

    // Generate bottleneck suggestions
    utilization.bottlenecks.forEach(bottleneck => {
      suggestions.push(...this.generateBottleneckSuggestions(bottleneck, config, equipment));
    });

    // Generate special component suggestions
    suggestions.push(...this.generateSpecialComponentSuggestions(config));

    // Generate consolidation suggestions
    suggestions.push(...this.generateConsolidationSuggestions(equipment));

    return suggestions;
  }

  /**
   * Allocate system components
   */
  private allocateSystemComponents(config: UnitConfiguration): EquipmentAllocation[] {
    const allocations: EquipmentAllocation[] = [];

    // Allocate engine
    const engineType = this.extractComponentType(config.engineType);
    const engineSlots = this.getEngineSlots(engineType);
    allocations.push({
      equipment: { name: `${engineType} Engine`, type: 'engine' },
      location: 'centerTorso',
      slots: Array.from({ length: engineSlots }, (_, i) => i),
      validated: true,
      conflicts: []
    });

    // Allocate gyro
    const gyroType = this.extractComponentType(config.gyroType);
    const gyroSlots = this.getGyroSlots(gyroType);
    allocations.push({
      equipment: { name: `${gyroType} Gyro`, type: 'gyro' },
      location: 'centerTorso',
      slots: Array.from({ length: gyroSlots }, (_, i) => engineSlots + i),
      validated: true,
      conflicts: []
    });

    return allocations;
  }

  /**
   * Allocate special components to slots
   */
  private allocateSpecialComponentsToSlots(config: UnitConfiguration): { allocations: EquipmentAllocation[], conflicts: SlotConflict[] } {
    const allocations: EquipmentAllocation[] = [];
    const conflicts: SlotConflict[] = [];

    // Allocate Endo Steel
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Endo Steel' || structureType === 'Endo Steel (Clan)') {
      const endoSlots = this.getEndoSteelRequirement(config);
      const endoAllocation = this.distributeEndoSteelSlots(endoSlots, config);
      
      Object.entries(endoAllocation).forEach(([location, data]) => {
        allocations.push({
          equipment: { name: `${structureType} Structure`, type: 'structure' },
          location,
          slots: data.slots,
          validated: true,
          conflicts: []
        });
      });
    }

    // Allocate Ferro Fibrous
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Ferro-Fibrous' || armorType === 'Ferro-Fibrous (Clan)' || 
        armorType === 'Light Ferro-Fibrous' || armorType === 'Heavy Ferro-Fibrous') {
      const ferroSlots = this.getFerroFibrousRequirement(config);
      const ferroAllocation = this.distributeFerroFibrousSlots(ferroSlots, config);
      
      Object.entries(ferroAllocation).forEach(([location, data]) => {
        allocations.push({
          equipment: { name: `${armorType} Armor`, type: 'armor' },
          location,
          slots: data.slots,
          validated: true,
          conflicts: []
        });
      });
    }

    return { allocations, conflicts };
  }

  /**
   * Allocate single equipment
   */
  private allocateSingleEquipment(item: any, config: UnitConfiguration, existingAllocations: EquipmentAllocation[]): { success: boolean, allocation?: EquipmentAllocation, conflicts: SlotConflict[], warnings: string[] } {
    const conflicts: SlotConflict[] = [];
    const warnings: string[] = [];

    // Find suitable location
    const suitableLocations = this.getSuitableLocations(item, config);
    if (suitableLocations.length === 0) {
      conflicts.push({
        type: 'invalid_location',
        location: 'unknown',
        conflictingComponents: [item.name || 'Unknown'],
        severity: 'critical',
        resolvable: false,
        suggestions: ['No suitable location found for this equipment']
      });
      return { success: false, conflicts, warnings };
    }

    // Find available slots in suitable locations
    const requiredSlots = item.requiredSlots || 1;
    for (const location of suitableLocations) {
      const availableSlots = this.findAvailableSlotsInLocation(location, requiredSlots, existingAllocations);
      if (availableSlots.length >= requiredSlots) {
        const allocation: EquipmentAllocation = {
          equipment: item,
          location,
          slots: availableSlots.slice(0, requiredSlots),
          validated: true,
          conflicts: []
        };
        return { success: true, allocation, conflicts, warnings };
      }
    }

    // No available slots
    conflicts.push({
      type: 'capacity_exceeded',
      location: suitableLocations[0],
      conflictingComponents: [item.name || 'Unknown'],
      severity: 'major',
      resolvable: true,
      suggestions: ['Consider redistributing equipment or using different locations']
    });

    return { success: false, conflicts, warnings };
  }

  /**
   * Generate allocation suggestions
   */
  private generateAllocationSuggestions(config: UnitConfiguration, allocations: EquipmentAllocation[], unallocated: any[]): string[] {
    const suggestions: string[] = [];

    if (unallocated.length > 0) {
      suggestions.push(`Unable to allocate ${unallocated.length} equipment items`);
      suggestions.push('Consider redistributing equipment or using different locations');
    }

    const utilization = this.calculateSlotUtilization(config, allocations.map(a => a.equipment));
    if (utilization.bottlenecks.length > 0) {
      suggestions.push(`Critical utilization in: ${utilization.bottlenecks.join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Optimize by location
   */
  private optimizeByLocation(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    // Simplified optimization - in practice this would be more complex
    return this.allocateEquipmentSlots(config, equipment);
  }

  /**
   * Optimize by size
   */
  private optimizeBySize(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    // Sort equipment by size (largest first) and reallocate
    const sortedEquipment = [...equipment].sort((a, b) => (b.requiredSlots || 1) - (a.requiredSlots || 1));
    return this.allocateEquipmentSlots(config, sortedEquipment);
  }

  /**
   * Optimize by type
   */
  private optimizeByType(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    // Group equipment by type and allocate together
    const groupedEquipment = this.groupEquipmentByType(equipment);
    const flattenedEquipment = groupedEquipment.flat();
    return this.allocateEquipmentSlots(config, flattenedEquipment);
  }

  /**
   * Optimize special components
   */
  private optimizeSpecialComponents(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    // Optimize special component placement
    return this.allocateEquipmentSlots(config, equipment);
  }

  /**
   * Calculate allocation score
   */
  private calculateAllocationScore(result: AllocationResult): number {
    const baseScore = result.success ? 100 : 50;
    const conflictPenalty = result.conflicts.length * 10;
    const unallocatedPenalty = result.unallocated.length * 20;
    return Math.max(0, baseScore - conflictPenalty - unallocatedPenalty);
  }

  /**
   * Calculate improvements
   */
  private calculateImprovements(original: AllocationResult, optimized: AllocationResult): any {
    const slotsFreed = original.allocations.length - optimized.allocations.length;
    const conflictsResolved = original.conflicts.length - optimized.conflicts.length;
    const efficiencyGain = this.calculateAllocationScore(optimized) - this.calculateAllocationScore(original);

    return {
      slotsFreed,
      conflictsResolved,
      efficiencyGain
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(improvements: any): string[] {
    const recommendations: string[] = [];

    if (improvements.slotsFreed > 0) {
      recommendations.push(`Freed ${improvements.slotsFreed} slots through optimization`);
    }

    if (improvements.conflictsResolved > 0) {
      recommendations.push(`Resolved ${improvements.conflictsResolved} conflicts`);
    }

    if (improvements.efficiencyGain > 0) {
      recommendations.push(`Improved allocation efficiency by ${improvements.efficiencyGain} points`);
    }

    return recommendations;
  }

  /**
   * Detect slot overlaps
   */
  private detectSlotOverlaps(allocations: EquipmentAllocation[]): SlotConflict[] {
    const conflicts: SlotConflict[] = [];
    const locationSlots: { [location: string]: number[] } = {};

    allocations.forEach(allocation => {
      if (!locationSlots[allocation.location]) {
        locationSlots[allocation.location] = [];
      }

      allocation.slots.forEach(slot => {
        if (locationSlots[allocation.location].includes(slot)) {
          conflicts.push({
            type: 'overlap',
            location: allocation.location,
            conflictingComponents: [allocation.equipment.name || 'Unknown'],
            severity: 'critical',
            resolvable: true,
            suggestions: ['Relocate equipment to avoid slot overlap']
          });
        } else {
          locationSlots[allocation.location].push(slot);
        }
      });
    });

    return conflicts;
  }

  /**
   * Detect capacity violations
   */
  private detectCapacityViolations(config: UnitConfiguration, allocations: EquipmentAllocation[]): SlotConflict[] {
    const conflicts: SlotConflict[] = [];
    const locationCounts: { [location: string]: number } = {};

    allocations.forEach(allocation => {
      if (!locationCounts[allocation.location]) {
        locationCounts[allocation.location] = 0;
      }
      locationCounts[allocation.location] += allocation.slots.length;
    });

    // Check against standard slot counts
    const standardCounts = {
      head: 6,
      centerTorso: 12,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 6,
      rightLeg: 6
    };

    Object.entries(locationCounts).forEach(([location, count]) => {
      const maxSlots = standardCounts[location as keyof typeof standardCounts] || 12;
      if (count > maxSlots) {
        conflicts.push({
          type: 'capacity_exceeded',
          location,
          conflictingComponents: ['Multiple equipment'],
          severity: 'critical',
          resolvable: true,
          suggestions: [`Reduce equipment in ${location} or redistribute`]
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect rule violations
   */
  private detectRuleViolations(config: UnitConfiguration, allocations: EquipmentAllocation[]): SlotConflict[] {
    // Simplified rule violation detection
    return [];
  }

  /**
   * Resolve single conflict
   */
  private resolveSingleConflict(conflict: SlotConflict): { success: boolean, allocations: EquipmentAllocation[] } {
    // Simplified conflict resolution
    return { success: false, allocations: [] };
  }

  /**
   * Generate resolution explanation
   */
  private generateResolutionExplanation(resolved: SlotConflict[], unresolved: SlotConflict[]): string {
    if (resolved.length === 0 && unresolved.length === 0) {
      return 'No conflicts detected';
    }

    let explanation = `Resolved ${resolved.length} conflicts`;
    if (unresolved.length > 0) {
      explanation += `, ${unresolved.length} conflicts remain`;
    }

    return explanation;
  }

  /**
   * Generate bottleneck suggestions
   */
  private generateBottleneckSuggestions(bottleneck: string, config: UnitConfiguration, equipment: any[]): ReorganizationSuggestion[] {
    return [{
      type: 'move_equipment',
      component: 'Equipment',
      fromLocation: bottleneck,
      toLocation: 'other',
      benefit: `Reduce pressure on ${bottleneck}`,
      impact: 'moderate',
      feasible: true
    }];
  }

  /**
   * Generate special component suggestions
   */
  private generateSpecialComponentSuggestions(config: UnitConfiguration): ReorganizationSuggestion[] {
    return [];
  }

  /**
   * Generate consolidation suggestions
   */
  private generateConsolidationSuggestions(equipment: any[]): ReorganizationSuggestion[] {
    return [];
  }

  /**
   * Get engine slots
   */
  private getEngineSlots(engineType: string): number {
    switch (engineType) {
      case 'XL':
      case 'XL (IS)':
      case 'XL (Clan)':
        return 6;
      case 'Light':
        return 4;
      case 'XXL':
        return 8;
      case 'Compact':
        return 2;
      case 'ICE':
      case 'Fuel Cell':
        return 4;
      default:
        return 3;
    }
  }

  /**
   * Get gyro slots
   */
  private getGyroSlots(gyroType: string): number {
    switch (gyroType) {
      case 'XL':
        return 1;
      case 'Compact':
        return 2;
      case 'Heavy-Duty':
        return 3;
      default:
        return 1;
    }
  }

  /**
   * Get Endo Steel requirement
   */
  private getEndoSteelRequirement(config: UnitConfiguration): number {
    return Math.ceil(config.tonnage / 5);
  }

  /**
   * Get Ferro Fibrous requirement
   */
  private getFerroFibrousRequirement(config: UnitConfiguration): number {
    return Math.ceil(config.tonnage / 5);
  }

  /**
   * Distribute Endo Steel slots
   */
  private distributeEndoSteelSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    // Simplified distribution
    return {
      centerTorso: { slots: Array.from({ length: Math.min(requiredSlots, 6) }, (_, i) => i), count: Math.min(requiredSlots, 6) }
    };
  }

  /**
   * Distribute Ferro Fibrous slots
   */
  private distributeFerroFibrousSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    // Simplified distribution
    return {
      centerTorso: { slots: Array.from({ length: Math.min(requiredSlots, 6) }, (_, i) => i), count: Math.min(requiredSlots, 6) }
    };
  }

  /**
   * Calculate slot utilization
   */
  private calculateSlotUtilization(config: UnitConfiguration, equipment: any[]): any {
    // Simplified utilization calculation
    return { bottlenecks: [] };
  }

  /**
   * Get suitable locations
   */
  private getSuitableLocations(item: any, config: UnitConfiguration): string[] {
    // Simplified location suitability
    return ['centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm'];
  }

  /**
   * Find available slots in location
   */
  private findAvailableSlotsInLocation(location: string, requiredSlots: number, existingAllocations: EquipmentAllocation[]): number[] {
    const usedSlots = new Set<number>();
    
    existingAllocations
      .filter(a => a.location === location)
      .forEach(a => a.slots.forEach(slot => usedSlots.add(slot)));

    const availableSlots: number[] = [];
    const maxSlots = 12; // Simplified

    for (let i = 0; i < maxSlots && availableSlots.length < requiredSlots; i++) {
      if (!usedSlots.has(i)) {
        availableSlots.push(i);
      }
    }

    return availableSlots;
  }

  /**
   * Group equipment by type
   */
  private groupEquipmentByType(equipment: any[]): any[][] {
    const groups: { [type: string]: any[] } = {};
    
    equipment.forEach(item => {
      const type = item.type || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    });

    return Object.values(groups);
  }
} 