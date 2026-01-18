/**
 * Calculation Service
 * 
 * Computes derived values for mech builds.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { IEditableMech } from './MechBuilderService';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { getStructurePoints } from '@/types/construction/InternalStructureType';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getDefensiveSpeedFactor, getOffensiveSpeedFactor } from '@/types/validation/BattleValue';
import {
  COCKPIT_COST_STANDARD,
  COCKPIT_COST_SMALL,
  COCKPIT_COST_COMMAND_CONSOLE,
  STRUCTURE_COST_BASE,
  STRUCTURE_COST_MULTIPLIER_STANDARD,
  STRUCTURE_COST_MULTIPLIER_ENDO_STEEL,
  STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE,
  ENGINE_COST_BASE,
  GYRO_COST_BASE,
  ARMOR_COST_BASE,
  ARMOR_COST_MULTIPLIER_STANDARD,
  ARMOR_COST_MULTIPLIER_FERRO_FIBROUS,
  ARMOR_COST_MULTIPLIER_STEALTH,
  ARMOR_COST_MULTIPLIER_REACTIVE,
  ARMOR_COST_MULTIPLIER_REFLECTIVE,
  HEAT_SINK_COST_SINGLE,
  HEAT_SINK_COST_DOUBLE,
  HEAT_SINK_CAPACITY_SINGLE,
  HEAT_SINK_CAPACITY_DOUBLE,
  ENGINE_INTEGRAL_HEAT_SINK_DIVISOR,
  MECH_CONSTRUCTION_MULTIPLIER,
} from './constructionConstants';

// =============================================================================
// TYPE-SAFE HELPER FUNCTIONS
// Handle both enum values and legacy string values for backward compatibility
// =============================================================================

/**
 * Check if a heat sink type is a double heat sink variant
 */
function isDoubleHeatSink(heatSinkType: HeatSinkType | string): boolean {
  if (heatSinkType === HeatSinkType.DOUBLE_IS || heatSinkType === HeatSinkType.DOUBLE_CLAN) {
    return true;
  }
  if (typeof heatSinkType === 'string') {
    return heatSinkType.toLowerCase().includes('double');
  }
  return false;
}

/**
 * Get engine cost multiplier based on engine type
 */
function getEngineCostMultiplier(engineType: EngineType | string): number {
  const typeStr = typeof engineType === 'string' ? engineType.toLowerCase() : engineType;
  
  // Check enum values first
  if (engineType === EngineType.XL_IS || engineType === EngineType.XL_CLAN) return 2.0;
  if (engineType === EngineType.LIGHT) return 1.5;
  if (engineType === EngineType.XXL) return 3.0;
  if (engineType === EngineType.COMPACT) return 1.5;
  
  // Check legacy string values
  if (typeof typeStr === 'string') {
    if (typeStr.includes('xxl')) return 3.0;
    if (typeStr.includes('xl')) return 2.0;
    if (typeStr.includes('light')) return 1.5;
    if (typeStr.includes('compact')) return 1.5;
  }
  
  return 1.0;
}

/**
 * Get gyro cost multiplier based on gyro type
 */
function getGyroCostMultiplier(gyroType: GyroType | string): number {
  // Check enum values first
  if (gyroType === GyroType.XL) return 2.0;
  if (gyroType === GyroType.COMPACT) return 4.0;
  if (gyroType === GyroType.HEAVY_DUTY) return 0.5;
  
  // Check legacy string values
  if (typeof gyroType === 'string') {
    const typeStr = gyroType.toLowerCase();
    if (typeStr.includes('xl')) return 2.0;
    if (typeStr.includes('compact')) return 4.0;
    if (typeStr.includes('heavy')) return 0.5;
  }
  
  return 1.0;
}

/**
 * Get cockpit cost based on cockpit type
 */
function getCockpitCost(cockpitType: CockpitType | string): number {
  if (cockpitType === CockpitType.SMALL) return COCKPIT_COST_SMALL;
  if (cockpitType === CockpitType.COMMAND_CONSOLE) return COCKPIT_COST_COMMAND_CONSOLE;
  
  if (typeof cockpitType === 'string') {
    const typeStr = cockpitType.toLowerCase();
    if (typeStr.includes('small')) return COCKPIT_COST_SMALL;
    if (typeStr.includes('command')) return COCKPIT_COST_COMMAND_CONSOLE;
  }
  
  return COCKPIT_COST_STANDARD;
}

