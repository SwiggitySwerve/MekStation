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
import { BV2_SPEED_FACTORS_BY_TMM, calculateTMM } from '@/types/validation/BattleValue';

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
   * Calculate Battle Value using BV2 formula
   * BV = (Defensive BV + Offensive BV) × Speed Factor
   */
  calculateBattleValue(mech: IEditableMech): number {
    // 1. Calculate Defensive BV
    const defensiveBV = this.calculateDefensiveBV(mech);
    
    // 2. Calculate Offensive BV (weapons + ammo)
    const offensiveBV = this.calculateOffensiveBV(mech);
    
    // 3. Calculate heat adjustment factor
    const heatAdjustment = this.calculateHeatAdjustment(mech);
    
    // 4. Get speed factor from movement
    const movement = this.calculateMovement(mech);
    const speedFactor = this.getSpeedFactor(movement.runMP, movement.jumpMP);
    
    // 5. Apply formula: (Defensive + (Offensive × Heat Adjustment)) × Speed Factor
    const adjustedOffensive = offensiveBV * heatAdjustment;
    const baseBV = defensiveBV + adjustedOffensive;
    const finalBV = baseBV * speedFactor;
    
    // #region agent log
    console.log('[BV DEBUG] Total BV:', { defensiveBV, offensiveBV, heatAdjustment, movement, speedFactor, adjustedOffensive, baseBV, finalBV: Math.round(finalBV) });
    // #endregion
    
    return Math.round(finalBV);
  }

  /**
   * Calculate defensive BV from armor and structure
   */
  private calculateDefensiveBV(mech: IEditableMech): number {
    // Armor BV = total armor points × 2.5
    const totalArmorPoints = this.calculateTotalArmorPoints(mech);
    const armorBV = totalArmorPoints * 2.5;
    
    // Structure BV = total structure points × 1.5
    const totalStructurePoints = this.calculateTotalStructurePoints(mech);
    const structureBV = totalStructurePoints * 1.5;
    
    // #region agent log
    console.log('[BV DEBUG] Defensive BV:', { totalArmorPoints, armorBV, totalStructurePoints, structureBV, totalDefensiveBV: armorBV + structureBV, armorAllocation: mech.armorAllocation });
    // #endregion
    
    return armorBV + structureBV;
  }

  /**
   * Calculate offensive BV from weapons and ammunition
   */
  private calculateOffensiveBV(mech: IEditableMech): number {
    const registry = getEquipmentRegistry();
    
    // If registry isn't initialized, trigger initialization and return 0
    // The component will re-render when data is available
    if (!registry.isReady()) {
      // Trigger async initialization (fire-and-forget)
      registry.initialize().catch(console.error);
      console.log('[BV DEBUG] Registry not ready, returning 0 offensive BV');
      return 0;
    }
    
    let totalBV = 0;
    
    // #region agent log
    const bvDebugInfo: Array<{ equipmentId: string; found: boolean; bv: number; hasBV: boolean }> = [];
    // #endregion
    
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      // #region agent log
      const equipmentKeys = result.equipment ? Object.keys(result.equipment) : [];
      const rawBV = result.equipment ? (result.equipment as Record<string, unknown>).battleValue : undefined;
      console.log('[BV DEBUG] Equipment lookup:', { 
        equipmentId: slot.equipmentId, 
        found: result.found, 
        equipmentName: result.equipment?.name,
        hasEquipment: !!result.equipment,
        hasBattleValueProp: result.equipment ? 'battleValue' in result.equipment : false,
        rawBV,
        keys: equipmentKeys.slice(0, 10)
      });
      // #endregion
      if (result.found && result.equipment && 'battleValue' in result.equipment) {
        const bv = (result.equipment as { battleValue: number }).battleValue;
        totalBV += bv;
        // #region agent log
        bvDebugInfo.push({ equipmentId: slot.equipmentId, found: true, bv, hasBV: true });
        // #endregion
      } else {
        // #region agent log
        bvDebugInfo.push({ equipmentId: slot.equipmentId, found: result.found, bv: 0, hasBV: result.equipment ? 'battleValue' in result.equipment : false });
        // #endregion
      }
    }
    
    // #region agent log
    console.log('[BV DEBUG] Offensive BV:', { equipmentCount: mech.equipment.length, bvDebugInfo: JSON.stringify(bvDebugInfo), totalBV });
    // #endregion
    
    return totalBV;
  }

  /**
   * Calculate heat adjustment factor for BV
   * 
   * Per BV2 rules, mechs that generate more heat than they dissipate
   * receive a reduced offensive BV based on heat efficiency.
   * 
   * Heat Efficiency = dissipation / generation (capped at 1.0)
   * The adjustment factor ranges from ~0.5 (very inefficient) to 1.0 (heat neutral)
   */
  private calculateHeatAdjustment(mech: IEditableMech): number {
    const heatProfile = this.calculateHeatProfile(mech);
    
    // No penalty if heat neutral or negative (can dissipate all heat)
    if (heatProfile.netHeat <= 0 || heatProfile.alphaStrikeHeat <= 0) {
      return 1.0;
    }
    
    // BV2 heat adjustment: based on TechManual errata
    // The formula uses the ratio of dissipation to generation
    // Penalty only applies when generating significantly more heat than dissipation
    const heatEfficiency = Math.min(1.0, heatProfile.heatDissipated / heatProfile.alphaStrikeHeat);
    
    // Per BV2 rules, the adjustment is more lenient for small amounts of excess heat
    // Formula: efficiency ratio with a floor of 0.5
    // For mechs that can dissipate 70%+ of their heat, minimal penalty
    // For mechs that can only dissipate 50% or less, significant penalty
    let adjustment: number;
    if (heatEfficiency >= 0.9) {
      // 90%+ efficiency: no penalty
      adjustment = 1.0;
    } else if (heatEfficiency >= 0.7) {
      // 70-90% efficiency: small penalty (0.95-1.0)
      adjustment = 0.95 + ((heatEfficiency - 0.7) * 0.25);
    } else {
      // Below 70% efficiency: scaling penalty down to 0.5
      adjustment = 0.5 + (heatEfficiency * 0.64);
    }
    
    // #region agent log
    console.log('[BV DEBUG] Heat Adjustment:', { 
      alphaStrikeHeat: heatProfile.alphaStrikeHeat, 
      heatDissipated: heatProfile.heatDissipated, 
      netHeat: heatProfile.netHeat,
      heatEfficiency, 
      adjustment 
    });
    // #endregion
    
    return adjustment;
  }

  /**
   * Get speed factor from BV2 table using TMM
   * Per TechManual BV2 rules
   */
  private getSpeedFactor(runMP: number, jumpMP: number): number {
    // Calculate TMM from movement profile
    const tmm = calculateTMM(runMP, jumpMP);
    
    // Look up speed factor by TMM (capped at 10)
    const cappedTMM = Math.min(10, Math.max(0, tmm));
    const speedFactor = BV2_SPEED_FACTORS_BY_TMM[cappedTMM] ?? 1.0;
    
    // #region agent log
    console.log('[BV DEBUG] Speed Factor:', { runMP, jumpMP, tmm, speedFactor });
    // #endregion
    
    return speedFactor;
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

