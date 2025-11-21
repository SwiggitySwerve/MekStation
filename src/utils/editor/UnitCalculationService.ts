/**
 * Unit Calculation Service - Centralized calculation logic for unit editor
 * Handles weight, BV, cost, critical slots, and heat calculations
 * Follows SOLID principles for maintainable and testable calculation logic
 */

import { EditableUnit } from '../../types/editor'
import { calculateHeatGeneration, calculateEquipmentWeight, calculateCriticalSlots, calculateEquipmentBV } from '../equipmentData'
import { calculateGyroWeight } from '../../types/systemComponents';

export interface WeightBreakdown {
  structure: number
  engine: number
  gyro: number
  cockpit: number
  actuators: number
  armor: number
  equipment: number
  heatSinks: number
  jumpJets: number
  total: number
  remaining: number
  isOverweight: boolean
  utilizationPercentage: number
}

export interface BattleValueBreakdown {
  base: number
  equipment: number
  weapons: number
  defensive: number
  movement: number
  total: number
}

export interface CostBreakdown {
  base: number
  equipment: number
  weapons: number
  armor: number
  engine: number
  total: number
  formattedTotal: string
}

export interface CriticalSlotBreakdown {
  structure: number
  engine: number
  gyro: number
  cockpit: number
  actuators: number
  equipment: number
  used: number
  total: number
  free: number
  utilizationPercentage: number
  totals: {
    capacity: number;
    used: number;
    remaining: number;
    equipmentBurden: number;
    overCapacity: number;
  };
}

export interface HeatBalance {
  generation: number
  dissipation: number
  balance: number
  isOverheating: boolean
  heatEfficiency: number
}

export interface PerformanceMetrics {
  weight: WeightBreakdown
  battleValue: BattleValueBreakdown
  cost: CostBreakdown
  criticalSlots: CriticalSlotBreakdown
  heat: HeatBalance
  overallEfficiency: number
  warnings: string[]
}

export interface UnitCalculationOptions {
  includeAmmo: boolean
  useSystemComponents: boolean
  validateLimits: boolean
}

export class UnitCalculationService {
  private static defaultOptions: UnitCalculationOptions = {
    includeAmmo: true,
    useSystemComponents: true,
    validateLimits: true
  }

  /**
   * Calculate comprehensive performance metrics for a unit
   */
  static calculatePerformanceMetrics(
    unit: EditableUnit, 
    options: Partial<UnitCalculationOptions> = {}
  ): PerformanceMetrics {
    const opts = { ...this.defaultOptions, ...options }
    
    const weight = this.calculateWeightBreakdown(unit, opts)
    const battleValue = this.calculateBattleValueBreakdown(unit, opts)
    const cost = this.calculateCostBreakdown(unit, opts)
    const criticalSlots = this.calculateCriticalSlotBreakdown(unit, opts)
    const heat = this.calculateHeatBalance(unit, opts)
    
    const overallEfficiency = this.calculateOverallEfficiency(weight, battleValue, heat)
    const warnings = this.generatePerformanceWarnings(weight, heat, criticalSlots)
    
    return {
      weight,
      battleValue,
      cost,
      criticalSlots,
      heat,
      overallEfficiency,
      warnings
    }
  }