/**
 * Get structure cost multiplier based on structure type
 */
function getStructureCostMultiplier(structureType: InternalStructureType | string): number {
  if (structureType === InternalStructureType.ENDO_STEEL_IS || 
      structureType === InternalStructureType.ENDO_STEEL_CLAN) return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  if (structureType === InternalStructureType.ENDO_COMPOSITE) return STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE;
  
  if (typeof structureType === 'string') {
    if (structureType.toLowerCase().includes('endo')) return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  }
  
  return STRUCTURE_COST_MULTIPLIER_STANDARD;
}

/**
 * Get armor cost multiplier based on armor type
 */
function getArmorCostMultiplier(armorType: ArmorTypeEnum | string): number {
  if (armorType === ArmorTypeEnum.FERRO_FIBROUS_IS || 
      armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN ||
      armorType === ArmorTypeEnum.LIGHT_FERRO ||
      armorType === ArmorTypeEnum.HEAVY_FERRO) return ARMOR_COST_MULTIPLIER_FERRO_FIBROUS;
  if (armorType === ArmorTypeEnum.STEALTH) return ARMOR_COST_MULTIPLIER_STEALTH;
  if (armorType === ArmorTypeEnum.REACTIVE) return ARMOR_COST_MULTIPLIER_REACTIVE;
  if (armorType === ArmorTypeEnum.REFLECTIVE) return ARMOR_COST_MULTIPLIER_REFLECTIVE;
  
  if (typeof armorType === 'string') {
    const typeStr = armorType.toLowerCase();
    if (typeStr.includes('ferro')) return ARMOR_COST_MULTIPLIER_FERRO_FIBROUS;
    if (typeStr.includes('stealth')) return ARMOR_COST_MULTIPLIER_STEALTH;
    if (typeStr.includes('reactive')) return ARMOR_COST_MULTIPLIER_REACTIVE;
    if (typeStr.includes('reflective')) return ARMOR_COST_MULTIPLIER_REFLECTIVE;
  }
  
  return ARMOR_COST_MULTIPLIER_STANDARD;
}

/**
 * Mech totals summary
 */
export interface IMechTotals {
  readonly totalWeight: number;
  readonly remainingWeight: number;
  readonly maxWeight: number;
  readonly totalArmorPoints: number;
  readonly maxArmorPoints: number;
  readonly usedCriticalSlots: number;
  readonly totalCriticalSlots: number;
}

/**
 * Heat profile analysis
 */
export interface IHeatProfile {
  readonly heatGenerated: number;
  readonly heatDissipated: number;
  readonly netHeat: number;
  readonly alphaStrikeHeat: number;
}

/**
 * Movement profile
 */
export interface IMovementProfile {
  readonly walkMP: number;
  readonly runMP: number;
  readonly jumpMP: number;
  readonly sprintMP?: number;
}

/**
 * Calculation service interface
 */
export interface ICalculationService {
  calculateTotals(mech: IEditableMech): IMechTotals;
  calculateBattleValue(mech: IEditableMech): number;
  calculateCost(mech: IEditableMech): number;
  calculateHeatProfile(mech: IEditableMech): IHeatProfile;
  calculateMovement(mech: IEditableMech): IMovementProfile;
}

/**
 * Calculation Service implementation
 */
export class CalculationService implements ICalculationService {

  /**
   * Calculate all totals for a mech
   */
  calculateTotals(mech: IEditableMech): IMechTotals {
    const weights = this.calculateComponentWeights(mech);
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

    const armorPoints = this.calculateTotalArmorPoints(mech);
    const maxArmorPoints = this.calculateMaxArmorPoints(mech.tonnage);

    const usedSlots = mech.equipment.length;
    const totalSlots = 78; // Standard mech has 78 critical slots

    return {
      totalWeight,
      remainingWeight: mech.tonnage - totalWeight,
      maxWeight: mech.tonnage,
      totalArmorPoints: armorPoints,
      maxArmorPoints,
      usedCriticalSlots: usedSlots,
      totalCriticalSlots: totalSlots,
    };
  }

