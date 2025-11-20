/**
 * Auto Allocation Manager
 * Handles automatic allocation algorithms for weapons, ammunition, heat sinks, and jump jets
 * Extracted from EquipmentAllocationService.ts for better organization
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentPlacement, EquipmentConstraints } from '../../types/core/EquipmentPlacement';
import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

export interface WeaponAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  strategy: 'balanced' | 'front_loaded' | 'distributed' | 'concentrated';
  heatEfficiency: number;
  firepower: {
    short: number;
    medium: number;
    long: number;
  };
  recommendations: string[];
}

export interface AmmoAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: EquipmentAllocation[];
  caseProtection: {
    protected: string[];
    unprotected: string[];
    recommendations: string[];
  };
  ammoBalance: {
    weapon: string;
    tons: number;
    turns: number;
    adequate: boolean;
  }[];
  suggestions: string[];
}

export interface HeatSinkAllocationResult {
  allocated: EquipmentPlacement[];
  engineHeatSinks: number;
  externalHeatSinks: number;
  heatDissipation: number;
  heatBalance: {
    generation: number;
    dissipation: number;
    deficit: number;
  };
  optimization: string[];
}

export interface JumpJetAllocationResult {
  allocated: EquipmentPlacement[];
  jumpMP: number;
  distribution: {
    centerTorso: number;
    legs: number;
    recommended: boolean;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class AutoAllocationManager {
  /**
   * Auto-allocate weapons with optimal placement strategy
   */
  autoAllocateWeapons(weapons: EquipmentAllocation[], config: UnitConfiguration): WeaponAllocationResult {
    const allocated: EquipmentPlacement[] = [];
    const unallocated: EquipmentAllocation[] = [];
    
    // Sort weapons by priority (energy weapons first, then ballistic, then missile)
    const sortedWeapons = this.sortWeaponsByPriority(weapons);
    
    for (const weapon of sortedWeapons) {
      const placement = this.findBestWeaponPlacement(weapon, config, allocated);
      
      if (placement) {
        allocated.push(placement);
      } else {
        unallocated.push(weapon);
      }
    }
    
    const strategy = this.determineWeaponStrategy(allocated);
    const heatEfficiency = this.calculateWeaponHeatEfficiency(allocated);
    const firepower = this.calculateWeaponFirepower(allocated);
    const recommendations = this.generateWeaponRecommendations(allocated, unallocated);
    
    return {
      allocated,
      unallocated,
      strategy,
      heatEfficiency,
      firepower,
      recommendations
    };
  }
  
  /**
   * Auto-allocate ammunition with CASE protection consideration
   */
  autoAllocateAmmunition(ammunition: EquipmentAllocation[], config: UnitConfiguration): AmmoAllocationResult {
    const allocated: EquipmentPlacement[] = [];
    const unallocated: EquipmentAllocation[] = [];
    
    const caseLocations = this.getCASEProtectedLocations(config);
    
    for (const ammo of ammunition) {
      const placement = this.findBestAmmoPlacement(ammo, config, allocated, caseLocations);
      
      if (placement) {
        allocated.push(placement);
      } else {
        unallocated.push(ammo);
      }
    }
    
    const caseProtection = this.analyzeCASEProtection(allocated, config);
    const ammoBalance = this.analyzeAmmoBalance(allocated, config);
    const suggestions = this.generateAmmoSuggestions(allocated, unallocated, caseProtection);
    
    return {
      allocated,
      unallocated,
      caseProtection,
      ammoBalance,
      suggestions
    };
  }
  
  /**
   * Auto-allocate heat sinks for optimal heat management
   */
  autoAllocateHeatSinks(heatSinks: EquipmentAllocation[], config: UnitConfiguration): HeatSinkAllocationResult {
    const allocated: EquipmentPlacement[] = [];
    const preferredLocations = ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'];
    
    for (const heatSink of heatSinks) {
      const placement = this.findBestHeatSinkPlacement(heatSink, config, allocated, preferredLocations);
      
      if (placement) {
        allocated.push(placement);
      }
    }
    
    const engineHeatSinks = this.calculateEngineHeatSinks(config);
    const externalHeatSinks = allocated.length;
    const heatDissipation = this.calculateTotalHeatDissipation(engineHeatSinks, externalHeatSinks, config);
    const heatBalance = this.calculateHeatBalance(config, allocated);
    const optimization = this.generateHeatSinkOptimization(allocated, heatBalance);
    
    return {
      allocated,
      engineHeatSinks,
      externalHeatSinks,
      heatDissipation,
      heatBalance,
      optimization
    };
  }
  
  /**
   * Auto-allocate jump jets with optimal distribution
   */
  autoAllocateJumpJets(jumpJets: EquipmentAllocation[], config: UnitConfiguration): JumpJetAllocationResult {
    const allocated: EquipmentPlacement[] = [];
    const jumpMP = config.jumpMP || 0;
    
    const distribution = this.calculateOptimalJumpJetDistribution(jumpJets.length, config);
    
    for (const jumpJet of jumpJets) {
      const placement = this.placeJumpJetInLocation(jumpJet, 'centerTorso', config, allocated);
      
      if (placement) {
        allocated.push(placement);
      }
    }
    
    const validation = this.validateJumpJetAllocation(allocated, config);
    
    return {
      allocated,
      jumpMP,
      distribution,
      validation
    };
  }
  
  /**
   * Sort weapons by priority for allocation
   */
  private sortWeaponsByPriority(weapons: EquipmentAllocation[]): EquipmentAllocation[] {
    return weapons.sort((a, b) => {
      const priorityA = this.getWeaponPriority(a);
      const priorityB = this.getWeaponPriority(b);
      return priorityB - priorityA;
    });
  }
  
  /**
   * Get weapon priority for allocation order
   */
  private getWeaponPriority(weapon: EquipmentAllocation): number {
    const type = weapon.equipmentData?.type || '';
    const heat = weapon.equipmentData?.heat || 0;
    const damage = weapon.equipmentData?.damage || 0;
    
    // Energy weapons get highest priority
    if (type.includes('energy')) return 100 + damage;
    if (type.includes('ballistic')) return 80 + damage;
    if (type.includes('missile')) return 60 + damage;
    
    return damage;
  }
  
  /**
   * Find best placement for a weapon
   */
  private findBestWeaponPlacement(weapon: EquipmentAllocation, config: UnitConfiguration, allocated: EquipmentPlacement[]): EquipmentPlacement | null {
    const preferredLocations = ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'];
    
    for (const location of preferredLocations) {
      if (this.canPlaceEquipment(weapon, location, allocated)) {
        return {
          equipmentId: weapon.equipmentGroupId || `${weapon.equipmentData?.name}_${Date.now()}`,
          equipment: weapon,
          location,
          slots: this.findAvailableSlots(location, weapon, allocated),
          isFixed: false,
          isValid: true,
          constraints: this.getEquipmentConstraints(weapon),
          conflicts: []
        };
      }
    }
    
    return null;
  }
  
  /**
   * Determine weapon allocation strategy based on placement
   */
  private determineWeaponStrategy(allocated: EquipmentPlacement[]): 'balanced' | 'front_loaded' | 'distributed' | 'concentrated' {
    const armWeapons = allocated.filter(p => p.location === 'leftArm' || p.location === 'rightArm').length;
    const torsoWeapons = allocated.filter(p => p.location === 'leftTorso' || p.location === 'rightTorso').length;
    
    if (armWeapons > torsoWeapons) return 'balanced';
    if (torsoWeapons > armWeapons * 2) return 'front_loaded';
    if (allocated.length > 8) return 'distributed';
    return 'concentrated';
  }
  
  /**
   * Calculate weapon heat efficiency
   */
  private calculateWeaponHeatEfficiency(allocated: EquipmentPlacement[]): number {
    const totalHeat = allocated.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    // Simplified efficiency calculation
    return Math.max(0, 100 - totalHeat * 2);
  }
  
  /**
   * Calculate weapon firepower by range
   */
  private calculateWeaponFirepower(allocated: EquipmentPlacement[]) {
    const firepower = { short: 0, medium: 0, long: 0 };
    
    allocated.forEach(placement => {
      const weapon = placement.equipment.equipmentData;
      const damage = weapon?.damage || 0;
      const range = weapon?.range || 'medium';
      
      switch (range) {
        case 'short':
          firepower.short += damage;
          break;
        case 'medium':
          firepower.medium += damage;
          break;
        case 'long':
          firepower.long += damage;
          break;
      }
    });
    
    return firepower;
  }
  
  /**
   * Generate weapon allocation recommendations
   */
  private generateWeaponRecommendations(allocated: EquipmentPlacement[], unallocated: EquipmentAllocation[]): string[] {
    const recommendations: string[] = [];
    
    if (unallocated.length > 0) {
      recommendations.push(`Consider removing ${unallocated.length} weapons to improve heat management`);
    }
    
    const heatEfficiency = this.calculateWeaponHeatEfficiency(allocated);
    if (heatEfficiency < 50) {
      recommendations.push('High heat generation detected - consider heat sink upgrades');
    }
    
    return recommendations;
  }
  
  /**
   * Get CASE protected locations
   */
  private getCASEProtectedLocations(config: UnitConfiguration): string[] {
    // Simplified - assume CASE is in torso locations
    return ['leftTorso', 'rightTorso'];
  }
  
  /**
   * Find best ammo placement with CASE consideration
   */
  private findBestAmmoPlacement(ammo: EquipmentAllocation, config: UnitConfiguration, allocated: EquipmentPlacement[], caseLocations: string[]): EquipmentPlacement | null {
    // Prefer CASE protected locations for explosive ammo
    const preferredLocations = ammo.equipmentData?.explosive ? caseLocations : ['leftTorso', 'rightTorso', 'leftLeg', 'rightLeg'];
    
    for (const location of preferredLocations) {
      if (this.canPlaceEquipment(ammo, location, allocated)) {
        return {
          equipmentId: ammo.equipmentGroupId || `${ammo.equipmentData?.name}_${Date.now()}`,
          equipment: ammo,
          location,
          slots: this.findAvailableSlots(location, ammo, allocated),
          isFixed: false,
          isValid: true,
          constraints: this.getEquipmentConstraints(ammo),
          conflicts: []
        };
      }
    }
    
    return null;
  }
  
  /**
   * Analyze CASE protection for ammo
   */
  private analyzeCASEProtection(allocated: EquipmentPlacement[], config: UnitConfiguration) {
    const explosiveAmmo = allocated.filter(p => p.equipment.equipmentData?.explosive);
    const caseLocations = this.getCASEProtectedLocations(config);
    
    const protectedLocations = explosiveAmmo.filter(p => caseLocations.includes(p.location)).map(p => p.location);
    const unprotected = explosiveAmmo.filter(p => !caseLocations.includes(p.location)).map(p => p.location);
    
    return {
      protected: protectedLocations,
      unprotected,
      recommendations: unprotected.length > 0 ? ['Add CASE to locations with explosive ammunition'] : []
    };
  }
  
  /**
   * Analyze ammo balance
   */
  private analyzeAmmoBalance(allocated: EquipmentPlacement[], config: UnitConfiguration) {
    return allocated.map(placement => ({
      weapon: placement.equipment.equipmentData?.weapon || 'Unknown',
      tons: placement.equipment.equipmentData?.tonnage || 0,
      turns: 10, // Simplified calculation
      adequate: true
    }));
  }
  
  /**
   * Generate ammo suggestions
   */
  interface CaseProtection {
    [location: string]: boolean;
  }

  private generateAmmoSuggestions(allocated: EquipmentPlacement[], unallocated: EquipmentAllocation[], caseProtection: CaseProtection): string[] {
    const suggestions: string[] = [];
    
    if (unallocated.length > 0) {
      suggestions.push(`Cannot place ${unallocated.length} ammunition items`);
    }
    
    if (caseProtection.unprotected.length > 0) {
      suggestions.push('Add CASE protection for explosive ammunition');
    }
    
    return suggestions;
  }
  
  /**
   * Find best heat sink placement
   */
  private findBestHeatSinkPlacement(heatSink: EquipmentAllocation, config: UnitConfiguration, allocated: EquipmentPlacement[], preferredLocations: string[]): EquipmentPlacement | null {
    for (const location of preferredLocations) {
      if (this.canPlaceEquipment(heatSink, location, allocated)) {
        return {
          equipmentId: heatSink.equipmentGroupId || `${heatSink.equipmentData?.name}_${Date.now()}`,
          equipment: heatSink,
          location,
          slots: this.findAvailableSlots(location, heatSink, allocated),
          isFixed: false,
          isValid: true,
          constraints: this.getEquipmentConstraints(heatSink),
          conflicts: []
        };
      }
    }
    
    return null;
  }
  
  /**
   * Calculate engine heat sinks
   */
  private calculateEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    return Math.floor(engineRating / 25);
  }
  
  /**
   * Calculate total heat dissipation
   */
  private calculateTotalHeatDissipation(engineHeatSinks: number, externalHeatSinks: number, config: UnitConfiguration): number {
    return engineHeatSinks + externalHeatSinks;
  }
  
  /**
   * Calculate heat balance
   */
  private calculateHeatBalance(config: UnitConfiguration, allocated: EquipmentPlacement[]) {
    const generation = allocated.reduce((sum, placement) => {
      return sum + (placement.equipment.equipmentData?.heat || 0);
    }, 0);
    
    const dissipation = this.calculateTotalHeatDissipation(this.calculateEngineHeatSinks(config), allocated.length, config);
    
    return {
      generation,
      dissipation,
      deficit: Math.max(0, generation - dissipation)
    };
  }
  
  /**
   * Generate heat sink optimization suggestions
   */
  interface HeatBalance {
    generation: number;
    dissipation: number;
    efficiency: number;
  }

  private generateHeatSinkOptimization(allocated: EquipmentPlacement[], heatBalance: HeatBalance): string[] {
    const suggestions: string[] = [];
    
    if (heatBalance.deficit > 0) {
      suggestions.push(`Add ${heatBalance.deficit} more heat sinks to manage heat generation`);
    }
    
    if (allocated.length > 20) {
      suggestions.push('Consider using double heat sinks to save space');
    }
    
    return suggestions;
  }
  
  /**
   * Calculate optimal jump jet distribution
   */
  private calculateOptimalJumpJetDistribution(jumpJetCount: number, config: UnitConfiguration) {
    const centerTorso = Math.min(2, jumpJetCount);
    const legs = jumpJetCount - centerTorso;
    
    return {
      centerTorso,
      legs,
      recommended: centerTorso <= 2 && legs <= 4
    };
  }
  
  /**
   * Place jump jet in specific location
   */
  private placeJumpJetInLocation(jumpJet: EquipmentAllocation, location: string, config: UnitConfiguration, allocated: EquipmentPlacement[]): EquipmentPlacement | null {
    if (this.canPlaceEquipment(jumpJet, location, allocated)) {
      return {
        equipmentId: jumpJet.equipmentGroupId || `${jumpJet.equipmentData?.name}_${Date.now()}`,
        equipment: jumpJet,
        location,
        slots: this.findAvailableSlots(location, jumpJet, allocated),
        isFixed: false,
        isValid: true,
        constraints: this.getEquipmentConstraints(jumpJet),
        conflicts: []
      };
    }
    
    return null;
  }
  
  /**
   * Validate jump jet allocation
   */
  private validateJumpJetAllocation(allocated: EquipmentPlacement[], config: UnitConfiguration) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const jumpMP = config.jumpMP || 0;
    if (allocated.length !== jumpMP) {
      errors.push(`Jump jet count (${allocated.length}) does not match jump MP (${jumpMP})`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check if equipment can be placed in location
   */
  private canPlaceEquipment(equipment: EquipmentAllocation, location: string, allocated: EquipmentPlacement[]): boolean {
    const requiredSlots = equipment.equipmentData?.requiredSlots || 1;
    const availableSlots = this.findAvailableSlots(location, equipment, allocated);
    return availableSlots.length >= requiredSlots;
  }
  
  /**
   * Find available slots in location
   */
  private findAvailableSlots(location: string, equipment: EquipmentAllocation, allocated: EquipmentPlacement[]): number[] {
    const usedSlots = allocated
      .filter(p => p.location === location)
      .flatMap(p => p.slots);
    
    const totalSlots = this.getLocationSlotCount(location);
    const availableSlots: number[] = [];
    
    for (let i = 0; i < totalSlots; i++) {
      if (!usedSlots.includes(i)) {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  }

  /**
   * Get slot count for location
   */
  private getLocationSlotCount(location: string): number {
    const slotCounts: { [key: string]: number } = {
      head: 6,
      centerTorso: 12,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 6,
      rightLeg: 6
    };
    
    return slotCounts[location] || 0;
  }
  
  /**
   * Get equipment constraints
   */
  private getEquipmentConstraints(equipment: EquipmentAllocation): EquipmentConstraints {
    return {
      allowedLocations: ['leftTorso', 'rightTorso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
      forbiddenLocations: [],
      requiresCASE: equipment.equipmentData?.explosive || false,
      requiresArtemis: false,
      minTonnageLocation: 0,
      maxTonnageLocation: 100,
      heatGeneration: equipment.equipmentData?.heat || 0,
      specialRules: []
    };
  }
} 




