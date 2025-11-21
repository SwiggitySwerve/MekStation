/**
 * AutoAllocationEngine - Automatic equipment allocation algorithms
 * 
 * Extracted from EquipmentAllocationService as part of large file refactoring.
 * Handles automatic allocation strategies for weapons, ammunition, heat sinks, and jump jets.
 * 
 * @see IMPLEMENTATION_REFERENCE.md for architectural patterns
 */

import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { EquipmentPlacement, EquipmentConstraints } from './PlacementCalculationService';
import { PlacementCalculationService } from './PlacementCalculationService';
import { calculateInternalHeatSinks } from '../../utils/heatSinkCalculations';

export interface AutoAllocationResult {
  success: boolean;
  strategy: string;
  allocations: EquipmentPlacement[];
  unallocated: any[];
  metrics: AllocationMetrics;
  improvements: string[];
  warnings: AllocationWarning[];
}

export interface AllocationMetrics {
  successRate: number;
  efficiencyScore: number;
  balanceScore: number;
  utilization: number;
}

export interface AllocationWarning {
  type: 'balance' | 'protection' | 'efficiency' | 'heat' | 'tech_level';
  equipment: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface WeaponAllocationResult {
  allocated: EquipmentPlacement[];
  unallocated: any[];
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
  unallocated: any[];
  caseProtection: {
    protected: string[];
    unprotected: string[];
    recommendations: string[];
  };
  ammoBalance: AmmoBalanceCheck[];
  suggestions: string[];
}

export interface AmmoBalanceCheck {
  weapon: string;
  ammoTons: number;
  recommendedTons: number;
  turns: number;
  adequate: boolean;
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

export interface AllocationConstraints {
  preferredLocations: string[];
  forbiddenLocations: string[];
  groupTogether: string[][];
  separateFrom: string[][];
  prioritizeBalance: boolean;
  prioritizeProtection: boolean;
  allowSplitting: boolean;
}

export class AutoAllocationEngine {

  // Allocation strategy weights
  private static readonly STRATEGY_WEIGHTS = {
    balanced: { balance: 0.4, protection: 0.3, efficiency: 0.3 },
    front_loaded: { balance: 0.2, protection: 0.2, efficiency: 0.6 },
    distributed: { balance: 0.5, protection: 0.3, efficiency: 0.2 },
    concentrated: { balance: 0.1, protection: 0.6, efficiency: 0.3 }
  };

  /**
   * Automatically allocate all equipment using best strategy
   */
  static autoAllocateEquipment(
    config: UnitConfiguration, 
    equipment: any[]
  ): AutoAllocationResult {
    // Handle empty equipment list
    if (!equipment || equipment.length === 0) {
      return {
        success: true,
        strategy: 'balanced',
        allocations: [],
        unallocated: [],
        metrics: {
          successRate: 100,
          efficiencyScore: 100,
          balanceScore: 100,
          utilization: 0
        },
        improvements: [],
        warnings: []
      };
    }

    const strategies = [
      { name: 'balanced', fn: this.balancedAllocationStrategy },
      { name: 'front_loaded', fn: this.frontLoadedStrategy },
      { name: 'distributed', fn: this.distributedStrategy },
      { name: 'concentrated', fn: this.concentratedStrategy }
    ];

    let bestResult: any = null;
    let bestStrategy = '';
    let bestScore = 0;

    for (const strategy of strategies) {
      const result = strategy.fn.call(this, config, equipment);
      const score = this.calculateStrategyScore(result, config);

      if (score > bestScore) {
        bestResult = result;
        bestStrategy = strategy.name;
        bestScore = score;
      }
    }

    // Ensure bestResult is initialized
    if (!bestResult) {
      bestResult = {
        success: false,
        allocations: [],
        unallocated: equipment,
        warnings: []
      };
      bestStrategy = 'balanced';
    }

    const metrics = this.calculateAllocationMetrics(bestResult, config);
    const improvements = this.generateImprovementSuggestions(bestResult, config);

    return {
      success: bestResult.success,
      strategy: bestStrategy,
      allocations: bestResult.allocations,
      unallocated: bestResult.unallocated,
      metrics,
      improvements,
      warnings: bestResult.warnings || []
    };
  }

