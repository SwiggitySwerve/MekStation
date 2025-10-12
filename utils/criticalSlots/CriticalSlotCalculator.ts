/**
 * CriticalSlotCalculator - Critical slot calculation and allocation management
 * 
 * Refactored to use modular managers following SOLID principles.
 * Delegates responsibilities to specialized managers for better maintainability.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from './UnitCriticalManagerTypes';
import { ComponentConfiguration, TechBase } from '../../types/componentConfiguration';
import { SystemComponentsGateway } from '../../services/systemComponents/SystemComponentsGateway';
import { EquipmentAllocation } from './CriticalSlot';
// TODO: STRUCTURE_DATA and ARMOR_DATA need to be migrated to new adapters
// import { STRUCTURE_DATA, ARMOR_DATA } from '../../services/ComponentDatabaseService';
import { SlotCalculationManager, SlotRequirements, AvailableSlots, SlotUtilization } from './SlotCalculationManager';
import { SlotAllocationManager, AllocationResult, OptimizationResult, SlotConflict, ConflictResolution, ReorganizationSuggestion } from './SlotAllocationManager';
import { SlotValidationManager, ValidationResult, EfficiencyAnalysis, SlotReport, AvailableSlotLocation, ValidationError, ValidationWarning } from './SlotValidationManager';
import { SpecialComponentCalculator, SpecialComponentAllocation, EndoSteelSlotAllocation, FerroFibrousSlotAllocation } from './SpecialComponentCalculator';
import {
  CompleteCriticalSlotBreakdown,
  SimplifiedCriticalSlotBreakdown,
  EngineComponent,
  GyroComponent,
  CockpitComponent,
  LifeSupportComponent,
  SensorsComponent,
  ActuatorComponent,
  EquipmentComponent,
  CriticalSlotLocation,
  CRITICAL_SLOT_LOCATIONS,
  STANDARD_SLOT_COUNTS,
  TOTAL_CRITICAL_SLOTS
} from './CriticalSlotTypes';

export interface CriticalSlotCalculator {
  // Core slot calculations
  calculateRequiredSlots(config: UnitConfiguration, equipment: EquipmentAllocation[]): SlotRequirements;
  calculateAvailableSlots(config: UnitConfiguration): AvailableSlots;
  calculateSlotUtilization(config: UnitConfiguration, equipment: EquipmentAllocation[]): SlotUtilization;
  
  // Allocation methods
  allocateEquipmentSlots(config: UnitConfiguration, equipment: EquipmentAllocation[]): AllocationResult;
  optimizeSlotAllocation(config: UnitConfiguration, equipment: EquipmentAllocation[]): OptimizationResult;
  validateSlotAllocation(config: UnitConfiguration, equipment: EquipmentAllocation[]): ValidationResult;
  
  // Special component handling
  allocateSpecialComponents(config: UnitConfiguration): SpecialComponentAllocation;
  calculateEndoSteelSlots(config: UnitConfiguration): EndoSteelSlotAllocation;
  calculateFerroFibrousSlots(config: UnitConfiguration): FerroFibrousSlotAllocation;
  
  // Slot conflict resolution
  detectSlotConflicts(config: UnitConfiguration, equipment: EquipmentAllocation[]): SlotConflict[];
  resolveSlotConflicts(conflicts: SlotConflict[]): ConflictResolution;
  suggestSlotReorganization(config: UnitConfiguration, equipment: EquipmentAllocation[]): ReorganizationSuggestion[];
  
  // Analysis and reporting
  analyzeSlotEfficiency(config: UnitConfiguration, equipment: EquipmentAllocation[]): EfficiencyAnalysis;
  generateSlotReport(config: UnitConfiguration, equipment: EquipmentAllocation[]): SlotReport;
  findAvailableSlots(config: UnitConfiguration, equipment: EquipmentAllocation[], requiredSlots: number): AvailableSlotLocation[];
}

export interface EquipmentAllocation {
  equipment: Record<string, unknown>;
  location: string;
  slots: number[];
  validated: boolean;
  conflicts: string[];
}

// Using the concrete types from CriticalSlotTypes.ts instead of the old interface

export class CriticalSlotCalculatorImpl implements CriticalSlotCalculator {
  
  private readonly slotCalculationManager: SlotCalculationManager;
  private readonly slotAllocationManager: SlotAllocationManager;
  private readonly slotValidationManager: SlotValidationManager;
  private readonly specialComponentManager: SpecialComponentCalculator;
  // MIGRATED: No longer using ComponentDatabaseService, using SystemComponentsGateway instead

  // Standard slot counts for different locations
  private readonly STANDARD_SLOT_COUNTS = {
    head: 6,
    centerTorso: 12,
    leftTorso: 12,
    rightTorso: 12,
    leftArm: 12,
    rightArm: 12,
    leftLeg: 6,
    rightLeg: 6
  };

  constructor() {
    this.slotCalculationManager = new SlotCalculationManager();
    this.slotAllocationManager = new SlotAllocationManager();
    this.slotValidationManager = new SlotValidationManager();
    this.specialComponentManager = new SpecialComponentCalculator();
    // MIGRATED: No longer initializing ComponentDatabaseService
  }

  // ===== CORE SLOT CALCULATIONS =====
  
  calculateRequiredSlots(config: UnitConfiguration, equipment: any[]): SlotRequirements {
    return this.slotCalculationManager.calculateRequiredSlots(config, equipment);
  }
  
  calculateAvailableSlots(config: UnitConfiguration): AvailableSlots {
    return this.slotCalculationManager.calculateAvailableSlots(config);
  }
  
  calculateSlotUtilization(config: UnitConfiguration, equipment: any[]): SlotUtilization {
    return this.slotCalculationManager.calculateSlotUtilization(config, equipment);
  }
  
  // ===== ALLOCATION METHODS =====
  
  allocateEquipmentSlots(config: UnitConfiguration, equipment: any[]): AllocationResult {
    return this.slotAllocationManager.allocateEquipmentSlots(config, equipment);
  }
  
  optimizeSlotAllocation(config: UnitConfiguration, equipment: any[]): OptimizationResult {
    const originalResult = this.allocateEquipmentSlots(config, equipment);
    const originalAllocations = originalResult.allocations;
    
    // Try different optimization strategies
    const strategies = [
      this.optimizeByLocation,
      this.optimizeBySize,
      this.optimizeByType,
      this.optimizeSpecialComponents
    ];
    
    let bestResult = originalResult;
    let bestScore = this.calculateAllocationScore(originalResult);
    
    for (const strategy of strategies) {
      const optimizedResult = strategy.call(this, config, equipment, originalAllocations);
      const score = this.calculateAllocationScore(optimizedResult);
      
      if (score > bestScore) {
        bestResult = optimizedResult;
        bestScore = score;
      }
    }
    
    const improvements = this.calculateImprovements(originalResult, bestResult);
    const recommendations = this.generateOptimizationRecommendations(improvements);
    
    return {
      optimized: bestScore > this.calculateAllocationScore(originalResult),
      originalAllocations,
      optimizedAllocations: bestResult.allocations,
      improvements,
      recommendations
    };
  }
  
  validateSlotAllocation(config: UnitConfiguration, equipment: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    const locationStatus: { [location: string]: any } = {};
    
    const allocation = this.allocateEquipmentSlots(config, equipment);
    const available = this.calculateAvailableSlots(config);
    
    // Validate each location
    Object.keys(available.byLocation).forEach(location => {
      const capacity = available.byLocation[location as keyof typeof available.byLocation];
      const used = this.getUsedSlotsInLocation(allocation.allocations, location);
      const conflicts = allocation.conflicts.filter(c => c.location === location);
      
      locationStatus[location] = {
        valid: used <= capacity && conflicts.length === 0,
        used,
        capacity,
        conflicts: conflicts.map(c => c.type)
      };
      
      // Check for overflow
      if (used > capacity) {
        errors.push({
          type: 'slot_overflow',
          location,
          component: 'Multiple',
          message: `Location ${location} has ${used} slots used but only ${capacity} available`,
          severity: 'high'
        });
      }
      
      // Check for near-capacity usage
      if (used / capacity > 0.9 && used <= capacity) {
        warnings.push({
          type: 'inefficient_placement',
          location,
          component: 'Multiple',
          message: `Location ${location} is near capacity (${Math.round(used / capacity * 100)}%)`,
          recommendation: 'Consider moving some equipment to other locations'
        });
      }
    });
    
    // Validate BattleTech rules
    this.validateBattleTechRules(config, allocation, errors, warnings);
    
    // Generate improvement suggestions
    suggestions.push(...this.generateValidationSuggestions(errors, warnings));
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      locationStatus
    };
  }
  
  // ===== SPECIAL COMPONENT HANDLING =====
  
  allocateSpecialComponents(config: UnitConfiguration): SpecialComponentAllocation {
    const endoSteel = this.calculateEndoSteelSlots(config);
    const ferroFibrous = this.calculateFerroFibrousSlots(config);
    
    // Handle other special components (CASE, Artemis, etc.)
    const altri = this.allocateOtherSpecialComponents(config);
    
    return {
      endoSteel: {
        required: this.getEndoSteelRequirement(config),
        allocated: endoSteel,
        conflicts: this.detectEndoSteelConflicts(config, endoSteel)
      },
      ferroFibrous: {
        required: this.getFerroFibrousRequirement(config),
        allocated: ferroFibrous,
        conflicts: this.detectFerroFibrousConflicts(config, ferroFibrous)
      },
      altri: {
        required: this.getOtherSpecialRequirements(config),
        allocated: altri,
        conflicts: this.detectOtherSpecialConflicts(config, altri)
      }
    };
  }
  
  calculateEndoSteelSlots(config: UnitConfiguration): EndoSteelSlotAllocation {
    const structureType = this.extractComponentType(config.structureType);
    
    if (structureType !== 'Endo Steel' && structureType !== 'Endo Steel (Clan)') {
      return {
        total: 0,
        allocations: {},
        isComplete: true,
        remainingSlots: 0
      };
    }
    
    const requiredSlots = structureType === 'Endo Steel (Clan)' ? 7 : 14;
    const allocations = this.distributeEndoSteelSlots(requiredSlots, config);
    
    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => sum + alloc.count, 0);
    
    return {
      total: requiredSlots,
      allocations,
      isComplete: totalAllocated >= requiredSlots,
      remainingSlots: Math.max(0, requiredSlots - totalAllocated)
    };
  }
  
  calculateFerroFibrousSlots(config: UnitConfiguration): FerroFibrousSlotAllocation {
    const armorType = this.extractComponentType(config.armorType);
    
    if (armorType !== 'Ferro-Fibrous' && armorType !== 'Ferro-Fibrous (Clan)') {
      return {
        total: 0,
        allocations: {},
        isComplete: true,
        remainingSlots: 0
      };
    }
    
    const requiredSlots = armorType === 'Ferro-Fibrous (Clan)' ? 7 : 14;
    const allocations = this.distributeFerroFibrousSlots(requiredSlots, config);
    
    const totalAllocated = Object.values(allocations).reduce((sum, alloc) => sum + alloc.count, 0);
    
    return {
      total: requiredSlots,
      allocations,
      isComplete: totalAllocated >= requiredSlots,
      remainingSlots: Math.max(0, requiredSlots - totalAllocated)
    };
  }
  
  // ===== CONFLICT DETECTION AND RESOLUTION =====
  
  detectSlotConflicts(config: UnitConfiguration, equipment: any[]): SlotConflict[] {
    const conflicts: SlotConflict[] = [];
    const allocation = this.allocateEquipmentSlots(config, equipment);
    
    // Check for slot overlaps
    conflicts.push(...this.detectSlotOverlaps(allocation.allocations));
    
    // Check for capacity violations
    conflicts.push(...this.detectCapacityViolations(config, allocation.allocations));
    
    // Check for rule violations
    conflicts.push(...this.detectRuleViolations(config, allocation.allocations));
    
    return conflicts;
  }
  
  resolveSlotConflicts(conflicts: SlotConflict[]): ConflictResolution {
    const resolved: SlotConflict[] = [];
    const unresolved: SlotConflict[] = [];
    const newAllocations: EquipmentAllocation[] = [];
    
    for (const conflict of conflicts) {
      if (conflict.resolvable) {
        const resolution = this.resolveSingleConflict(conflict);
        if (resolution.success) {
          resolved.push(conflict);
          newAllocations.push(...resolution.allocations);
        } else {
          unresolved.push(conflict);
        }
      } else {
        unresolved.push(conflict);
      }
    }
    
    return {
      resolved,
      unresolved,
      newAllocations,
      success: unresolved.length === 0,
      explanation: this.generateResolutionExplanation(resolved, unresolved)
    };
  }
  
  suggestSlotReorganization(config: UnitConfiguration, equipment: any[]): ReorganizationSuggestion[] {
    const suggestions: ReorganizationSuggestion[] = [];
    const utilization = this.calculateSlotUtilization(config, equipment);
    
    // Suggest moving equipment from bottleneck locations
    for (const bottleneck of utilization.bottlenecks) {
      suggestions.push(...this.generateBottleneckSuggestions(bottleneck, config, equipment));
    }
    
    // Suggest optimizing special component placement
    suggestions.push(...this.generateSpecialComponentSuggestions(config));
    
    // Suggest equipment consolidation
    suggestions.push(...this.generateConsolidationSuggestions(equipment));
    
    return suggestions.filter(s => s.feasible);
  }
  
  // ===== ANALYSIS AND REPORTING =====
  
  analyzeSlotEfficiency(config: UnitConfiguration, equipment: any[]): EfficiencyAnalysis {
    const utilization = this.calculateSlotUtilization(config, equipment);
    const allocation = this.allocateEquipmentSlots(config, equipment);
    
    const locationEfficiency: { [location: string]: any } = {};
    let totalEfficiency = 0;
    
    Object.keys(utilization.byLocation).forEach(location => {
      const locationData = utilization.byLocation[location];
      const wastedSlots = this.calculateWastedSlots(location, allocation.allocations);
      
      const efficiency = Math.max(0, 100 - wastedSlots * 10 - (100 - locationData.percentage) * 0.5);
      
      locationEfficiency[location] = {
        efficiency,
        utilization: locationData.percentage,
        wastedSlots,
        suggestions: this.generateLocationSuggestions(location, locationData, wastedSlots)
      };
      
      totalEfficiency += efficiency;
    });
    
    const overallEfficiency = totalEfficiency / Object.keys(locationEfficiency).length;
    const optimizationPotential = this.calculateOptimizationPotential(locationEfficiency);
    const recommendations = this.generateEfficiencyRecommendations(locationEfficiency, overallEfficiency);
    
    return {
      overallEfficiency,
      locationEfficiency,
      bottlenecks: utilization.bottlenecks,
      optimizationPotential,
      recommendations
    };
  }
  
  generateSlotReport(config: UnitConfiguration, equipment: any[]): SlotReport {
    const available = this.calculateAvailableSlots(config);
    const required = this.calculateRequiredSlots(config, equipment);
    const allocation = this.allocateEquipmentSlots(config, equipment);
    const specialComponents = this.allocateSpecialComponents(config);
    const conflicts = this.detectSlotConflicts(config, equipment);
    
    const summary = {
      totalSlots: available.total,
      usedSlots: required.total,
      availableSlots: available.total - required.total,
      utilization: (required.total / available.total) * 100,
      efficiency: this.calculateOverallEfficiency(config, equipment)
    };
    
    const locationBreakdown: { [location: string]: any } = {};
    
    Object.keys(available.byLocation).forEach(location => {
      const capacity = available.byLocation[location as keyof typeof available.byLocation];
      const used = required.byLocation[location as keyof typeof required.byLocation];
      const equipment = this.getEquipmentInLocation(allocation.allocations, location);
      const special = this.getSpecialComponentsInLocation(specialComponents, location);
      const locationConflicts = conflicts.filter(c => c.location === location).map(c => c.type);
      
      locationBreakdown[location] = {
        capacity,
        used,
        available: capacity - used,
        equipment,
        specialComponents: special,
        conflicts: locationConflicts
      };
    });
    
    const recommendations = this.generateReportRecommendations(summary, locationBreakdown, conflicts);
    
    return {
      summary,
      locationBreakdown,
      specialComponents,
      conflicts,
      recommendations
    };
  }
  
  findAvailableSlots(config: UnitConfiguration, equipment: any[], requiredSlots: number): AvailableSlotLocation[] {
    const allocation = this.allocateEquipmentSlots(config, equipment);
    const available = this.calculateAvailableSlots(config);
    const locations: AvailableSlotLocation[] = [];
    
    Object.keys(available.byLocation).forEach(location => {
      const capacity = available.byLocation[location as keyof typeof available.byLocation];
      const used = this.getUsedSlotsInLocation(allocation.allocations, location);
      const availableSlots = this.getAvailableSlotNumbers(location, capacity, used);
      
      if (availableSlots.length >= requiredSlots) {
        const contiguous = this.hasContiguousSlots(availableSlots, requiredSlots);
        const suitableFor = this.getSuitableEquipmentTypes(location);
        const restrictions = this.getLocationRestrictions(location, config);
        
        locations.push({
          location,
          availableSlots,
          contiguous,
          suitableFor,
          restrictions
        });
      }
    });
    
    return locations.sort((a, b) => b.availableSlots.length - a.availableSlots.length);
  }
  
  /**
   * Calculate critical slots broken down by location with proper BattleTech rules
   */
  public calculateLocationBreakdown(config: UnitConfiguration, equipment: any[]): CompleteCriticalSlotBreakdown {
    // This method needs to be completely rewritten to use the new concrete types
    // For now, return a simplified version that matches the interface
    const engineType = this.extractComponentType(config.engineType);
    const gyroType = this.extractComponentType(config.gyroType);
    
    // Create concrete component objects
    const engineComponent: EngineComponent = {
      type: 'engine',
      engineType,
      totalSlots: this.getEngineSlots(engineType),
      locationAllocation: this.getEngineAllocationByLocation(engineType),
      weight: 0, // Would need to calculate
      rating: 0, // Would need to get from config
      techBase: 'Inner Sphere' // Would need to get from config
    };
    
    const gyroComponent: GyroComponent = {
      type: 'gyro',
      gyroType,
      slots: this.getGyroSlots(gyroType),
      location: 'centerTorso',
      weight: 0, // Would need to calculate
      techBase: 'Inner Sphere' // Would need to get from config
    };
    
    const cockpitComponent: CockpitComponent = {
      type: 'cockpit',
      cockpitType: 'Standard',
      slots: 1,
      location: 'head',
      weight: 3,
      techBase: 'Inner Sphere'
    };
    
    // Calculate equipment slots
    const equipmentSlots = equipment.reduce((total, item) => {
      if (!item?.equipmentData) return total;
      const slots = item.equipmentData.criticals || item.equipmentData.requiredSlots || 1;
      const quantity = item.quantity || 1;
      return total + (slots * quantity);
    }, 0);
    
    // Calculate totals
    const totalSlots = TOTAL_CRITICAL_SLOTS;
    const usedSlots = engineComponent.totalSlots + gyroComponent.slots + cockpitComponent.slots + equipmentSlots;
    const utilizationPercentage = (usedSlots / totalSlots) * 100;
    
    // Debug logging
    console.log('[CriticalSlotCalculator] Equipment calculation:', {
      equipmentCount: equipment.length,
      equipmentSlots,
      engineSlots: engineComponent.totalSlots,
      gyroSlots: gyroComponent.slots,
      cockpitSlots: cockpitComponent.slots,
      totalUsedSlots: usedSlots
    });
    
    // Determine efficiency
    let efficiency: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (utilizationPercentage <= 70) efficiency = 'excellent';
    else if (utilizationPercentage <= 85) efficiency = 'good';
    else if (utilizationPercentage <= 95) efficiency = 'fair';
    else if (utilizationPercentage <= 100) efficiency = 'poor';
    else efficiency = 'critical';
    
    return {
      locations: {
        head: {
          location: 'head',
          totalSlots: 6,
          fixedComponents: {
            lifeSupport: [],
            sensors: [],
            cockpit: cockpitComponent
          },
          equipment: [],
          availableSlots: 5,
          utilization: {
            used: 1,
            percentage: 16.7,
            efficiency: 'excellent'
          }
        },
        centerTorso: {
          location: 'centerTorso',
          totalSlots: 12,
          systemComponents: {
            engine: engineComponent,
            gyro: gyroComponent
          },
          equipment: [],
          availableSlots: 12 - engineComponent.locationAllocation.centerTorso - gyroComponent.slots,
          utilization: {
            used: engineComponent.locationAllocation.centerTorso + gyroComponent.slots,
            percentage: ((engineComponent.locationAllocation.centerTorso + gyroComponent.slots) / 12) * 100,
            efficiency: 'good'
          }
        },
        leftTorso: {
          location: 'leftTorso',
          totalSlots: 12,
          systemComponents: {},
          equipment: [],
          availableSlots: 12 - engineComponent.locationAllocation.leftTorso,
          utilization: {
            used: engineComponent.locationAllocation.leftTorso,
            percentage: (engineComponent.locationAllocation.leftTorso / 12) * 100,
            efficiency: 'excellent'
          }
        },
        rightTorso: {
          location: 'rightTorso',
          totalSlots: 12,
          systemComponents: {},
          equipment: [],
          availableSlots: 12 - engineComponent.locationAllocation.rightTorso,
          utilization: {
            used: engineComponent.locationAllocation.rightTorso,
            percentage: (engineComponent.locationAllocation.rightTorso / 12) * 100,
            efficiency: 'excellent'
          }
        },
        leftArm: {
          location: 'leftArm',
          totalSlots: 12,
          systemComponents: {
            actuators: []
          },
          equipment: [],
          availableSlots: 8,
          utilization: {
            used: 4,
            percentage: 33.3,
            efficiency: 'excellent'
          }
        },
        rightArm: {
          location: 'rightArm',
          totalSlots: 12,
          systemComponents: {
            actuators: []
          },
          equipment: [],
          availableSlots: 8,
          utilization: {
            used: 4,
            percentage: 33.3,
            efficiency: 'excellent'
          }
        },
        leftLeg: {
          location: 'leftLeg',
          totalSlots: 6,
          systemComponents: {
            actuators: []
          },
          equipment: [],
          availableSlots: 2,
          utilization: {
            used: 4,
            percentage: 66.7,
            efficiency: 'good'
          }
        },
        rightLeg: {
          location: 'rightLeg',
          totalSlots: 6,
          systemComponents: {
            actuators: []
          },
          equipment: [],
          availableSlots: 2,
          utilization: {
            used: 4,
            percentage: 66.7,
            efficiency: 'good'
          }
        }
      },
      components: {
        system: {
          engine: engineComponent,
          gyro: gyroComponent,
          cockpit: cockpitComponent,
          lifeSupport: [],
          sensors: [],
          actuators: []
        },
        equipment: []
      },
      summary: {
        totalSlots: 78,
        usedSlots,
        availableSlots: totalSlots - usedSlots,
        utilizationPercentage,
        efficiency
      },
      analysis: {
        bottlenecks: [],
        optimizationPotential: 0,
        recommendations: [],
        violations: []
      }
    };
  }
  
  /**
   * Get engine allocation by location based on engine type
   */
  private getEngineAllocationByLocation(engineType: string): { centerTorso: number; leftTorso: number; rightTorso: number } {
    switch (engineType) {
      case 'Standard':
      case 'ICE':
      case 'Fuel Cell':
        return { centerTorso: 6, leftTorso: 0, rightTorso: 0 }; // 6 slots in center torso
      case 'XL':
        return { centerTorso: 6, leftTorso: 3, rightTorso: 3 }; // 6 CT + 3 each side
      case 'Light':
        return { centerTorso: 4, leftTorso: 3, rightTorso: 3 }; // 4 CT + 3 each side
      case 'XXL':
        return { centerTorso: 6, leftTorso: 6, rightTorso: 6 }; // 6 CT + 6 each side
      case 'Compact':
        return { centerTorso: 3, leftTorso: 0, rightTorso: 0 }; // 3 slots in center torso only
      default:
        return { centerTorso: 6, leftTorso: 0, rightTorso: 0 }; // Standard fusion engine
    }
  }
  
  /**
   * Distribute equipment across locations based on type and suitability
   */
  private distributeEquipmentByLocation(equipment: any[]): { [location: string]: number } {
    const distribution: { [location: string]: number } = {
      head: 0,
      centerTorso: 0,
      leftTorso: 0,
      rightTorso: 0,
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0
    };
    
    equipment.forEach(item => {
      if (!item?.equipmentData) return;
      
      const slots = item.equipmentData.criticals || 1;
      const quantity = item.quantity || 1;
      const totalSlots = slots * quantity;
      
      // Determine suitable locations based on equipment type
      const suitableLocations = this.getSuitableLocationsForEquipment(item);
      
      // Distribute slots across suitable locations
      let remainingSlots = totalSlots;
      for (const location of suitableLocations) {
        if (remainingSlots <= 0) break;
        
        const maxSlotsInLocation = this.getMaxSlotsForLocation(location, item);
        const slotsToAdd = Math.min(remainingSlots, maxSlotsInLocation);
        
        distribution[location] += slotsToAdd;
        remainingSlots -= slotsToAdd;
      }
    });
    
    return distribution;
  }
  
  /**
   * Get suitable locations for equipment based on type
   */
  private getSuitableLocationsForEquipment(item: any): string[] {
    const equipmentType = item.equipmentData?.type || 'equipment';
    const isExplosive = item.equipmentData?.explosive || false;
    
    switch (equipmentType) {
      case 'ammunition':
        return isExplosive ? ['leftTorso', 'rightTorso', 'centerTorso'] : ['leftTorso', 'rightTorso', 'centerTorso', 'leftArm', 'rightArm'];
      case 'weapon':
        return ['leftTorso', 'rightTorso', 'centerTorso', 'leftArm', 'rightArm'];
      case 'heat_sink':
        return ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'];
      case 'equipment':
        return ['leftTorso', 'rightTorso', 'centerTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
      default:
        return ['leftTorso', 'rightTorso', 'centerTorso'];
    }
  }
  
  /**
   * Get maximum slots available for equipment in a location
   */
  private getMaxSlotsForLocation(location: string, item: any): number {
    const equipmentType = item.equipmentData?.type || 'equipment';
    
    switch (location) {
      case 'head':
        return equipmentType === 'equipment' ? 1 : 0; // Very limited head space
      case 'centerTorso':
        return 12; // Full capacity, but engine/gyro will reduce available
      case 'leftTorso':
      case 'rightTorso':
        return 12; // Full capacity, but engine may reduce available
      case 'leftArm':
      case 'rightArm':
        return 8; // 12 total - 4 actuators = 8 available
      case 'leftLeg':
      case 'rightLeg':
        return 2; // 6 total - 4 actuators = 2 available
      default:
        return 0;
    }
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  public extractComponentType(component: ComponentConfiguration | string): string {
    if (typeof component === 'string') return component;
    return component.type;
  }
  
  public calculateSystemComponentSlots(config: UnitConfiguration): number {
    // MIGRATED: Use SystemComponentsGateway for slot calculations
    const engineType = this.extractComponentType(config.engineType);
    const gyroType = this.extractComponentType(config.gyroType);
    
    const engineSlots = this.getEngineSlots(engineType);
    const gyroSlots = this.getGyroSlots(gyroType);
    
    return engineSlots + gyroSlots;
  }
  
  private getEngineId(engineType: string): string {
    // Map engine type to component database ID
    const engineMap: Record<string, string> = {
      'Standard': 'standard_fusion_engine',
      'XL': 'xl_fusion_engine',
      'Light': 'light_fusion_engine',
      'XXL': 'xxl_fusion_engine',
      'Compact': 'compact_fusion_engine',
      'ICE': 'standard_fusion_engine', // Use standard for now
      'Fuel Cell': 'standard_fusion_engine' // Use standard for now
    };
    return engineMap[engineType] || 'standard_fusion_engine';
  }
  
  private getGyroId(gyroType: string): string {
    // Map gyro type to component database ID
    const gyroMap: Record<string, string> = {
      'Standard': 'standard_gyro',
      'XL': 'xl_gyro',
      'Compact': 'compact_gyro',
      'Heavy-Duty': 'heavy_duty_gyro'
    };
    return gyroMap[gyroType] || 'standard_gyro';
  }
  
  public calculateSpecialComponentSlots(config: UnitConfiguration): number {
    // MIGRATED: Use SystemComponentsGateway for structure calculations
    // TODO: Add ArmorAdapter when implemented
    let slots = 0;

    // Structure slots
    const structureType = this.extractComponentType(config.structureType);
    const structureId = this.getStructureId(structureType);
    const context = SystemComponentsGateway.createContext({
      tonnage: config.tonnage,
      techBase: 'Inner Sphere', // TODO: Get from config
      unitType: 'BattleMech'
    });
    
    const structure = SystemComponentsGateway.getStructureById(structureId, context);
    if (structure) {
      slots += structure.slots;
    }

    // Armor slots - TODO: Implement when ArmorAdapter is ready
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Ferro-Fibrous') {
      slots += 14;
    } else if (armorType === 'Ferro-Fibrous (Clan)') {
      slots += 7;
    } else if (armorType === 'Light Ferro-Fibrous') {
      slots += 7;
    } else if (armorType === 'Heavy Ferro-Fibrous') {
      slots += 21;
    } else if (armorType === 'Stealth') {
      slots += 12;
    }

    return slots;
  }
  
  private getStructureId(structureType: string): string {
    // Map structure type to component database ID
    const structureMap: Record<string, string> = {
      'Standard': 'standard_structure',
      'Endo Steel': 'endo_steel_structure',
      'Endo Steel (Clan)': 'endo_steel_clan_structure'
    };
    return structureMap[structureType] || 'standard_structure';
  }
  
  private getArmorId(armorType: string): string {
    // Map armor type to component database ID
    const armorMap: Record<string, string> = {
      'Standard': 'standard_armor',
      'Ferro-Fibrous': 'ferro_fibrous_armor',
      'Ferro-Fibrous (Clan)': 'ferro_fibrous_clan_armor',
      'Light Ferro-Fibrous': 'light_ferro_fibrous_armor',
      'Heavy Ferro-Fibrous': 'heavy_ferro_fibrous_armor',
      'Stealth': 'stealth_armor',
      'Reactive': 'reactive_armor',
      'Reflective': 'reflective_armor',
    };
    return armorMap[armorType] || 'standard_armor';
  }
  
  private calculateEquipmentSlots(equipment: any[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipmentData) return total;
      const slotsPerItem = item.equipmentData.criticals || 1;
      const quantity = item.quantity || 1;
      return total + (slotsPerItem * quantity);
    }, 0);
  }
  
  private getAmmoSlots(equipment: any[]): number {
    return equipment.reduce((total, item) => {
      if (!item?.equipmentData || item.equipmentData.type !== 'ammunition') return total;
      const slotsPerItem = item.equipmentData.criticals || 1;
      const quantity = item.quantity || 1;
      return total + (slotsPerItem * quantity);
    }, 0);
  }
  
  private distributeSlotsByLocation(config: UnitConfiguration, equipment: any[]) {
    // Simplified distribution logic - in reality this would be much more complex
    const totalSlots = this.calculateRequiredSlots(config, equipment).total;
    const locations = Object.keys(this.STANDARD_SLOT_COUNTS);
    const slotsPerLocation = Math.ceil(totalSlots / locations.length);
    
    const distribution: any = {};
    locations.forEach(location => {
      distribution[location] = Math.min(slotsPerLocation, this.STANDARD_SLOT_COUNTS[location as keyof typeof this.STANDARD_SLOT_COUNTS]);
    });
    
    return distribution;
  }
  
  private getTotalAvailableSlots(config: UnitConfiguration): number {
    return Object.values(this.STANDARD_SLOT_COUNTS).reduce((sum, slots) => sum + slots, 0);
  }
  
  public getEngineSlots(engineType: string): number {
    // MIGRATED: Use SystemComponentsGateway for engine slot calculation
    const engineId = this.mapEngineTypeToId(engineType);
    const context = SystemComponentsGateway.createContext();
    const engine = SystemComponentsGateway.getEngineById(engineId, context);
    
    if (engine && engine.slots) {
      return (engine.slots['Center Torso'] || 0) + 
             (engine.slots['Left Torso'] || 0) + 
             (engine.slots['Right Torso'] || 0);
    }
    
    // Fallback to hardcoded values if gateway doesn't return engine
    return this.getEngineAllocationByLocation(engineType).centerTorso +
           this.getEngineAllocationByLocation(engineType).leftTorso +
           this.getEngineAllocationByLocation(engineType).rightTorso;
  }
  
  private mapEngineTypeToId(engineType: string): string {
    const engineMap: Record<string, string> = {
      'Standard': 'standard_fusion_engine',
      'XL': 'xl_fusion_engine',
      'Light': 'light_fusion_engine',
      'XXL': 'xxl_fusion_engine',
      'Compact': 'compact_fusion_engine',
      'ICE': 'ice_engine',
      'Fuel Cell': 'fuel_cell_engine'
    };
    return engineMap[engineType] || 'standard_fusion_engine';
  }
  
  public getGyroSlots(gyroType: string): number {
    // MIGRATED: Use SystemComponentsGateway for gyro slot calculation
    const gyroId = this.mapGyroTypeToId(gyroType);
    const context = SystemComponentsGateway.createContext();
    const gyro = SystemComponentsGateway.getGyroById(gyroId, context);
    
    if (gyro) {
      return gyro.slots;
    }
    
    // Fallback to hardcoded values if gateway doesn't return gyro
    switch (gyroType) {
      case 'Standard': return 4;
      case 'Compact': return 2;
      case 'XL': return 6;
      case 'Heavy-Duty': return 4;
      default: return 4;
    }
  }
  
  private mapGyroTypeToId(gyroType: string): string {
    const gyroMap: Record<string, string> = {
      'Standard': 'standard_gyro',
      'XL': 'xl_gyro',
      'Compact': 'compact_gyro',
      'Heavy-Duty': 'heavy_duty_gyro'
    };
    return gyroMap[gyroType] || 'standard_gyro';
  }
  
  private generateUtilizationRecommendations(byLocation: any, bottlenecks: string[]): string[] {
    const recommendations: string[] = [];
    
    if (bottlenecks.length > 0) {
      recommendations.push(`Critical slot usage in: ${bottlenecks.join(', ')}`);
      recommendations.push('Consider moving equipment to less utilized locations');
    }
    
    return recommendations;
  }
  
  private allocateSystemComponents(config: UnitConfiguration): EquipmentAllocation[] {
    const allocations: EquipmentAllocation[] = [];
    
    // Simplified system component allocation
    allocations.push({
      equipment: { equipmentData: { name: 'Engine' } },
      location: 'centerTorso',
      slots: [0, 1, 2, 7, 8, 9],
      validated: true,
      conflicts: []
    });
    
    allocations.push({
      equipment: { equipmentData: { name: 'Gyro' } },
      location: 'centerTorso',
      slots: [3, 4, 5, 6],
      validated: true,
      conflicts: []
    });
    
    return allocations;
  }
  
  private allocateSpecialComponentsToSlots(config: UnitConfiguration): { allocations: EquipmentAllocation[], conflicts: SlotConflict[] } {
    const allocations: EquipmentAllocation[] = [];
    const conflicts: SlotConflict[] = [];
    
    const endoSteel = this.calculateEndoSteelSlots(config);
    const ferroFibrous = this.calculateFerroFibrousSlots(config);
    
    // Add allocations for special components
    if (endoSteel.total > 0) {
      Object.entries(endoSteel.allocations).forEach(([location, alloc]) => {
        allocations.push({
          equipment: { equipmentData: { name: 'Endo Steel' } },
          location,
          slots: alloc.slots,
          validated: true,
          conflicts: []
        });
      });
    }
    
    return { allocations, conflicts };
  }
  
  private allocateSingleEquipment(item: any, config: UnitConfiguration, existingAllocations: EquipmentAllocation[]): { success: boolean, allocation?: EquipmentAllocation, conflicts: SlotConflict[], warnings: string[] } {
    const conflicts: SlotConflict[] = [];
    const warnings: string[] = [];
    
    if (!item?.equipmentData) {
      return { success: false, conflicts, warnings };
    }
    
    const requiredSlots = item.equipmentData.criticals || 1;
    const suitableLocations = this.getSuitableLocations(item, config);
    
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
    
    return { success: false, conflicts, warnings };
  }
  
  private generateAllocationSuggestions(config: UnitConfiguration, allocations: EquipmentAllocation[], unallocated: any[]): string[] {
    const suggestions: string[] = [];
    
    if (unallocated.length > 0) {
      suggestions.push(`${unallocated.length} items could not be allocated`);
      suggestions.push('Consider using advanced structure types to free up slots');
    }
    
    return suggestions;
  }
  
  private optimizeByLocation(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    // Simplified optimization - return original result
    return this.allocateEquipmentSlots(config, equipment);
  }
  
  private optimizeBySize(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    return this.allocateEquipmentSlots(config, equipment);
  }
  
  private optimizeByType(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    return this.allocateEquipmentSlots(config, equipment);
  }
  
  private optimizeSpecialComponents(config: UnitConfiguration, equipment: any[], allocations: EquipmentAllocation[]): AllocationResult {
    return this.allocateEquipmentSlots(config, equipment);
  }
  
  private calculateAllocationScore(result: AllocationResult): number {
    let score = 0;
    score += result.allocations.length * 10;
    score -= result.conflicts.length * 20;
    score -= result.unallocated.length * 15;
    return Math.max(0, score);
  }
  
  private calculateImprovements(original: AllocationResult, optimized: AllocationResult): any {
    return {
      slotsFreed: optimized.allocations.length - original.allocations.length,
      conflictsResolved: original.conflicts.length - optimized.conflicts.length,
      efficiencyGain: this.calculateAllocationScore(optimized) - this.calculateAllocationScore(original)
    };
  }
  
  private generateOptimizationRecommendations(improvements: any): string[] {
    const recommendations: string[] = [];
    
    if (improvements.slotsFreed > 0) {
      recommendations.push(`Freed ${improvements.slotsFreed} critical slots`);
    }
    
    if (improvements.conflictsResolved > 0) {
      recommendations.push(`Resolved ${improvements.conflictsResolved} conflicts`);
    }
    
    return recommendations;
  }
  
  private getUsedSlotsInLocation(allocations: EquipmentAllocation[], location: string): number {
    return allocations
      .filter(alloc => alloc.location === location)
      .reduce((total, alloc) => total + alloc.slots.length, 0);
  }
  
  private validateBattleTechRules(config: UnitConfiguration, allocation: AllocationResult, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Add BattleTech-specific validation rules
    // This is simplified - real implementation would check many more rules
  }
  
  private generateValidationSuggestions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];
    
    if (errors.length > 0) {
      suggestions.push('Fix critical errors before proceeding');
    }
    
    if (warnings.length > 0) {
      suggestions.push('Consider addressing warnings for optimal design');
    }
    
    return suggestions;
  }
  
  private allocateOtherSpecialComponents(config: UnitConfiguration): { [location: string]: number[] } {
    return {}; // Simplified implementation
  }
  
  public getEndoSteelRequirement(config: UnitConfiguration): number {
    const structureType = this.extractComponentType(config.structureType);
    if (structureType === 'Endo Steel') return 14;
    if (structureType === 'Endo Steel (Clan)') return 7;
    return 0;
  }
  
  private detectEndoSteelConflicts(config: UnitConfiguration, allocation: EndoSteelSlotAllocation): string[] {
    return []; // Simplified implementation
  }
  
  public getFerroFibrousRequirement(config: UnitConfiguration): number {
    const armorType = this.extractComponentType(config.armorType);
    if (armorType === 'Ferro-Fibrous') return 14;
    if (armorType === 'Ferro-Fibrous (Clan)') return 7;
    return 0;
  }
  
  private detectFerroFibrousConflicts(config: UnitConfiguration, allocation: FerroFibrousSlotAllocation): string[] {
    return []; // Simplified implementation
  }
  
  private getOtherSpecialRequirements(config: UnitConfiguration): number {
    return 0; // Simplified implementation
  }
  
  private detectOtherSpecialConflicts(config: UnitConfiguration, allocation: { [location: string]: number[] }): string[] {
    return []; // Simplified implementation
  }
  
  private distributeEndoSteelSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    const allocations: { [location: string]: { slots: number[], count: number } } = {};
    
    // Simplified distribution logic
    const locations = Object.keys(this.STANDARD_SLOT_COUNTS);
    const slotsPerLocation = Math.ceil(requiredSlots / locations.length);
    
    locations.forEach(location => {
      const capacity = this.STANDARD_SLOT_COUNTS[location as keyof typeof this.STANDARD_SLOT_COUNTS];
      const allocatedSlots = Math.min(slotsPerLocation, capacity, requiredSlots);
      
      if (allocatedSlots > 0) {
        allocations[location] = {
          slots: Array.from({ length: allocatedSlots }, (_, i) => capacity - allocatedSlots + i),
          count: allocatedSlots
        };
        requiredSlots -= allocatedSlots;
      }
    });
    
    return allocations;
  }
  
  private distributeFerroFibrousSlots(requiredSlots: number, config: UnitConfiguration): { [location: string]: { slots: number[], count: number } } {
    return this.distributeEndoSteelSlots(requiredSlots, config); // Same logic for now
  }
  
  private detectSlotOverlaps(allocations: EquipmentAllocation[]): SlotConflict[] {
    const conflicts: SlotConflict[] = [];
    const usedSlots: { [location: string]: { [slot: number]: string[] } } = {};
    
    allocations.forEach(allocation => {
      if (!usedSlots[allocation.location]) {
        usedSlots[allocation.location] = {};
      }
      
      allocation.slots.forEach(slot => {
        if (!usedSlots[allocation.location][slot]) {
          usedSlots[allocation.location][slot] = [];
        }
        usedSlots[allocation.location][slot].push(allocation.equipment?.equipmentData?.name || 'Unknown');
        
        if (usedSlots[allocation.location][slot].length > 1) {
          conflicts.push({
            type: 'overlap',
            location: allocation.location,
            slot,
            conflictingComponents: usedSlots[allocation.location][slot],
            severity: 'critical',
            resolvable: true,
            suggestions: ['Move one component to a different location']
          });
        }
      });
    });
    
    return conflicts;
  }
  
  private detectCapacityViolations(config: UnitConfiguration, allocations: EquipmentAllocation[]): SlotConflict[] {
    const conflicts: SlotConflict[] = [];
    
    Object.keys(this.STANDARD_SLOT_COUNTS).forEach(location => {
      const capacity = this.STANDARD_SLOT_COUNTS[location as keyof typeof this.STANDARD_SLOT_COUNTS];
      const used = this.getUsedSlotsInLocation(allocations, location);
      
      if (used > capacity) {
        conflicts.push({
          type: 'capacity_exceeded',
          location,
          slot: -1,
          conflictingComponents: ['Multiple'],
          severity: 'critical',
          resolvable: true,
          suggestions: ['Move equipment to other locations']
        });
      }
    });
    
    return conflicts;
  }
  
  private detectRuleViolations(config: UnitConfiguration, allocations: EquipmentAllocation[]): SlotConflict[] {
    return []; // Simplified implementation
  }
  
  private resolveSingleConflict(conflict: SlotConflict): { success: boolean, allocations: EquipmentAllocation[] } {
    return { success: false, allocations: [] }; // Simplified implementation
  }
  
  private generateResolutionExplanation(resolved: SlotConflict[], unresolved: SlotConflict[]): string {
    return `Resolved ${resolved.length} conflicts, ${unresolved.length} remain unresolved`;
  }
  
  private generateBottleneckSuggestions(bottleneck: string, config: UnitConfiguration, equipment: any[]): ReorganizationSuggestion[] {
    return [{
      type: 'move_equipment',
      component: 'Heavy equipment',
      fromLocation: bottleneck,
      toLocation: 'centerTorso',
      benefit: 'Reduce bottleneck pressure',
      impact: 'minor',
      feasible: true
    }];
  }
  
  private generateSpecialComponentSuggestions(config: UnitConfiguration): ReorganizationSuggestion[] {
    return []; // Simplified implementation
  }
  
  private generateConsolidationSuggestions(equipment: any[]): ReorganizationSuggestion[] {
    return []; // Simplified implementation
  }
  
  private calculateWastedSlots(location: string, allocations: EquipmentAllocation[]): number {
    // Calculate slots that could be better utilized
    return 0; // Simplified implementation
  }
  
  private generateLocationSuggestions(location: string, locationData: any, wastedSlots: number): string[] {
    const suggestions: string[] = [];
    
    if (wastedSlots > 0) {
      suggestions.push(`${wastedSlots} slots could be better utilized in ${location}`);
    }
    
    return suggestions;
  }
  
  private calculateOptimizationPotential(locationEfficiency: any): number {
    const efficiencies = Object.values(locationEfficiency).map((loc: any) => loc.efficiency);
    const averageEfficiency = efficiencies.reduce((sum: number, eff: any) => sum + eff, 0) / efficiencies.length;
    return Math.max(0, 100 - averageEfficiency);
  }
  
  private generateEfficiencyRecommendations(locationEfficiency: any, overallEfficiency: number): string[] {
    const recommendations: string[] = [];
    
    if (overallEfficiency < 70) {
      recommendations.push('Consider reorganizing equipment placement for better efficiency');
    }
    
    return recommendations;
  }
  
  private calculateOverallEfficiency(config: UnitConfiguration, equipment: any[]): string {
    const utilization = this.calculateSlotUtilization(config, equipment);
    
    if (utilization.percentageUsed < 60) return 'excellent';
    if (utilization.percentageUsed < 75) return 'good';
    if (utilization.percentageUsed < 90) return 'fair';
    return 'poor';
  }
  
  private getEquipmentInLocation(allocations: EquipmentAllocation[], location: string): string[] {
    return allocations
      .filter(alloc => alloc.location === location)
      .map(alloc => alloc.equipment?.equipmentData?.name || 'Unknown');
  }
  
  private getSpecialComponentsInLocation(specialComponents: SpecialComponentAllocation, location: string): string[] {
    const components: string[] = [];
    
    if (specialComponents.endoSteel.allocated.allocations[location]) {
      components.push('Endo Steel');
    }
    
    if (specialComponents.ferroFibrous.allocated.allocations[location]) {
      components.push('Ferro-Fibrous');
    }
    
    return components;
  }
  
  private generateReportRecommendations(summary: any, locationBreakdown: any, conflicts: SlotConflict[]): string[] {
    const recommendations: string[] = [];
    
    if (summary.utilization > 90) {
      recommendations.push('Critical slot usage is very high - consider weight optimization');
    }
    
    if (conflicts.length > 0) {
      recommendations.push('Resolve slot conflicts before finalizing design');
    }
    
    return recommendations;
  }
  
  private getAvailableSlotNumbers(location: string, capacity: number, usedCount: number): number[] {
    const availableSlots: number[] = [];
    
    for (let i = 0; i < capacity; i++) {
      // Simplified - in reality would check actual slot usage
      if (i >= usedCount) {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  }
  
  private hasContiguousSlots(availableSlots: number[], requiredSlots: number): boolean {
    if (availableSlots.length < requiredSlots) return false;
    
    for (let i = 0; i <= availableSlots.length - requiredSlots; i++) {
      let contiguous = true;
      for (let j = 1; j < requiredSlots; j++) {
        if (availableSlots[i + j] !== availableSlots[i + j - 1] + 1) {
          contiguous = false;
          break;
        }
      }
      if (contiguous) return true;
    }
    
    return false;
  }
  
  private getSuitableEquipmentTypes(location: string): string[] {
    switch (location) {
      case 'head':
        return ['sensors', 'cockpit_equipment'];
      case 'centerTorso':
        return ['engine', 'gyro', 'weapons', 'equipment'];
      case 'leftTorso':
      case 'rightTorso':
        return ['weapons', 'equipment', 'ammunition'];
      case 'leftArm':
      case 'rightArm':
        return ['weapons', 'equipment'];
      case 'leftLeg':
      case 'rightLeg':
        return ['equipment', 'heat_sinks'];
      default:
        return ['equipment'];
    }
  }
  
  private getLocationRestrictions(location: string, config: UnitConfiguration): string[] {
    const restrictions: string[] = [];
    
    if (location === 'head') {
      restrictions.push('Limited to 1 ton equipment');
      restrictions.push('No ammunition allowed');
    }
    
    return restrictions;
  }
  
  private getSuitableLocations(item: any, config: UnitConfiguration): string[] {
    // Simplified location suitability logic
    const allLocations = Object.keys(this.STANDARD_SLOT_COUNTS);
    
    if (item.equipmentData?.type === 'ammunition' && item.equipmentData?.explosive) {
      // Avoid head for explosive ammunition
      return allLocations.filter(loc => loc !== 'head');
    }
    
    return allLocations;
  }
  
  private findAvailableSlotsInLocation(location: string, requiredSlots: number, existingAllocations: EquipmentAllocation[]): number[] {
    const capacity = this.STANDARD_SLOT_COUNTS[location as keyof typeof this.STANDARD_SLOT_COUNTS];
    const usedSlots = new Set<number>();
    
    existingAllocations
      .filter(alloc => alloc.location === location)
      .forEach(alloc => alloc.slots.forEach(slot => usedSlots.add(slot)));
    
    const availableSlots: number[] = [];
    for (let i = 0; i < capacity; i++) {
      if (!usedSlots.has(i)) {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  }


}

// Backwards compatibility: Static methods that delegate to instance implementation
export class CriticalSlotCalculatorStatic {
  // Legacy static method for backwards compatibility
  static calculateStructuralSlots(config: UnitConfiguration): any {
    const instance = new CriticalSlotCalculatorImpl();
    const systemSlots = instance.calculateSystemComponentSlots(config);
    const specialSlots = instance.calculateSpecialComponentSlots(config);
    const jumpJetSlots = config.jumpMP || 0;
    
    return {
      fixedComponents: 17, // Cockpit + Life Support + Sensors + Actuators
      systemComponents: systemSlots,
      specialComponents: specialSlots + jumpJetSlots,
      total: 17 + systemSlots + specialSlots + jumpJetSlots
    };
  }

  // Legacy static method for complete breakdown
  static getCompleteBreakdown(config: UnitConfiguration, sections: any, equipment: any[]): any {
    const instance = new CriticalSlotCalculatorImpl();
    const structural = CriticalSlotCalculatorStatic.calculateStructuralSlots(config);
    
    // Get the new location-based breakdown
    const locationBreakdown = instance.calculateLocationBreakdown(config, equipment);
    
    // CRITICAL FIX: Calculate allocated equipment slots from sections - count ALL equipment
    let allocatedSlots = 0;
    if (sections && sections instanceof Map) {
      sections.forEach((section: any) => {
        if (section && typeof section.getAllEquipment === 'function') {
          const sectionEquipment = section.getAllEquipment();
          sectionEquipment.forEach((eq: any) => {
            // Count ALL equipment slots (including system components)
            if (eq.equipmentData && eq.equipmentData.crits) {
              allocatedSlots += eq.equipmentData.crits;
            } else if (eq.equipmentData && eq.equipmentData.requiredSlots) {
              allocatedSlots += eq.equipmentData.requiredSlots;
            } else {
              // Default to 1 slot if not specified
              allocatedSlots += 1;
            }
          });
        }
      });
    }
    
    // CRITICAL FIX: Calculate unallocated equipment slots - count ALL equipment
    let unallocatedSlots = 0;
    if (equipment && Array.isArray(equipment)) {
      equipment.forEach((eq: any) => {
        // Count ALL equipment slots (including system components)
        if (eq.equipmentData && eq.equipmentData.crits) {
          unallocatedSlots += eq.equipmentData.crits;
        } else if (eq.equipmentData && eq.equipmentData.requiredSlots) {
          unallocatedSlots += eq.equipmentData.requiredSlots;
        } else {
          // Default to 1 slot if not specified
          unallocatedSlots += 1;
        }
      });
    }
    
    // CRITICAL FIX: Calculate total used slots (allocated + unallocated equipment, since it includes everything)
    const totalUsedSlots = allocatedSlots + unallocatedSlots;
    const equipmentBurden = allocatedSlots + unallocatedSlots;
    
    // Enhanced debug logging
    console.log('[CriticalSlotCalculator] getCompleteBreakdown calculation:', {
      structural: {
        fixedComponents: structural.fixedComponents,
        systemComponents: structural.systemComponents,
        specialComponents: structural.specialComponents,
        total: structural.total
      },
      userEquipment: {
        allocated: allocatedSlots,
        unallocated: unallocatedSlots,
        total: allocatedSlots + unallocatedSlots
      },
      totals: {
        used: totalUsedSlots,           // Allocated + unallocated equipment
        burden: equipmentBurden,        // Allocated + unallocated equipment
        capacity: 78,
        remaining: Math.max(0, 78 - totalUsedSlots),
        overCapacity: Math.max(0, equipmentBurden - 78)
      }
    });
    
    // CRITICAL DEBUG: Show final slot calculations
    console.log('[CriticalSlotCalculator] Final slot calculations:', {
      allocatedSlots,
      unallocatedSlots,
      totalUsedSlots,
      equipmentBurden,
      capacity: 78,
      remaining: Math.max(0, 78 - totalUsedSlots)
    });
    
    // CRITICAL DEBUG: Show detailed structural breakdown
    console.log('[CriticalSlotCalculator] Detailed structural breakdown:', {
      fixedComponents: structural.fixedComponents, // 17 (Cockpit + Life Support + Sensors + Actuators)
      systemComponents: structural.systemComponents, // Engine + Gyro slots
      specialComponents: structural.specialComponents, // Structure + Armor + Jump Jets
      total: structural.total
    });
    
    // CRITICAL DEBUG: Log ALL equipment to see what's being counted
    if (equipment && Array.isArray(equipment)) {
      console.log('[CriticalSlotCalculator] ALL equipment in unallocated pool:', 
        equipment.map((eq: any) => ({
          name: eq.equipmentData?.name,
          componentType: eq.equipmentData?.componentType,
          crits: eq.equipmentData?.crits || eq.equipmentData?.requiredSlots || 1,
          isSystemComponent: eq.equipmentData?.componentType === 'structure' || 
                           eq.equipmentData?.componentType === 'armor' ||
                           eq.equipmentData?.componentType === 'heatSink' ||
                           eq.equipmentData?.componentType === 'engine' ||
                           eq.equipmentData?.componentType === 'gyro' ||
                           eq.equipmentData?.componentType === 'jumpJet'
        }))
      );
      
      // CRITICAL DEBUG: Show counts
      console.log('[CriticalSlotCalculator] Equipment counts:', {
        totalEquipment: equipment.length,
        equipmentWithCrits: equipment.filter(eq => eq.equipmentData?.crits).length,
        equipmentWithRequiredSlots: equipment.filter(eq => eq.equipmentData?.requiredSlots).length,
        equipmentWithDefaultSlots: equipment.filter(eq => !eq.equipmentData?.crits && !eq.equipmentData?.requiredSlots).length
      });
    }
    
    // CRITICAL DEBUG: Log allocated equipment from sections
    if (sections && sections instanceof Map) {
      let totalAllocated = 0;
      sections.forEach((section: any, location: string) => {
        if (section && typeof section.getAllEquipment === 'function') {
          const sectionEquipment = section.getAllEquipment();
          totalAllocated += sectionEquipment.length;
          console.log(`[CriticalSlotCalculator] ${location} has ${sectionEquipment.length} equipment:`, 
            sectionEquipment.map((eq: any) => ({
              name: eq.equipmentData?.name,
              crits: eq.equipmentData?.crits || eq.equipmentData?.requiredSlots || 1
            }))
          );
        }
      });
      console.log('[CriticalSlotCalculator] Total allocated equipment:', totalAllocated);
    }
    
    return {
      structural,
      locationBreakdown, // New detailed location breakdown
      equipment: {
        allocated: allocatedSlots,
        unallocated: unallocatedSlots,
        total: allocatedSlots + unallocatedSlots
      },
      totals: {
        capacity: 78,
        used: structural.total,           // Use structural slot total for 'used'
        remaining: Math.max(0, 78 - structural.total),
        equipmentBurden: structural.total + unallocatedSlots, // Optionally include unallocated
        overCapacity: Math.max(0, (structural.total + unallocatedSlots) - 78)
      },
      debug: {
        fixedBreakdown: {
          head: { total: 5 },
          arms: { total: 4 }, // 4 per arm
          legs: { total: 8 }, // 4 per leg
          total: 17
        },
        systemBreakdown: {
          engine: instance.getEngineSlots(config.engineType),
          gyro: instance.getGyroSlots(instance.extractComponentType(config.gyroType)),
          total: instance.calculateSystemComponentSlots(config)
        },
        specialBreakdown: {
          structure: instance.getEndoSteelRequirement(config),
          armor: instance.getFerroFibrousRequirement(config),
          jumpJets: config.jumpMP || 0,
          total: instance.calculateSpecialComponentSlots(config) + (config.jumpMP || 0)
        },
        equipmentBreakdown: {
          allocated: allocatedSlots,
          unallocated: unallocatedSlots,
          total: allocatedSlots + unallocatedSlots
        }
      }
    };
  }
}

// Export the static class as CriticalSlotCalculator for backwards compatibility
export const CriticalSlotCalculator = CriticalSlotCalculatorStatic;

// Export factory function for dependency injection
export const createCriticalSlotCalculator = (): CriticalSlotCalculator => {
  return new CriticalSlotCalculatorImpl();
};
