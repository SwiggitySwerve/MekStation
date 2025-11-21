/**
 * PlacementCalculationService - Equipment placement calculation and scoring
 * 
 * Extracted from EquipmentAllocationService as part of large file refactoring.
 * Handles optimal placement calculations, scoring algorithms, and placement suggestions.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { ComponentConfiguration } from '../../types/componentConfiguration';

export interface PlacementSuggestion {
  location: string;
  slots: number[];
  score: number; // 0-100, higher is better
  reasoning: string[];
  tradeoffs: string[];
  alternatives: AlternativePlacement[];
}

export interface AlternativePlacement {
  location: string;
  slots: number[];
  pros: string[];
  cons: string[];
  score: number;
}

export interface EquipmentPlacement {
  equipmentId: string;
  equipment: any;
  location: string;
  slots: number[];
  isFixed: boolean;
  isValid: boolean;
  constraints: EquipmentConstraints;
  conflicts: string[];
}

export interface EquipmentConstraints {
  allowedLocations: string[];
  forbiddenLocations: string[];
  requiresCASE: boolean;
  requiresArtemis: boolean;
  minTonnageLocation: number;
  maxTonnageLocation: number;
  heatGeneration: number;
  specialRules: string[];
}

export interface PlacementPreferences {
  preferredLocations: string[];
  avoidLocations: string[];
  prioritizeBalance: boolean;
  prioritizeProtection: boolean;
  allowSplitting: boolean;
  groupWith: string[];
}

export class PlacementCalculationService {
  
  // Location preferences for different equipment types
  private static readonly EQUIPMENT_PREFERENCES = {
    'energy_weapon': ['leftArm', 'rightArm', 'leftTorso', 'rightTorso', 'centerTorso', 'head'],
    'ballistic_weapon': ['leftTorso', 'rightTorso', 'leftArm', 'rightArm'],
    'missile_weapon': ['leftTorso', 'rightTorso'],
    'ammunition': ['leftTorso', 'rightTorso', 'leftLeg', 'rightLeg'],
    'heat_sink': ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'],
    'jump_jet': ['centerTorso', 'leftLeg', 'rightLeg'],
    'equipment': ['head', 'centerTorso', 'leftTorso', 'rightTorso']
  };

  // Location protection scores (higher = more protected)
  private static readonly LOCATION_PROTECTION = {
    'centerTorso': 90,
    'leftTorso': 70,
    'rightTorso': 70,
    'leftLeg': 60,
    'rightLeg': 60,
    'leftArm': 40,
    'rightArm': 40,
    'head': 20
  };

  // Critical slots available per location
  private static readonly LOCATION_SLOTS = {
    'head': 6,
    'centerTorso': 12,
    'leftTorso': 12,
    'rightTorso': 12,
    'leftArm': 12,
    'rightArm': 12,
    'leftLeg': 6,
    'rightLeg': 6
  };

  /**
   * Find optimal placement for equipment
   */
  static findOptimalPlacement(
    equipment: any, 
    config: UnitConfiguration, 
    existingAllocations: EquipmentPlacement[]
  ): PlacementSuggestion[] {
    // Handle null/undefined equipment
    if (!equipment) {
      return [];
    }

    const constraints = this.getEquipmentConstraints(equipment);
    const suggestions: PlacementSuggestion[] = [];
    
    for (const location of constraints.allowedLocations) {
      const availableSlots = this.findAvailableSlots(location, equipment, existingAllocations, config);
      
      if (availableSlots.length >= (equipment.equipmentData?.criticals || 1)) {
        const score = this.calculatePlacementScore(equipment, location, config, existingAllocations);
        const reasoning = this.generatePlacementReasoning(equipment, location, score);
        const tradeoffs = this.identifyTradeoffs(equipment, location, config);
        const alternatives = this.generateAlternatives(equipment, location, config);
        
        suggestions.push({
          location,
          slots: availableSlots.slice(0, equipment.equipmentData?.criticals || 1),
          score,
          reasoning,
          tradeoffs,
          alternatives
        });
      }
    }
    
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate placement score for equipment in a location
   */
  static calculatePlacementScore(
    equipment: any,
    location: string,
    config: UnitConfiguration,
    existingAllocations: EquipmentPlacement[]
  ): number {
    // Check if placement is valid according to constraints
    const constraints = this.getEquipmentConstraints(equipment);
    if (!constraints.allowedLocations.includes(location)) {
      return 0; // Invalid placement
    }
    
    let score = 50; // Base score
    
    // Type preference bonus
    const equipmentType = equipment.equipmentData?.type || 'equipment';
    const preferences = this.EQUIPMENT_PREFERENCES[equipmentType as keyof typeof this.EQUIPMENT_PREFERENCES] || [];
    const preferenceIndex = preferences.indexOf(location);
    
    if (preferenceIndex >= 0) {
      score += 30 - (preferenceIndex * 5); // Higher score for earlier preferences
    }
    
    // Protection score bonus
    const protectionScore = this.LOCATION_PROTECTION[location as keyof typeof this.LOCATION_PROTECTION] || 50;
    score += protectionScore * 0.3;
    
    // Balance considerations
    const balanceScore = this.calculateBalanceScore(equipment, location, existingAllocations);
    score += balanceScore * 0.2;
    
    // Slot utilization efficiency
    const utilizationScore = this.calculateSlotUtilization(equipment, location, existingAllocations);
    score += utilizationScore * 0.15;
    
    // Special equipment considerations
    score += this.calculateSpecialEquipmentBonus(equipment, location, config);
    
    // Apply penalties
    score -= this.calculatePlacementPenalties(equipment, location, config);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate alternative placements for equipment
   */
  static suggestAlternativePlacements(
    equipment: any, 
    config: UnitConfiguration
  ): AlternativePlacement[] {
    const constraints = this.getEquipmentConstraints(equipment);
    const alternatives: AlternativePlacement[] = [];
    
    for (const location of constraints.allowedLocations) {
      const score = this.calculatePlacementScore(equipment, location, config, []);
      const pros = this.getLocationPros(equipment, location);
      const cons = this.getLocationCons(equipment, location);
      const slots = this.findAvailableSlots(location, equipment, [], config);
      
      alternatives.push({
        location,
        slots: slots.slice(0, equipment.equipmentData?.criticals || 1),
        pros,
        cons,
        score
      });
    }
    
    return alternatives.sort((a, b) => b.score - a.score);
  }

  /**
   * Get equipment constraints based on type and specifications
   */
  static getEquipmentConstraints(equipment: any): EquipmentConstraints {
    // Handle null/undefined input
    if (!equipment) {
      return {
        allowedLocations: ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
        forbiddenLocations: [],
        requiresCASE: false,
        requiresArtemis: false,
        minTonnageLocation: 0,
        maxTonnageLocation: 100,
        heatGeneration: 0,
        specialRules: []
      };
    }

    const type = equipment.equipmentData?.type || 'equipment';
    const tonnage = equipment.equipmentData?.tonnage || 0;
    const heat = equipment.equipmentData?.heat || 0;
    
    // Start with preferred locations for the equipment type
    let allowedLocations = this.EQUIPMENT_PREFERENCES[type as keyof typeof this.EQUIPMENT_PREFERENCES] || 
                          ['head', 'centerTorso', 'leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    const forbiddenLocations: string[] = [];
    
    // Weight restrictions
    if (tonnage > 1) {
      forbiddenLocations.push('head'); // No heavy equipment in head
    }
    
    // Type-specific restrictions
    if (type === 'ammunition' && equipment.equipmentData?.explosive) {
      forbiddenLocations.push('head'); // No explosive ammo in head
    }
    
    if (type === 'engine') {
      allowedLocations = ['centerTorso']; // Engines only in center torso
    }
    
    if (type === 'gyro') {
      allowedLocations = ['centerTorso']; // Gyros only in center torso
    }
    
    if (type === 'cockpit') {
      allowedLocations = ['head']; // Cockpits only in head
    }
    
    // Apply forbidden location filter
    allowedLocations = allowedLocations.filter(loc => !forbiddenLocations.includes(loc));
    
    return {
      allowedLocations,
      forbiddenLocations,
      requiresCASE: type === 'ammunition' && equipment.equipmentData?.explosive,
      requiresArtemis: type === 'missile_weapon' && equipment.equipmentData?.artemisCompatible,
      minTonnageLocation: 0,
      maxTonnageLocation: tonnage > 1 ? 100 : 1,
      heatGeneration: heat,
      specialRules: equipment.equipmentData?.specialRules || []
    };
  }

  /**
   * Find available slots in a location
   */
  static findAvailableSlots(
    location: string,
    equipment: any,
    existingAllocations: EquipmentPlacement[],
    config: UnitConfiguration
  ): number[] {
    // Handle null/undefined equipment
    if (!equipment) {
      return [];
    }

    // Check if location is valid
    if (!(location in this.LOCATION_SLOTS)) {
      return [];
    }

    const maxSlots = this.LOCATION_SLOTS[location as keyof typeof this.LOCATION_SLOTS] || 12;
    const slotsNeeded = equipment.equipmentData?.criticals || 1;
    
    // Find occupied slots
    const occupiedSlots = new Set<number>();
    existingAllocations
      .filter(alloc => alloc.location === location)
      .forEach(alloc => {
        alloc.slots.forEach(slot => occupiedSlots.add(slot));
      });
    
    // Find all available slots
    const availableSlots: number[] = [];
    
    for (let slot = 1; slot <= maxSlots; slot++) {
      if (!occupiedSlots.has(slot)) {
        availableSlots.push(slot);
      }
    }
    
    // For equipment that requires contiguous slots, find the best contiguous block
    if (slotsNeeded > 1) {
      let bestContiguousSlots: number[] = [];
      let maxContiguousLength = 0;
      
      for (let i = 0; i <= availableSlots.length - slotsNeeded; i++) {
        const contiguousSlots = availableSlots.slice(i, i + slotsNeeded);
        if (contiguousSlots.length === slotsNeeded) {
          // Check if they are actually contiguous
          let isContiguous = true;
          for (let j = 1; j < contiguousSlots.length; j++) {
            if (contiguousSlots[j] !== contiguousSlots[j-1] + 1) {
              isContiguous = false;
              break;
            }
          }
          
          if (isContiguous && contiguousSlots.length > maxContiguousLength) {
            bestContiguousSlots = contiguousSlots;
            maxContiguousLength = contiguousSlots.length;
          }
        }
      }
      
      return bestContiguousSlots;
    }
    
    // For single-slot equipment, return all available slots
    return availableSlots;
  }

  /**
   * Calculate balance score for placement
   */
  private static calculateBalanceScore(
    equipment: any,
    location: string,
    existingAllocations: EquipmentPlacement[]
  ): number {
    const weight = equipment.equipmentData?.tonnage || 0;
    
    // Calculate current weight distribution
    const weightDistribution: { [location: string]: number } = {};
    for (const alloc of existingAllocations) {
      const allocWeight = alloc.equipment.equipmentData?.tonnage || 0;
      weightDistribution[alloc.location] = (weightDistribution[alloc.location] || 0) + allocWeight;
    }
    
    // Add this equipment's weight
    const newWeight = (weightDistribution[location] || 0) + weight;
    weightDistribution[location] = newWeight;
    
    // Calculate balance score based on left/right symmetry
    const leftWeight = (weightDistribution.leftTorso || 0) + (weightDistribution.leftArm || 0) + (weightDistribution.leftLeg || 0);
    const rightWeight = (weightDistribution.rightTorso || 0) + (weightDistribution.rightArm || 0) + (weightDistribution.rightLeg || 0);
    
    const imbalance = Math.abs(leftWeight - rightWeight);
    const maxWeight = Math.max(leftWeight, rightWeight) || 1;
    const balanceRatio = 1 - (imbalance / maxWeight);
    
    return balanceRatio * 100;
  }

  /**
   * Calculate slot utilization efficiency
   */
  private static calculateSlotUtilization(
    equipment: any,
    location: string,
    existingAllocations: EquipmentPlacement[]
  ): number {
    const maxSlots = this.LOCATION_SLOTS[location as keyof typeof this.LOCATION_SLOTS] || 12;
    const slotsNeeded = equipment.equipmentData?.criticals || 1;
    
    // Count used slots in location
    const usedSlots = existingAllocations
      .filter(alloc => alloc.location === location)
      .reduce((total, alloc) => total + alloc.slots.length, 0);
    
    const utilization = (usedSlots + slotsNeeded) / maxSlots;
    
    // Prefer efficient utilization (not too empty, not too full)
    if (utilization < 0.3) return 50; // Too empty
    if (utilization > 0.9) return 30; // Too full
    if (utilization >= 0.6 && utilization <= 0.8) return 100; // Optimal
    
    return 75; // Good utilization
  }

  /**
   * Calculate special equipment bonuses
   */
  private static calculateSpecialEquipmentBonus(
    equipment: any,
    location: string,
    config: UnitConfiguration
  ): number {
    let bonus = 0;
    const type = equipment.equipmentData?.type || 'equipment';
    
    // Ammunition with CASE protection
    if (type === 'ammunition' && equipment.equipmentData?.explosive) {
      // Check if location has CASE (simplified check)
      const hasCASE = false; // Would check actual CASE presence
      bonus += hasCASE ? 15 : -10;
    }
    
    // Heat sinks in legs (better heat dissipation)
    if (type === 'heat_sink' && (location === 'leftLeg' || location === 'rightLeg')) {
      bonus += 10;
    }
    
    // Weapons in arms (better firing arcs)
    if (type.includes('weapon') && (location === 'leftArm' || location === 'rightArm')) {
      bonus += 8;
    }
    
    // Jump jets in center torso (better stability)
    if (type === 'jump_jet' && location === 'centerTorso') {
      bonus += 5;
    }
    
    return bonus;
  }

  /**
   * Calculate placement penalties
   */
  private static calculatePlacementPenalties(
    equipment: any,
    location: string,
    config: UnitConfiguration
  ): number {
    let penalty = 0;
    const type = equipment.equipmentData?.type || 'equipment';
    
    // Heavy equipment in vulnerable locations
    const weight = equipment.equipmentData?.tonnage || 0;
    if (weight > 5 && (location === 'leftArm' || location === 'rightArm')) {
      penalty += 15; // Arms can be blown off
    }
    
    // Explosive ammunition without protection
    if (type === 'ammunition' && equipment.equipmentData?.explosive) {
      if (location === 'head') penalty += 25;
      if (!this.hasLocationProtection(location, config)) penalty += 10;
    }
    
    // Critical equipment in vulnerable locations
    if (equipment.equipmentData?.critical && location === 'head') {
      penalty += 20;
    }
    
    return penalty;
  }

  /**
   * Generate placement reasoning
   */
  private static generatePlacementReasoning(
    equipment: any,
    location: string,
    score: number
  ): string[] {
    const reasoning: string[] = [];
    const type = equipment.equipmentData?.type || 'equipment';
    
    reasoning.push(`Placement score: ${score}/100`);
    
    // Type-specific reasoning
    const preferences = this.EQUIPMENT_PREFERENCES[type as keyof typeof this.EQUIPMENT_PREFERENCES];
    if (preferences?.includes(location)) {
      reasoning.push(`Preferred location for ${type.replace('_', ' ')}`);
    }
    
    // Protection reasoning
    const protection = this.LOCATION_PROTECTION[location as keyof typeof this.LOCATION_PROTECTION] || 50;
    if (protection > 70) {
      reasoning.push('Well-protected location');
    } else if (protection < 40) {
      reasoning.push('Vulnerable location - consider alternatives');
    }
    
    // Special considerations
    if (type === 'ammunition' && location !== 'head') {
      reasoning.push('Safe ammunition placement');
    }
    
    if (type === 'heat_sink' && (location === 'leftLeg' || location === 'rightLeg')) {
      reasoning.push('Optimal heat dissipation location');
    }
    
    return reasoning;
  }

  /**
   * Identify placement tradeoffs
   */
  private static identifyTradeoffs(
    equipment: any,
    location: string,
    config: UnitConfiguration
  ): string[] {
    const tradeoffs: string[] = [];
    
    if (location === 'head') {
      tradeoffs.push('Higher vulnerability to head hits');
      tradeoffs.push('Limited to 1-ton equipment only');
    }
    
    if (location.includes('Arm')) {
      tradeoffs.push('May be lost if arm is destroyed');
      tradeoffs.push('Good firing arcs for weapons');
    }
    
    if (location.includes('Leg')) {
      tradeoffs.push('Good for heat dissipation');
      tradeoffs.push('Fewer critical slots available');
    }
    
    if (location.includes('Torso')) {
      tradeoffs.push('Well protected and spacious');
      tradeoffs.push('Critical for mech survival');
    }
    
    return tradeoffs;
  }

  /**
   * Generate alternative placements
   */
  private static generateAlternatives(
    equipment: any,
    currentLocation: string,
    config: UnitConfiguration
  ): AlternativePlacement[] {
    const constraints = this.getEquipmentConstraints(equipment);
    const alternatives: AlternativePlacement[] = [];
    
    // Only suggest top 3 alternatives
    const otherLocations = constraints.allowedLocations
      .filter(loc => loc !== currentLocation)
      .slice(0, 3);
    
    for (const location of otherLocations) {
      const score = this.calculatePlacementScore(equipment, location, config, []);
      const pros = this.getLocationPros(equipment, location);
      const cons = this.getLocationCons(equipment, location);
      
      alternatives.push({
        location,
        slots: [1, 2, 3], // Simplified slot assignment
        pros,
        cons,
        score
      });
    }
    
    return alternatives.sort((a, b) => b.score - a.score);
  }

  /**
   * Get location advantages
   */
  private static getLocationPros(equipment: any, location: string): string[] {
    const pros: string[] = [];
    const type = equipment.equipmentData?.type || 'equipment';
    
    const protection = this.LOCATION_PROTECTION[location as keyof typeof this.LOCATION_PROTECTION] || 50;
    if (protection > 70) {
      pros.push('Well protected location');
    }
    
    if (location === 'centerTorso') {
      pros.push('Maximum protection');
      pros.push('Largest slot capacity');
    }
    
    if (location.includes('Arm') && type.includes('weapon')) {
      pros.push('Excellent firing arcs');
      pros.push('Independent targeting');
    }
    
    if (location.includes('Leg') && type === 'heat_sink') {
      pros.push('Optimal heat dissipation');
      pros.push('Away from critical systems');
    }
    
    if (location.includes('Torso')) {
      pros.push('Good slot availability');
      pros.push('Balanced weight distribution');
    }
    
    return pros;
  }

  /**
   * Get location disadvantages
   */
  private static getLocationCons(equipment: any, location: string): string[] {
    const cons: string[] = [];
    
    if (location === 'head') {
      cons.push('Extremely vulnerable to critical hits');
      cons.push('Limited to 1-ton equipment');
      cons.push('Only 6 critical slots');
    }
    
    if (location.includes('Arm')) {
      cons.push('Can be lost if arm destroyed');
      cons.push('Actuator restrictions may apply');
    }
    
    if (location.includes('Leg')) {
      cons.push('Only 6 critical slots');
      cons.push('May affect movement if damaged');
    }
    
    if (location.includes('Torso')) {
      cons.push('Critical for mech survival');
      cons.push('High-value target for enemies');
    }
    
    return cons;
  }

  /**
   * Check if location has protection (CASE, etc.)
   */
  private static hasLocationProtection(location: string, config: UnitConfiguration): boolean {
    // Simplified check - would examine actual CASE installation
    return false;
  }

  /**
   * Sort equipment by placement priority
   */
  static sortEquipmentByPriority(equipment: any[]): any[] {
    return equipment.sort((a, b) => {
      const priorityA = this.getEquipmentPriority(a);
      const priorityB = this.getEquipmentPriority(b);
      return priorityB - priorityA;
    });
  }

  /**
   * Get equipment priority for placement order
   */
  private static getEquipmentPriority(equipment: any): number {
    const type = equipment.equipmentData?.type || 'equipment';
    const tonnage = equipment.equipmentData?.tonnage || 0;
    
    // Higher priority = placed first
    if (type === 'engine') return 1000;
    if (type === 'gyro') return 950;
    if (type === 'cockpit') return 900;
    if (type.includes('weapon')) return 100 + tonnage * 10; // Heavier weapons first
    if (type === 'heat_sink') return 90;
    if (type === 'jump_jet') return 80;
    if (type === 'ammunition') return 70;
    
    return 60 + tonnage; // General equipment by weight
  }

  /**
   * Calculate overall placement efficiency
   */
  static calculatePlacementEfficiency(
    allocations: EquipmentPlacement[],
    config: UnitConfiguration
  ): number {
    if (allocations.length === 0) return 100;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const allocation of allocations) {
      const score = this.calculatePlacementScore(allocation.equipment, allocation.location, config, allocations);
      const weight = allocation.equipment.equipmentData?.tonnage || 1;
      
      totalScore += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 100;
  }
}

export default PlacementCalculationService;