  /**
   * Automatically allocate weapons with optimal strategy
   */
  static autoAllocateWeapons(
    weapons: any[], 
    config: UnitConfiguration
  ): WeaponAllocationResult {
    // Handle null/undefined input
    if (!weapons || !Array.isArray(weapons)) {
      return {
        allocated: [],
        unallocated: [],
        strategy: 'balanced',
        heatEfficiency: 100,
        firepower: { short: 0, medium: 0, long: 0 },
        recommendations: []
      };
    }

    const allocated: EquipmentPlacement[] = [];
    const unallocated: any[] = [];

    // Sort weapons by priority (larger/heavier weapons first)
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
   * Automatically allocate ammunition with CASE considerations
   */
  static autoAllocateAmmunition(
    ammunition: any[], 
    config: UnitConfiguration
  ): AmmoAllocationResult {
    // Handle null/undefined input
    if (!ammunition || !Array.isArray(ammunition)) {
      return {
        allocated: [],
        unallocated: [],
        caseProtection: { protected: [], unprotected: [], recommendations: [] },
        ammoBalance: [],
        suggestions: []
      };
    }

    const allocated: EquipmentPlacement[] = [];
    const unallocated: any[] = [];

    // Prioritize CASE-protected locations
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
   * Automatically allocate heat sinks for optimal cooling
   */
  static autoAllocateHeatSinks(
    heatSinks: any[], 
    config: UnitConfiguration
  ): HeatSinkAllocationResult {
    const allocated: EquipmentPlacement[] = [];
    const engineHeatSinks = this.getEngineHeatSinks(config);
    const externalHeatSinks = heatSinks.length;

    // Prefer leg locations for external heat sinks (better cooling)
    const preferredLocations = ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'];

    for (const heatSink of heatSinks) {
      const placement = this.findBestHeatSinkPlacement(heatSink, config, allocated, preferredLocations);

      if (placement) {
        allocated.push(placement);
      }
    }

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
   * Automatically allocate jump jets for mobility
   */
  static autoAllocateJumpJets(
    jumpJets: any[], 
    config: UnitConfiguration
  ): JumpJetAllocationResult {
    const allocated: EquipmentPlacement[] = [];

    // Calculate optimal distribution (center torso + legs)
    const distribution = this.calculateOptimalJumpJetDistribution(jumpJets.length, config);

    let centerTorsoCount = 0;
    let legCount = 0;

    for (const jumpJet of jumpJets) {
      let placement: EquipmentPlacement | null = null;

      // Try center torso first (up to limit)
      if (centerTorsoCount < distribution.centerTorso) {
        placement = this.placeJumpJetInLocation(jumpJet, 'centerTorso', config, allocated);
        if (placement) centerTorsoCount++;
      }

      // Then try legs alternating left/right
      if (!placement && legCount < distribution.legs) {
        const legLocation = legCount % 2 === 0 ? 'leftLeg' : 'rightLeg';
        placement = this.placeJumpJetInLocation(jumpJet, legLocation, config, allocated);
        if (placement) legCount++;
      }

      if (placement) {
        allocated.push(placement);
      }
    }

    const validation = this.validateJumpJetAllocation(allocated, config);

    return {
      allocated,
      jumpMP: config.jumpMP || 0,
      distribution: {
        centerTorso: centerTorsoCount,
        legs: legCount,
        recommended: centerTorsoCount + legCount === jumpJets.length
      },
      validation
    };
  }

  // ===== ALLOCATION STRATEGIES =====

  /**
   * Balanced allocation strategy - even distribution
   */
  private static balancedAllocationStrategy(config: UnitConfiguration, equipment: any[]) {
    const allocations: EquipmentPlacement[] = [];
    const unallocated: any[] = [];
    const warnings: AllocationWarning[] = [];

    // Sort equipment for balanced placement
    const sortedEquipment = PlacementCalculationService.sortEquipmentByPriority(equipment);

    for (const item of sortedEquipment) {
      const placements = PlacementCalculationService.findOptimalPlacement(item, config, allocations);

      if (placements.length > 0) {
        // Choose placement that maintains balance
        const balancedPlacement = this.selectBalancedPlacement(placements, allocations);
        const placement: EquipmentPlacement = {
          equipmentId: this.generateEquipmentId(item),
          equipment: item,
          location: balancedPlacement.location,
          slots: balancedPlacement.slots,
          isFixed: false,
          isValid: true,
          constraints: PlacementCalculationService.getEquipmentConstraints(item),
          conflicts: []
        };

        allocations.push(placement);
      } else {
        unallocated.push(item);
      }
    }

    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      warnings
    };
  }

  /**
   * Front-loaded strategy - prioritize forward-facing weapons
   */
  private static frontLoadedStrategy(config: UnitConfiguration, equipment: any[]) {
    const allocations: EquipmentPlacement[] = [];
    const unallocated: any[] = [];
    const warnings: AllocationWarning[] = [];

    // Front-facing locations priority
    const frontLocations = ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'];

    for (const item of equipment) {
      const constraints = PlacementCalculationService.getEquipmentConstraints(item);
      let placed = false;

      // Try front locations first for weapons
      if (item.equipmentData?.type?.includes('weapon')) {
        for (const location of frontLocations) {
          if (constraints.allowedLocations.includes(location)) {
            const availableSlots = PlacementCalculationService.findAvailableSlots(location, item, allocations, config);
            if (availableSlots.length >= (item.equipmentData?.criticals || 1)) {
              const placement: EquipmentPlacement = {
                equipmentId: this.generateEquipmentId(item),
                equipment: item,
                location,
                slots: availableSlots.slice(0, item.equipmentData?.criticals || 1),
                isFixed: false,
                isValid: true,
                constraints,
                conflicts: []
              };
              allocations.push(placement);
              placed = true;
              break;
            }
          }
        }
      }

      // Fall back to normal placement if not placed
      if (!placed) {
        const placements = PlacementCalculationService.findOptimalPlacement(item, config, allocations);
        if (placements.length > 0) {
          const placement: EquipmentPlacement = {
            equipmentId: this.generateEquipmentId(item),
            equipment: item,
            location: placements[0].location,
            slots: placements[0].slots,
            isFixed: false,
            isValid: true,
            constraints,
            conflicts: []
          };
          allocations.push(placement);
        } else {
          unallocated.push(item);
        }
      }
    }

    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      warnings
    };
  }

  /**
   * Distributed strategy - spread equipment across all locations
   */
  private static distributedStrategy(config: UnitConfiguration, equipment: any[]) {
    const allocations: EquipmentPlacement[] = [];
    const unallocated: any[] = [];
    const warnings: AllocationWarning[] = [];

    // Track usage by location for even distribution
    const locationUsage: { [location: string]: number } = {};

    for (const item of equipment) {
      const placements = PlacementCalculationService.findOptimalPlacement(item, config, allocations);

      if (placements.length > 0) {
        // Choose least used location among valid options
        const distributedPlacement = this.selectDistributedPlacement(placements, locationUsage);
        const placement: EquipmentPlacement = {
          equipmentId: this.generateEquipmentId(item),
          equipment: item,
          location: distributedPlacement.location,
          slots: distributedPlacement.slots,
          isFixed: false,
          isValid: true,
          constraints: PlacementCalculationService.getEquipmentConstraints(item),
          conflicts: []
        };

        allocations.push(placement);
        locationUsage[distributedPlacement.location] = (locationUsage[distributedPlacement.location] || 0) + 1;
      } else {
        unallocated.push(item);
      }
    }

    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      warnings
    };
  }