  /**
   * Calculate Battle Value using MegaMekLab BV2 formula
   * 
   * Formula:
   *   Defensive BV = (armor + structure + gyro) × defensiveSpeedFactor
   *   Offensive BV = (incrementalWeaponsBV + ammoBV + tonnage) × offensiveSpeedFactor
   *   Total BV = round(Defensive BV + Offensive BV)
   * 
   * @spec openspec/specs/battle-value-system/spec.md
   */
  calculateBattleValue(mech: IEditableMech): number {
    const movement = this.calculateMovement(mech);
    
    // 1. Calculate Defensive BV (includes gyro and defensive speed factor)
    const defensiveBV = this.calculateDefensiveBV(mech, movement);
    
    // 2. Calculate Offensive BV (includes incremental heat penalties, weight bonus, and offensive speed factor)
    const offensiveBV = this.calculateOffensiveBV(mech, movement);
    
    // 3. Final BV is simply the sum (speed factors already applied separately)
    const finalBV = defensiveBV + offensiveBV;
    
    return Math.round(finalBV);
  }

  /**
   * Calculate defensive BV from armor, structure, and gyro
   * Per MegaMekLab BV2: (armor + structure + gyro) × defensiveSpeedFactor
   * 
   * @spec openspec/specs/battle-value-system/spec.md
   */
  private calculateDefensiveBV(mech: IEditableMech, movement: IMovementProfile): number {
    // Armor BV = total armor points × 2.5
    const totalArmorPoints = this.calculateTotalArmorPoints(mech);
    const armorBV = totalArmorPoints * 2.5;
    
    // Structure BV = total structure points × 1.5
    const totalStructurePoints = this.calculateTotalStructurePoints(mech);
    const structureBV = totalStructurePoints * 1.5;
    
    // Gyro BV = tonnage × 0.5 (per MegaMekLab)
    const gyroBV = mech.tonnage * 0.5;
    
    // Base defensive BV before speed factor
    const baseDefensiveBV = armorBV + structureBV + gyroBV;
    
    // Apply defensive speed factor (TMM-based)
    const defensiveSpeedFactor = getDefensiveSpeedFactor(movement.runMP, movement.jumpMP);
    const finalDefensiveBV = baseDefensiveBV * defensiveSpeedFactor;
    
    return finalDefensiveBV;
  }

  /**
   * Calculate offensive BV using incremental heat tracking
   * Per MegaMekLab BV2: (incrementalWeaponsBV + ammoBV + tonnage) × offensiveSpeedFactor
   * 
   * Weapons are added incrementally with cumulative heat tracking.
   * Weapons that cause the mech to exceed heat dissipation receive 50% BV penalty.
   * 
   * @spec openspec/specs/battle-value-system/spec.md
   */
  private calculateOffensiveBV(mech: IEditableMech, movement: IMovementProfile): number {
    const registry = getEquipmentRegistry();
    
    if (!registry.isReady()) {
      registry.initialize().catch(() => {
        // Initialization error handled silently - will retry on next call
      });
      return 0;
    }
    
    const heatSinkCapacity = isDoubleHeatSink(mech.heatSinkType) ? HEAT_SINK_CAPACITY_DOUBLE : HEAT_SINK_CAPACITY_SINGLE;
    const heatDissipation = mech.heatSinkCount * heatSinkCapacity;
    
    // Running heat: 2 heat for running movement
    const RUNNING_HEAT = 2;
    let cumulativeHeat = RUNNING_HEAT;
    
    // Separate weapons/ammo from equipment
    const weaponsWithBV: Array<{ id: string; bv: number; heat: number; isAmmo: boolean }> = [];
    let ammoBV = 0;
    
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (!result.found || !result.equipment) continue;
      
      const equipment = result.equipment as { battleValue?: number; heat?: number; category?: string };
      const bv = equipment.battleValue ?? 0;
      const heat = equipment.heat ?? 0;
      const category = equipment.category ?? '';
      
      // Check if this is ammunition
      const isAmmo = category.toLowerCase().includes('ammun') || 
                     slot.equipmentId.toLowerCase().includes('ammo');
      
      if (isAmmo) {
        // Ammo BV is added directly, no heat penalty
        ammoBV += bv;
      } else if (heat > 0 || bv > 0) {
        // Heat-generating equipment or equipment with BV
        weaponsWithBV.push({ id: slot.equipmentId, bv, heat, isAmmo: false });
      }
    }
    
    // Sort weapons by BV descending (per MegaMekLab - highest BV weapons first)
    weaponsWithBV.sort((a, b) => b.bv - a.bv);
    
    // Calculate weapon BV with incremental heat penalties
    let weaponsBV = 0;
    