  /**
   * Calculate detailed weight breakdown
   */
  static calculateWeightBreakdown(
    unit: EditableUnit, 
    options: Partial<UnitCalculationOptions> = {}
  ): WeightBreakdown {
    const opts = { ...this.defaultOptions, ...options }
    const breakdown: WeightBreakdown = {
      structure: 0,
      engine: 0,
      gyro: 0,
      cockpit: 0,
      actuators: 0,
      armor: 0,
      equipment: 0,
      heatSinks: 0,
      jumpJets: 0,
      total: 0,
      remaining: 0,
      isOverweight: false,
      utilizationPercentage: 0
    }

    const unitMass = unit.mass || 50

    // Structure weight calculation
    if (opts.useSystemComponents && unit.systemComponents?.structure) {
      const structureMultiplier = unit.systemComponents.structure.type === 'Standard' ? 0.1 : 0.05
      breakdown.structure = unitMass * structureMultiplier
    } else {
      breakdown.structure = unitMass * 0.1 // Default to standard
    }

    // Engine weight calculation
    if (opts.useSystemComponents && unit.systemComponents?.engine) {
      const engine = unit.systemComponents.engine
      let engineMultiplier = 1
      
      switch (engine.type) {
        case 'XL (IS)':
        case 'XL (Clan)': engineMultiplier = 0.5; break
        case 'Light': engineMultiplier = 0.75; break
        case 'XXL': engineMultiplier = 0.33; break
        case 'Compact': engineMultiplier = 1.5; break
        case 'ICE':
        case 'Fuel Cell': engineMultiplier = 2.0; break
        default: engineMultiplier = 1.0
      }
      
      breakdown.engine = (engine.rating / 25) * engineMultiplier
    } else {
      // Fallback calculation
      const engineRating = unit.data?.engine?.rating || (unitMass * 4) // Assume 4/6/6 movement
      breakdown.engine = engineRating / 10
    }

    // Gyro weight calculation
    if (opts.useSystemComponents && unit.systemComponents?.gyro && unit.systemComponents?.engine) {
      const gyro = unit.systemComponents.gyro
      const engineRating = unit.systemComponents.engine.rating
      breakdown.gyro = calculateGyroWeight(engineRating, gyro.type)
    } else {
      breakdown.gyro = 3 // Default 3 tons
    }

    // Cockpit weight
    if (opts.useSystemComponents && unit.systemComponents?.cockpit) {
      breakdown.cockpit = unit.systemComponents.cockpit.type === 'Small' ? 2 : 3
    } else {
      breakdown.cockpit = 3 // Default standard cockpit
    }

    // Actuator weight (typically 0 for BattleMechs)
    breakdown.actuators = 0

    // Armor weight
    const armorPoints = unit.data?.armor?.total_armor_points || 0
    const armorType = unit.systemComponents?.armor?.type || 'Standard'
    const armorEfficiency = this.getArmorEfficiency(armorType)
    breakdown.armor = armorPoints / armorEfficiency

    // Heat sinks weight (external only)
    if (opts.useSystemComponents && unit.systemComponents?.heatSinks) {
      const heatSinks = unit.systemComponents.heatSinks
      const heatSinkWeight = (heatSinks.type === 'Double (IS)' || heatSinks.type === 'Double (Clan)') ? 1.0 : 1.0
      breakdown.heatSinks = heatSinks.externalRequired * heatSinkWeight
    } else {
      // Fallback - assume 10 total heat sinks minus engine integrated ones
      const totalHeatSinks = unit.data?.heat_sinks?.count || 10
      const engineHeatSinks = Math.min(10, Math.floor((breakdown.engine * 25) / 25))
      breakdown.heatSinks = Math.max(0, totalHeatSinks - engineHeatSinks)
    }

    // Equipment weight
    if (unit.data?.weapons_and_equipment) {
      breakdown.equipment = calculateEquipmentWeight(unit.data.weapons_and_equipment)
    }

    // Jump jets weight
    const jumpMP = unit.data?.movement?.jump_mp || 0
    if (jumpMP > 0) {
      if (unitMass <= 55) {
        breakdown.jumpJets = jumpMP * 0.5
      } else if (unitMass <= 85) {
        breakdown.jumpJets = jumpMP * 1.0
      } else {
        breakdown.jumpJets = jumpMP * 2.0
      }
    }

    // Calculate totals
    breakdown.total = breakdown.structure + breakdown.engine + breakdown.gyro + 
                    breakdown.cockpit + breakdown.actuators + breakdown.armor + 
                    breakdown.equipment + breakdown.heatSinks + breakdown.jumpJets
    
    breakdown.remaining = Math.max(0, unitMass - breakdown.total)
    breakdown.isOverweight = breakdown.total > unitMass
    breakdown.utilizationPercentage = Math.round((breakdown.total / unitMass) * 100)

    return breakdown
  }