  /**
   * Concentrated strategy - group similar equipment together
   */
  private static concentratedStrategy(config: UnitConfiguration, equipment: any[]) {
    const allocations: EquipmentPlacement[] = [];
    const unallocated: any[] = [];
    const warnings: AllocationWarning[] = [];

    // Group equipment by type
    const equipmentGroups = this.groupEquipmentByType(equipment);

    for (const [type, items] of Object.entries(equipmentGroups)) {
      const preferredLocations = this.getTypePreferredLocations(type);

      for (const item of items) {
        let placed = false;

        // Try to place in preferred locations first
        for (const location of preferredLocations) {
          const constraints = PlacementCalculationService.getEquipmentConstraints(item);
          if (constraints.allowedLocations.includes(location)) {
            const availableSlots = PlacementCalculationService.findAvailableSlots(location, item, allocations, config);
            if (availableSlots.length >= (item.equipmentData?.criticals || 1)) {
              const placement: EquipmentPlacement = {
                equipmentId: this.generateEquipmentId(item),
                equipment: item,
                location,
                slots: availableSlots.slice(0, item.equipmentData?.criticals || 1),
                isFixed: false,
                isValid: true,
                constraints,
                conflicts: []
              };
              allocations.push(placement);
              placed = true;
              break;
            }
          }
        }

        // Fall back to optimal placement
        if (!placed) {
          const placements = PlacementCalculationService.findOptimalPlacement(item, config, allocations);
          if (placements.length > 0) {
            const placement: EquipmentPlacement = {
              equipmentId: this.generateEquipmentId(item),
              equipment: item,
              location: placements[0].location,
              slots: placements[0].slots,
              isFixed: false,
              isValid: true,
              constraints: PlacementCalculationService.getEquipmentConstraints(item),
              conflicts: []
            };
            allocations.push(placement);
          } else {
            unallocated.push(item);
          }
        }
      }
    }

    return {
      success: unallocated.length === 0,
      allocations,
      unallocated,
      warnings
    };
  }

