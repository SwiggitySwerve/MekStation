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
import { getStructurePoints } from '@/types/construction/InternalStructureType';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getDefensiveSpeedFactor, getOffensiveSpeedFactor } from '@/types/validation/BattleValue';

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
    
    // If registry isn't initialized, trigger initialization and return 0
    if (!registry.isReady()) {
      registry.initialize().catch(console.error);
      return 0;
    }
    
    // Calculate heat dissipation
    const heatSinkCapacity = mech.heatSinkType.includes('Double') ? 2 : 1;
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
    // 1. Structure cost: tonnage × 400 (standard)
    let structureCost = mech.tonnage * 400;
    if (mech.structureType.toLowerCase().includes('endo')) {
      structureCost *= 2; // Endo Steel is 2× cost
    }
    
    // 2. Engine cost: rating × 5000 × weight / standard weight
    let engineCostMultiplier = 1.0;
    if (mech.engineType.toLowerCase().includes('xl')) {
      engineCostMultiplier = 2.0;
    } else if (mech.engineType.toLowerCase().includes('light')) {
      engineCostMultiplier = 1.5;
    } else if (mech.engineType.toLowerCase().includes('xxl')) {
      engineCostMultiplier = 3.0;
    } else if (mech.engineType.toLowerCase().includes('compact')) {
      engineCostMultiplier = 1.5;
    }
    const engineCost = (mech.engineRating * 5000) * engineCostMultiplier;
    
    // 3. Gyro cost: rating × 300 (standard)
    let gyroCostMultiplier = 1.0;
    if (mech.gyroType.toLowerCase().includes('xl')) {
      gyroCostMultiplier = 2.0;
    } else if (mech.gyroType.toLowerCase().includes('compact')) {
      gyroCostMultiplier = 4.0;
    } else if (mech.gyroType.toLowerCase().includes('heavy')) {
      gyroCostMultiplier = 0.5;
    }
    const gyroCost = (mech.engineRating * 300) * gyroCostMultiplier;
    
    // 4. Cockpit cost: 200,000 (standard)
    let cockpitCost = 200000;
    if (mech.cockpitType.toLowerCase().includes('small')) {
      cockpitCost = 175000;
    } else if (mech.cockpitType.toLowerCase().includes('command')) {
      cockpitCost = 500000;
    }
    
    // 5. Armor cost: armor weight × 10,000 (standard)
    const armorWeight = this.calculateArmorWeight(mech);
    let armorCostMultiplier = 1.0;
    if (mech.armorType.toLowerCase().includes('ferro')) {
      armorCostMultiplier = 2.0;
    } else if (mech.armorType.toLowerCase().includes('stealth')) {
      armorCostMultiplier = 5.0;
    } else if (mech.armorType.toLowerCase().includes('reactive')) {
      armorCostMultiplier = 3.0;
    }
    const armorCost = armorWeight * 10000 * armorCostMultiplier;
    
    // 6. Equipment cost: sum of all equipment costs
    const registry = getEquipmentRegistry();
    let equipmentCost = 0;
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (result.found && result.equipment && 'cost' in result.equipment) {
        equipmentCost += (result.equipment as { cost: number }).cost;
      }
    }
    
    // 7. Heat sink cost: 2000 per single, 6000 per double (beyond engine integral)
    const integralHeatSinks = Math.floor(mech.engineRating / 25);
    const externalHeatSinks = Math.max(0, mech.heatSinkCount - integralHeatSinks);
    const heatSinkCostPer = mech.heatSinkType.includes('Double') ? 6000 : 2000;
    const heatSinkCost = externalHeatSinks * heatSinkCostPer;
    
    // Total base cost
    const baseCost = structureCost + engineCost + gyroCost + cockpitCost + 
                     armorCost + equipmentCost + heatSinkCost;
    
    // Apply final multiplier (1.25 for 'Mechs is the standard construction multiplier)
    return Math.round(baseCost * 1.25);
  }

  /**
   * Calculate heat profile from weapons and heat sinks
   */
  calculateHeatProfile(mech: IEditableMech): IHeatProfile {
    // Calculate heat dissipation
    const heatSinkCapacity = mech.heatSinkType.includes('Double') ? 2 : 1;
    const heatDissipated = mech.heatSinkCount * heatSinkCapacity;

    // Calculate heat generated from weapons
    const registry = getEquipmentRegistry();
    
    // If registry isn't initialized, trigger initialization and return default
    if (!registry.isReady()) {
      registry.initialize().catch(console.error);
      console.log('[HEAT DEBUG] Registry not ready, returning default heat profile');
      return {
        heatGenerated: 0,
        heatDissipated,
        netHeat: -heatDissipated,
        alphaStrikeHeat: 0,
      };
    }
    
    let heatGenerated = 0;
    
    // #region agent log
    const heatDebugInfo: Array<{ equipmentId: string; heat: number; found: boolean }> = [];
    // #endregion
    
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (result.found && result.equipment && 'heat' in result.equipment) {
        const heat = (result.equipment as { heat: number }).heat;
        heatGenerated += heat;
        // #region agent log
        heatDebugInfo.push({ equipmentId: slot.equipmentId, heat, found: true });
        // #endregion
      } else {
        // #region agent log
        heatDebugInfo.push({ equipmentId: slot.equipmentId, heat: 0, found: result.found });
        // #endregion
      }
    }
    
    // #region agent log
    console.log('[HEAT DEBUG] Heat Profile:', { 
      equipmentCount: mech.equipment.length, 
      heatGenerated, 
      heatDissipated,
      heatSinkCount: mech.heatSinkCount,
      heatSinkType: mech.heatSinkType,
      heatDebugInfo: JSON.stringify(heatDebugInfo)
    });
    // #endregion

    // Alpha strike heat = total heat from firing all weapons
    const alphaStrikeHeat = heatGenerated;

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

// Singleton instance
export const calculationService = new CalculationService();