  /**
   * Calculate battle value breakdown
   */
  static calculateBattleValueBreakdown(
    unit: EditableUnit,
    options: Partial<UnitCalculationOptions> = {}
  ): BattleValueBreakdown {
    const unitMass = unit.mass || 50
    
    // Base BV calculation (simplified)
    const base = unitMass * 2
    
    // Equipment BV
    const equipment = unit.data?.weapons_and_equipment 
      ? calculateEquipmentBV(unit.data.weapons_and_equipment)
      : 0
    
    // Weapons BV (subset of equipment for detailed breakdown)
    const weapons = unit.data?.weapons_and_equipment
      ?.filter(item => item.item_type === 'weapon')
      .reduce((total, weapon) => {
        // WeaponOrEquipmentItem doesn't have battle_value property yet
        // This will be implemented when equipment database is fully integrated
        return total + 0
      }, 0) || 0
    
    // Defensive BV (armor and structure)
    const armorPoints = unit.data?.armor?.total_armor_points || 0
    const defensive = Math.round(armorPoints * 0.5) // Simplified armor BV
    
    // Movement BV (based on walk/run speed)
    const walkMP = unit.data?.movement?.walk_mp || 4
    const movement = Math.round(walkMP * unitMass * 0.1) // Simplified movement BV
    
    const total = base + equipment + defensive + movement
    
    return {
      base,
      equipment,
      weapons,
      defensive,
      movement,
      total
    }
  }

  /**
   * Calculate cost breakdown
   */
  static calculateCostBreakdown(
    unit: EditableUnit,
    options: Partial<UnitCalculationOptions> = {}
  ): CostBreakdown {
    const unitMass = unit.mass || 50
    
    // Base cost (chassis and basic systems)
    const base = unitMass * 10000
    
    // Engine cost
    const engineRating = unit.systemComponents?.engine?.rating || (unitMass * 4)
    const engine = engineRating * 5000 // Simplified engine cost
    
    // Armor cost
    const armorPoints = unit.data?.armor?.total_armor_points || 0
    const armor = armorPoints * 50 // Simplified armor cost per point
    
    // Equipment cost
    const equipment = unit.data?.weapons_and_equipment
      ?.reduce((total, item) => {
        // WeaponOrEquipmentItem doesn't have cost property yet
        // This will be implemented when equipment database is fully integrated
        return total + 0
      }, 0) || 0
    
    // Weapons cost (subset of equipment)
    const weapons = unit.data?.weapons_and_equipment
      ?.filter(item => item.item_type === 'weapon')
      .reduce((total, weapon) => {
        // WeaponOrEquipmentItem doesn't have cost property yet
        // This will be implemented when equipment database is fully integrated
        return total + 0
      }, 0) || 0
    
    const total = base + engine + armor + equipment
    const formattedTotal = new Intl.NumberFormat('en-US').format(total)
    
    return {
      base,
      equipment,
      weapons,
      armor,
      engine,
      total,
      formattedTotal: `${formattedTotal} C-bills`
    }
  }

  /**
   * Calculate critical slot breakdown
   */
  static calculateCriticalSlotBreakdown(
    unit: EditableUnit,
    options: Partial<UnitCalculationOptions> = {}
  ): CriticalSlotBreakdown {
    // Fixed system components
    const structure = 0 // Standard structure uses no slots
    const engine = 6 // Standard engine in center torso
    const gyro = 4 // Standard gyro in center torso
    const cockpit = 5 // Cockpit, life support, sensors in head
    const actuators = 8 // 4 per arm for biped mech
    
    // Equipment slots
    const equipment = unit.data?.weapons_and_equipment 
      ? calculateCriticalSlots(unit.data.weapons_and_equipment)
      : 0
    
    const used = structure + engine + gyro + cockpit + actuators + equipment
    const total = 78 // Standard BattleMech total slots
    const free = Math.max(0, total - used)
    const utilizationPercentage = Math.round((used / total) * 100)
    
    return {
      structure,
      engine,
      gyro,
      cockpit,
      actuators,
      equipment,
      used,
      total,
      free,
      utilizationPercentage,
      totals: {
        capacity: total,
        used: used,
        remaining: free,
        equipmentBurden: 0, // This will be calculated later
        overCapacity: 0
      }
    }
  }