  // ===== HELPER METHODS =====

  private static sortWeaponsByPriority(weapons: any[]): any[] {
    // Handle null/undefined input
    if (!weapons || !Array.isArray(weapons)) {
      return [];
    }
    
    return weapons.sort((a, b) => {
      const weightA = a.equipmentData?.tonnage || 0;
      const weightB = b.equipmentData?.tonnage || 0;
      const damageA = a.equipmentData?.damage || 0;
      const damageB = b.equipmentData?.damage || 0;

      // Prioritize by weight first, then damage
      if (weightA !== weightB) return weightB - weightA;
      return damageB - damageA;
    });
  }

  private static findBestWeaponPlacement(
    weapon: any,
    config: UnitConfiguration,
    allocated: EquipmentPlacement[]
  ): EquipmentPlacement | null {
    const placements = PlacementCalculationService.findOptimalPlacement(weapon, config, allocated);

    if (placements.length > 0) {
      return {
        equipmentId: this.generateEquipmentId(weapon),
        equipment: weapon,
        location: placements[0].location,
        slots: placements[0].slots,
        isFixed: false,
        isValid: true,
        constraints: PlacementCalculationService.getEquipmentConstraints(weapon),
        conflicts: []
      };
    }

    return null;
  }

  private static determineWeaponStrategy(allocated: EquipmentPlacement[]): 'balanced' | 'front_loaded' | 'distributed' | 'concentrated' {
    // Analyze weapon distribution to determine strategy
    const weaponsByLocation: { [location: string]: number } = {};

    for (const alloc of allocated) {
      if (alloc.equipment.equipmentData?.type?.includes('weapon')) {
        weaponsByLocation[alloc.location] = (weaponsByLocation[alloc.location] || 0) + 1;
      }
    }

    const frontWeapons = (weaponsByLocation.leftArm || 0) + (weaponsByLocation.rightArm || 0);
    const totalWeapons = Object.values(weaponsByLocation).reduce((sum, count) => sum + count, 0);

    if (totalWeapons === 0) return 'balanced';

    const frontRatio = frontWeapons / totalWeapons;
    if (frontRatio > 0.6) return 'front_loaded';

    const maxInLocation = Math.max(...Object.values(weaponsByLocation));
    if (maxInLocation > totalWeapons * 0.5) return 'concentrated';

    const locations = Object.keys(weaponsByLocation).length;
    if (locations >= 5) return 'distributed';

    return 'balanced';
  }