    for (const weapon of weaponsWithBV) {
      // Add this weapon's heat to cumulative heat
      cumulativeHeat += weapon.heat;
      
      // Check if we're now over dissipation threshold
      if (cumulativeHeat <= heatDissipation) {
        // Within dissipation: full BV
        weaponsBV += weapon.bv;
      } else {
        // Exceeds dissipation: 50% penalty
        weaponsBV += weapon.bv * 0.5;
      }
    }
    
    // Weight bonus: add tonnage
    const weightBonus = mech.tonnage;
    
    // Base offensive BV before speed factor
    const baseOffensiveBV = weaponsBV + ammoBV + weightBonus;
    
    // Apply offensive speed factor (slightly lower than defensive)
    const offensiveSpeedFactor = getOffensiveSpeedFactor(movement.runMP, movement.jumpMP);
    const finalOffensiveBV = baseOffensiveBV * offensiveSpeedFactor;
    
    return finalOffensiveBV;
  }

  /**
   * Calculate total structure points for the mech
   */
  private calculateTotalStructurePoints(mech: IEditableMech): number {
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso',
                       'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    let total = 0;
    
    for (const location of locations) {
      total += getStructurePoints(mech.tonnage, location);
    }
    
    return total;
  }

  /**
   * Calculate C-Bill cost using TechManual formula
   * Total Cost = (Structure + Engine + Gyro + Cockpit + Armor + Equipment) × Tech Multiplier
   */
  calculateCost(mech: IEditableMech): number {
    const structureCost = mech.tonnage * STRUCTURE_COST_BASE * getStructureCostMultiplier(mech.structureType);
    const engineCost = (mech.engineRating * ENGINE_COST_BASE) * getEngineCostMultiplier(mech.engineType);
    const gyroCost = (mech.engineRating * GYRO_COST_BASE) * getGyroCostMultiplier(mech.gyroType);
    
    const cockpitCost = getCockpitCost(mech.cockpitType);
    
    const armorWeight = this.calculateArmorWeight(mech);
    const armorCost = armorWeight * ARMOR_COST_BASE * getArmorCostMultiplier(mech.armorType);
    
    const registry = getEquipmentRegistry();
    let equipmentCost = 0;
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (result.found && result.equipment && 'cost' in result.equipment) {
        equipmentCost += (result.equipment as { cost: number }).cost;
      }
    }
    
    const integralHeatSinks = Math.floor(mech.engineRating / ENGINE_INTEGRAL_HEAT_SINK_DIVISOR);
    const externalHeatSinks = Math.max(0, mech.heatSinkCount - integralHeatSinks);
    const heatSinkCostPer = isDoubleHeatSink(mech.heatSinkType) ? HEAT_SINK_COST_DOUBLE : HEAT_SINK_COST_SINGLE;
    const heatSinkCost = externalHeatSinks * heatSinkCostPer;
    
    const baseCost = structureCost + engineCost + gyroCost + cockpitCost + 
                     armorCost + equipmentCost + heatSinkCost;
    
    return Math.round(baseCost * MECH_CONSTRUCTION_MULTIPLIER);
  }

  calculateHeatProfile(mech: IEditableMech): IHeatProfile {
    const heatSinkCapacity = isDoubleHeatSink(mech.heatSinkType) ? HEAT_SINK_CAPACITY_DOUBLE : HEAT_SINK_CAPACITY_SINGLE;
    const heatDissipated = mech.heatSinkCount * heatSinkCapacity;

    const registry = getEquipmentRegistry();
    
    if (!registry.isReady()) {
      registry.initialize().catch(() => {});
      return {
        heatGenerated: 0,
        heatDissipated,
        netHeat: -heatDissipated,
        alphaStrikeHeat: 0,
      };
    }
    
    let weaponHeat = 0;
    
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (result.found && result.equipment && 'heat' in result.equipment) {
        const heat = (result.equipment as { heat: number }).heat;
        weaponHeat += heat;
      }
    }

    const jumpJetIds = ['jump-jet', 'jump-jet-light', 'jump-jet-medium', 'jump-jet-heavy', 
                        'improved-jump-jet', 'improved-jump-jet-light', 'improved-jump-jet-medium', 'improved-jump-jet-heavy'];
    const jumpMP = mech.equipment.filter(eq => 
      jumpJetIds.some(id => eq.equipmentId.toLowerCase().includes(id.toLowerCase()))
    ).length;

    const runningHeat = 2;
    const jumpingHeat = jumpMP;
    const movementHeat = Math.max(runningHeat, jumpingHeat);

    const alphaStrikeHeat = weaponHeat;
    const heatGenerated = weaponHeat + movementHeat;

    return {
      heatGenerated,
      heatDissipated,
      netHeat: heatGenerated - heatDissipated,
      alphaStrikeHeat,
    };
  }

  /**
   * Calculate movement profile including jump MP from jump jets
   */
  calculateMovement(mech: IEditableMech): IMovementProfile {
    const walkMP = mech.walkMP;
    const runMP = Math.floor(walkMP * 1.5); // Per TechManual: floor(walk * 1.5)

    // Calculate jump MP from jump jet count
    const jumpJetIds = ['jump-jet', 'jump-jet-light', 'jump-jet-medium', 'jump-jet-heavy', 
                        'improved-jump-jet', 'improved-jump-jet-light', 'improved-jump-jet-medium', 'improved-jump-jet-heavy'];
    const jumpMP = mech.equipment.filter(eq => 
      jumpJetIds.some(id => eq.equipmentId.toLowerCase().includes(id.toLowerCase()))
    ).length;

    return {
      walkMP,
      runMP,
      jumpMP,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateComponentWeights(mech: IEditableMech): Record<string, number> {
    return {
      structure: mech.tonnage * 0.1, // 10% for standard
      engine: this.getEngineWeight(mech.engineRating, mech.engineType),
      gyro: Math.ceil(mech.engineRating / 100),
      cockpit: 3,
      armor: this.calculateArmorWeight(mech),
      heatSinks: Math.max(0, mech.heatSinkCount - 10),
    };
  }

  /**
   * Map engine type string to EngineType enum
   */
  private mapEngineType(type: string): EngineType {
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('XL') && typeUpper.includes('CLAN')) {
      return EngineType.XL_CLAN;
    }
    if (typeUpper.includes('XL')) {
      return EngineType.XL_IS;
    }
    if (typeUpper.includes('LIGHT')) {
      return EngineType.LIGHT;
    }
    if (typeUpper.includes('XXL')) {
      return EngineType.XXL;
    }
    if (typeUpper.includes('COMPACT')) {
      return EngineType.COMPACT;
    }
    if (typeUpper.includes('ICE') || typeUpper.includes('COMBUSTION')) {
      return EngineType.ICE;
    }
    if (typeUpper.includes('FUEL')) {
      return EngineType.FUEL_CELL;
    }
    if (typeUpper.includes('FISSION')) {
      return EngineType.FISSION;
    }
    return EngineType.STANDARD;
  }

  /**
   * Calculate engine weight using proper TechManual formula
   */
  private getEngineWeight(rating: number, type: string): number {
    const engineType = this.mapEngineType(type);
    return calculateEngineWeight(rating, engineType);
  }

  private calculateArmorWeight(mech: IEditableMech): number {
    const totalPoints = this.calculateTotalArmorPoints(mech);
    return Math.ceil(totalPoints / 16 * 2) / 2;
  }

  private calculateTotalArmorPoints(mech: IEditableMech): number {
    const a = mech.armorAllocation;
    return (
      a.head +
      a.centerTorso + a.centerTorsoRear +
      a.leftTorso + a.leftTorsoRear +
      a.rightTorso + a.rightTorsoRear +
      a.leftArm + a.rightArm +
      a.leftLeg + a.rightLeg
    );
  }

  /**
   * Calculate maximum armor points from internal structure
   * Per TechManual: max armor = 2 × structure points (head = 9)
   */
  private calculateMaxArmorPoints(tonnage: number): number {
    const locations = ['head', 'centerTorso', 'leftTorso', 'rightTorso', 
                       'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];
    let maxArmor = 0;
    
    for (const location of locations) {
      if (location === 'head') {
        maxArmor += 9; // Head max is always 9
      } else {
        const structure = getStructurePoints(tonnage, location);
        maxArmor += structure * 2;
      }
    }
    
    return maxArmor;
  }
}

// Singleton instance with lazy initialization
let _instance: CalculationService | null = null;

/**
 * Get the singleton CalculationService instance
 * Provides lazy initialization for better testability and DI support
 */
export function getCalculationService(): CalculationService {
  if (!_instance) {
    _instance = new CalculationService();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing)
 * @internal
 */
export function _resetCalculationService(): void {
  _instance = null;
}

// Legacy export for backward compatibility
// @deprecated Use getCalculationService() instead
export const calculationService = getCalculationService();