  /**
   * Calculate heat balance
   */
  static calculateHeatBalance(
    unit: EditableUnit,
    options: Partial<UnitCalculationOptions> = {}
  ): HeatBalance {
    // Heat generation from weapons
    const weapons = unit.data?.weapons_and_equipment?.filter(e => e.item_type === 'weapon') || []
    const generation = calculateHeatGeneration(weapons)
    
    // Heat dissipation from heat sinks
    const heatSinkCount = unit.data?.heat_sinks?.count || 10
    const heatSinkType = unit.systemComponents?.heatSinks?.type || 'Single'
    const heatSinkEfficiency = (heatSinkType === 'Double (IS)' || heatSinkType === 'Double (Clan)') ? 2.0 : 1.0
    const dissipation = heatSinkCount * heatSinkEfficiency
    
    const balance = dissipation - generation
    const isOverheating = balance < 0
    const heatEfficiency = generation > 0 ? Math.round((dissipation / generation) * 100) : 100
    
    return {
      generation,
      dissipation,
      balance,
      isOverheating,
      heatEfficiency
    }
  }

  /**
   * Calculate overall efficiency score
   */
  private static calculateOverallEfficiency(
    weight: WeightBreakdown,
    battleValue: BattleValueBreakdown,
    heat: HeatBalance
  ): number {
    // Efficiency factors (0-100 each)
    const weightEfficiency = weight.isOverweight ? 0 : Math.max(0, 100 - weight.utilizationPercentage)
    const heatEfficiency = heat.isOverheating ? 0 : Math.min(100, heat.heatEfficiency)
    const bvEfficiency = Math.min(100, (battleValue.total / (weight.total * 20)) * 100) // BV per ton
    
    // Weighted average
    return Math.round((weightEfficiency * 0.4 + heatEfficiency * 0.3 + bvEfficiency * 0.3))
  }

  /**
   * Generate performance warnings
   */
  private static generatePerformanceWarnings(
    weight: WeightBreakdown,
    heat: HeatBalance,
    criticalSlots: CriticalSlotBreakdown
  ): string[] {
    const warnings: string[] = []
    
    if (weight.isOverweight) {
      warnings.push(`Unit is ${(weight.total - weight.remaining).toFixed(1)} tons overweight`)
    }
    
    if (heat.isOverheating) {
      warnings.push(`Unit generates ${Math.abs(heat.balance)} more heat than it can dissipate`)
    }
    
    if (criticalSlots.free < 5) {
      warnings.push(`Only ${criticalSlots.free} critical slots remaining`)
    }
    
    if (weight.utilizationPercentage > 95) {
      warnings.push('Weight utilization over 95% - limited upgrade potential')
    }
    
    if (heat.heatEfficiency < 120 && heat.generation > 0) {
      warnings.push('Heat efficiency below 120% - consider more heat sinks')
    }
    
    return warnings
  }

  /**
   * Get armor efficiency by type
   */
  private static getArmorEfficiency(armorType: string): number {
    const armorEfficiency: Record<string, number> = {
      'Standard': 16,
      'Ferro-Fibrous': 17.6,
      'Light Ferro-Fibrous': 16.8,
      'Heavy Ferro-Fibrous': 20.8,
      'Hardened': 8,
      'Stealth': 16,
      'Reactive': 16,
      'Reflective': 16
    }
    
    return armorEfficiency[armorType] || 16
  }

  /**
   * Quick weight calculation for UI updates
   */
  static quickWeightCalculation(unit: EditableUnit): number {
    const breakdown = this.calculateWeightBreakdown(unit)
    return Math.round(breakdown.total * 10) / 10
  }

  /**
   * Quick validation for overweight status
   */
  static isOverweight(unit: EditableUnit): boolean {
    const currentWeight = this.quickWeightCalculation(unit)
    return currentWeight > (unit.mass || 0)
  }

  /**
   * Quick heat balance check
   */
  static isOverheating(unit: EditableUnit): boolean {
    const heat = this.calculateHeatBalance(unit)
    return heat.isOverheating
  }
}