  private static calculateWeaponHeatEfficiency(allocated: EquipmentPlacement[]): number {
    let totalHeat = 0;
    for (const alloc of allocated) {
      if (alloc.equipment.equipmentData?.type?.includes('weapon')) {
        totalHeat += alloc.equipment.equipmentData?.heat || 0;
      }
    }

    // Efficiency decreases with heat generation
    return Math.max(0, 100 - totalHeat * 2);
  }

  private static calculateWeaponFirepower(allocated: EquipmentPlacement[]) {
    const firepower = { short: 0, medium: 0, long: 0 };

    for (const alloc of allocated) {
      if (alloc.equipment.equipmentData?.type?.includes('weapon')) {
        const damage = alloc.equipment.equipmentData?.damage || 0;
        firepower.short += damage;
        firepower.medium += damage * 0.8; // Range dropoff
        firepower.long += damage * 0.6;
      }
    }

    return firepower;
  }

  private static generateWeaponRecommendations(allocated: EquipmentPlacement[], unallocated: any[]): string[] {
    const recommendations: string[] = [];

    if (unallocated.length > 0) {
      recommendations.push(`${unallocated.length} weapons could not be allocated - consider larger chassis`);
    }

    // Analyze heat balance
    let totalHeat = 0;
    for (const alloc of allocated) {
      if (alloc.equipment.equipmentData?.type?.includes('weapon')) {
        totalHeat += alloc.equipment.equipmentData?.heat || 0;
      }
    }

    if (totalHeat > 30) {
      recommendations.push('High heat generation - ensure adequate heat sinks');
    }

    return recommendations;
  }

  private static getCASEProtectedLocations(config: UnitConfiguration): string[] {
    // Simplified - would check for actual CASE equipment
    return [];
  }

  private static findBestAmmoPlacement(
    ammo: any,
    config: UnitConfiguration,
    allocated: EquipmentPlacement[],
    caseLocations: string[]
  ): EquipmentPlacement | null {
    const placements = PlacementCalculationService.findOptimalPlacement(ammo, config, allocated);

    // Prefer CASE-protected locations for explosive ammo
    if (ammo.equipmentData?.explosive && caseLocations.length > 0) {
      const protectedPlacement = placements.find(p => caseLocations.includes(p.location));
      if (protectedPlacement) {
        return {
          equipmentId: this.generateEquipmentId(ammo),
          equipment: ammo,
          location: protectedPlacement.location,
          slots: protectedPlacement.slots,
          isFixed: false,
          isValid: true,
          constraints: PlacementCalculationService.getEquipmentConstraints(ammo),
          conflicts: []
        };
      }
    }

    // Fall back to best placement
    if (placements.length > 0) {
      return {
        equipmentId: this.generateEquipmentId(ammo),
        equipment: ammo,
        location: placements[0].location,
        slots: placements[0].slots,
        isFixed: false,
        isValid: true,
        constraints: PlacementCalculationService.getEquipmentConstraints(ammo),
        conflicts: []
      };
    }

    return null;
  }

  private static analyzeCASEProtection(allocated: EquipmentPlacement[], config: UnitConfiguration) {
    const ammoLocations = allocated
      .filter(a => a.equipment.equipmentData?.type === 'ammunition')
      .map(a => a.location);

    return {
      protected: [] as string[],
      unprotected: ammoLocations,
      recommendations: ammoLocations.length > 0 ? ['Consider installing CASE for ammunition protection'] : []
    };
  }

  private static analyzeAmmoBalance(allocated: EquipmentPlacement[], config: UnitConfiguration): AmmoBalanceCheck[] {
    // Group ammo by weapon type
    const ammoByWeapon: { [weapon: string]: number } = {};

    for (const alloc of allocated) {
      if (alloc.equipment.equipmentData?.type === 'ammunition') {
        const weaponType = alloc.equipment.equipmentData?.weaponType || 'Unknown';
        ammoByWeapon[weaponType] = (ammoByWeapon[weaponType] || 0) + (alloc.equipment.equipmentData?.tonnage || 1);
      }
    }

    return Object.entries(ammoByWeapon).map(([weapon, tons]) => ({
      weapon,
      ammoTons: tons,
      recommendedTons: Math.max(1, tons), // Simplified calculation
      turns: tons * 10, // Simplified turns of firing
      adequate: tons >= 1
    }));
  }

  private static generateAmmoSuggestions(
    allocated: EquipmentPlacement[],
    unallocated: any[],
    caseProtection: any
  ): string[] {
    const suggestions: string[] = [];

    if (unallocated.length > 0) {
      suggestions.push(`${unallocated.length} ammunition bins could not be allocated`);
    }

    if (caseProtection.unprotected.length > 0) {
      suggestions.push('Consider CASE protection for explosive ammunition');
    }

    return suggestions;
  }

  private static getEngineHeatSinks(config: UnitConfiguration): number {
    const engineRating = config.engineRating || 0;
    const { calculateInternalHeatSinksForEngine } = require('../../utils/heatSinkCalculations');
    return calculateInternalHeatSinksForEngine(engineRating, 'Standard');
  }

  private static findBestHeatSinkPlacement(
    heatSink: any,
    config: UnitConfiguration,
    allocated: EquipmentPlacement[],
    preferredLocations: string[]
  ): EquipmentPlacement | null {
    const constraints = PlacementCalculationService.getEquipmentConstraints(heatSink);

    // Try preferred locations first
    for (const location of preferredLocations) {
      if (constraints.allowedLocations.includes(location)) {
        const availableSlots = PlacementCalculationService.findAvailableSlots(location, heatSink, allocated, config);
        if (availableSlots.length >= (heatSink.equipmentData?.criticals || 1)) {
          return {
            equipmentId: this.generateEquipmentId(heatSink),
            equipment: heatSink,
            location,
            slots: availableSlots.slice(0, heatSink.equipmentData?.criticals || 1),
            isFixed: false,
            isValid: true,
            constraints,
            conflicts: []
          };
        }
      }
    }

    // Fall back to optimal placement
    const placements = PlacementCalculationService.findOptimalPlacement(heatSink, config, allocated);
    if (placements.length > 0) {
      return {
        equipmentId: this.generateEquipmentId(heatSink),
        equipment: heatSink,
        location: placements[0].location,
        slots: placements[0].slots,
        isFixed: false,
        isValid: true,
        constraints,
        conflicts: []
      };
    }

    return null;
  }

  private static calculateTotalHeatDissipation(
    engineHeatSinks: number,
    externalHeatSinks: number,
    config: UnitConfiguration
  ): number {
    const heatSinkType = typeof config.heatSinkType === 'string' ? config.heatSinkType : (config.heatSinkType as any)?.type || 'Standard';
    const isDoubleHeatSinks = heatSinkType === 'Double' || heatSinkType === 'Clan Double';
    const multiplier = isDoubleHeatSinks ? 2 : 1;

    return (engineHeatSinks + externalHeatSinks) * multiplier;
  }

  private static calculateHeatBalance(config: UnitConfiguration, allocated: EquipmentPlacement[]) {
    let generation = 0;
    for (const alloc of allocated) {
      generation += alloc.equipment.equipmentData?.heat || 0;
    }

    const engineHeatSinks = this.getEngineHeatSinks(config);
    const externalHeatSinks = allocated.filter(a => a.equipment.equipmentData?.type === 'heat_sink').length;
    const dissipation = this.calculateTotalHeatDissipation(engineHeatSinks, externalHeatSinks, config);

    return {
      generation,
      dissipation,
      deficit: Math.max(0, generation - dissipation)
    };
  }

  private static generateHeatSinkOptimization(allocated: EquipmentPlacement[], heatBalance: any): string[] {
    const optimization: string[] = [];

    if (heatBalance.deficit > 0) {
      const sinksNeeded = Math.ceil(heatBalance.deficit / 2);
      optimization.push(`Add ${sinksNeeded} more heat sinks to achieve heat balance`);
    } else if (heatBalance.deficit < -10) {
      optimization.push('Heat generation is well managed - consider more weapons');
    }

    return optimization;
  }

  private static calculateOptimalJumpJetDistribution(jumpJetCount: number, config: UnitConfiguration) {
    // Standard BattleTech recommendation: some in center torso, rest in legs
    const maxCenterTorso = Math.min(2, jumpJetCount);
    const centerTorso = Math.min(maxCenterTorso, jumpJetCount);
    const legs = jumpJetCount - centerTorso;

    return { centerTorso, legs };
  }

  private static placeJumpJetInLocation(
    jumpJet: any,
    location: string,
    config: UnitConfiguration,
    allocated: EquipmentPlacement[]
  ): EquipmentPlacement | null {
    const constraints = PlacementCalculationService.getEquipmentConstraints(jumpJet);
    
    if (constraints.allowedLocations.includes(location)) {
      const availableSlots = PlacementCalculationService.findAvailableSlots(location, jumpJet, allocated, config);
      if (availableSlots.length >= (jumpJet.equipmentData?.criticals || 1)) {
        return {
          equipmentId: this.generateEquipmentId(jumpJet),
          equipment: jumpJet,
          location,
          slots: availableSlots.slice(0, jumpJet.equipmentData?.criticals || 1),
          isFixed: false,
          isValid: true,
          constraints,
          conflicts: []
        };
      }
    }
    
    return null;
  }

  private static validateJumpJetAllocation(allocated: EquipmentPlacement[], config: UnitConfiguration) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const jumpJets = allocated.filter(a => a.equipment.equipmentData?.type === 'jump_jet');
    const maxJumpMP = Math.min(8, Math.floor((config.tonnage || 100) / 10));
    
    if (jumpJets.length > maxJumpMP) {
      errors.push(`Too many jump jets: ${jumpJets.length} > ${maxJumpMP}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ===== STRATEGY HELPER METHODS =====

  private static calculateStrategyScore(result: any, config: UnitConfiguration): number {
    let score = 0;
    
    // Success rate (40% weight)
    const successRate = result.allocations.length / (result.allocations.length + result.unallocated.length);
    score += successRate * 40;
    
    // Efficiency (30% weight)
    const efficiency = PlacementCalculationService.calculatePlacementEfficiency(result.allocations, config);
    score += efficiency * 0.3;
    
    // Balance (20% weight)
    const balance = this.calculateBalanceScore(result.allocations);
    score += balance * 0.2;
    
    // Warning penalty (10% weight)
    const warningPenalty = Math.min(10, result.warnings.length * 2);
    score -= warningPenalty;
    
    return Math.max(0, score);
  }

  private static calculateAllocationMetrics(result: any, config: UnitConfiguration): AllocationMetrics {
    const total = result.allocations.length + result.unallocated.length;
    const successRate = total > 0 ? (result.allocations.length / total) * 100 : 100;
    
    const efficiencyScore = PlacementCalculationService.calculatePlacementEfficiency(result.allocations, config);
    const balanceScore = this.calculateBalanceScore(result.allocations);
    const utilization = this.calculateLocationUtilization(result.allocations);
    
    return {
      successRate,
      efficiencyScore,
      balanceScore,
      utilization
    };
  }

  private static generateImprovementSuggestions(result: any, config: UnitConfiguration): string[] {
    const suggestions: string[] = [];
    
    if (result.unallocated.length > 0) {
      suggestions.push(`${result.unallocated.length} items could not be allocated - consider different chassis or equipment selection`);
    }
    
    const efficiency = PlacementCalculationService.calculatePlacementEfficiency(result.allocations, config);
    if (efficiency < 70) {
      suggestions.push('Equipment placement efficiency is suboptimal - consider manual optimization');
    }
    
    const balance = this.calculateBalanceScore(result.allocations);
    if (balance < 60) {
      suggestions.push('Equipment distribution is unbalanced - redistribute weight between left and right sides');
    }
    
    return suggestions;
  }

  private static selectBalancedPlacement(placements: any[], existingAllocations: EquipmentPlacement[]) {
    // Choose placement that best maintains left/right balance
    let bestPlacement = placements[0];
    let bestBalance = 0;
    
    for (const placement of placements) {
      const balance = this.calculatePlacementBalance(placement, existingAllocations);
      if (balance > bestBalance) {
        bestBalance = balance;
        bestPlacement = placement;
      }
    }
    
    return bestPlacement;
  }

  private static selectDistributedPlacement(placements: any[], locationUsage: { [location: string]: number }) {
    // Choose least used location
    let bestPlacement = placements[0];
    let lowestUsage = locationUsage[placements[0].location] || 0;
    
    for (const placement of placements) {
      const usage = locationUsage[placement.location] || 0;
      if (usage < lowestUsage) {
        lowestUsage = usage;
        bestPlacement = placement;
      }
    }
    
    return bestPlacement;
  }

  private static groupEquipmentByType(equipment: any[]): { [type: string]: any[] } {
    const groups: { [type: string]: any[] } = {};
    
    for (const item of equipment) {
      const type = item.equipmentData?.type || 'equipment';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
    }
    
    return groups;
  }

  private static getTypePreferredLocations(type: string): string[] {
    const preferences: { [key: string]: string[] } = {
      'energy_weapon': ['leftArm', 'rightArm', 'leftTorso', 'rightTorso'],
      'ballistic_weapon': ['leftTorso', 'rightTorso', 'leftArm', 'rightArm'],
      'missile_weapon': ['leftTorso', 'rightTorso'],
      'ammunition': ['leftTorso', 'rightTorso', 'leftLeg', 'rightLeg'],
      'heat_sink': ['leftLeg', 'rightLeg', 'leftTorso', 'rightTorso'],
      'jump_jet': ['centerTorso', 'leftLeg', 'rightLeg']
    };
    
    return preferences[type] || ['centerTorso', 'leftTorso', 'rightTorso'];
  }

  private static generateEquipmentId(equipment: any): string {
    const name = equipment.equipmentData?.name || 'Unknown';
    const timestamp = Date.now();
    return `${name.replace(/\s+/g, '_')}_${timestamp}`;
  }

  private static calculateBalanceScore(allocations: EquipmentPlacement[]): number {
    let leftWeight = 0;
    let rightWeight = 0;
    
    for (const alloc of allocations) {
      const weight = alloc.equipment.equipmentData?.tonnage || 0;
      
      if (alloc.location.includes('left')) {
        leftWeight += weight;
      } else if (alloc.location.includes('right')) {
        rightWeight += weight;
      }
    }
    
    if (leftWeight === 0 && rightWeight === 0) return 100;
    
    const maxWeight = Math.max(leftWeight, rightWeight);
    const minWeight = Math.min(leftWeight, rightWeight);
    const balance = minWeight / maxWeight;
    
    return balance * 100;
  }

  private static calculatePlacementBalance(placement: any, existingAllocations: EquipmentPlacement[]): number {
    // Simulate adding this placement and calculate resulting balance
    const testAllocations = [...existingAllocations];
    testAllocations.push({
      equipmentId: 'test',
      equipment: { equipmentData: { tonnage: 1 } },
      location: placement.location,
      slots: [],
      isFixed: false,
      isValid: true,
      constraints: { allowedLocations: [], forbiddenLocations: [], requiresCASE: false, requiresArtemis: false, minTonnageLocation: 0, maxTonnageLocation: 100, heatGeneration: 0, specialRules: [] },
      conflicts: []
    });
    
    return this.calculateBalanceScore(testAllocations);
  }

  private static calculateLocationUtilization(allocations: EquipmentPlacement[]): number {
    const locationSlots = {
      'head': 6, 'centerTorso': 12, 'leftTorso': 12, 'rightTorso': 12,
      'leftArm': 12, 'rightArm': 12, 'leftLeg': 6, 'rightLeg': 6
    };
    
    const usedSlots: { [location: string]: number } = {};
    
    for (const alloc of allocations) {
      usedSlots[alloc.location] = (usedSlots[alloc.location] || 0) + alloc.slots.length;
    }
    
    let totalUsed = 0;
    let totalAvailable = 0;
    
    for (const [location, available] of Object.entries(locationSlots)) {
      totalUsed += usedSlots[location] || 0;
      totalAvailable += available;
    }
    
    return totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;
  }
}

export default AutoAllocationEngine;





