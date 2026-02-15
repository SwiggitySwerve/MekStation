/**
 * Calculation Service
 *
 * Computes derived values for mech builds.
 *
 * @spec openspec/specs/construction-services/spec.md
 */

import type {
  BVCalculationConfig,
  CockpitType as BVCockpitType,
} from '@/utils/construction/battleValueCalculations';

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { getStructurePoints } from '@/types/construction/InternalStructureType';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { logger } from '@/utils/logger';

import {
  calculateTotalStructurePoints,
  calculateTotalArmorPoints,
  calculateArmorWeight,
  calculateMaxArmorPoints,
  extractJumpMP,
} from './CalculationService.calculations';
import {
  isDoubleHeatSink,
  getEngineCostMultiplier,
  getGyroCostMultiplier,
  getCockpitCost,
  getStructureCostMultiplier,
  getArmorCostMultiplier,
  normalizeBVType,
} from './CalculationService.utils';
import {
  STRUCTURE_COST_BASE,
  ENGINE_COST_BASE,
  GYRO_COST_BASE,
  ARMOR_COST_BASE,
  HEAT_SINK_COST_SINGLE,
  HEAT_SINK_COST_DOUBLE,
  HEAT_SINK_CAPACITY_SINGLE,
  HEAT_SINK_CAPACITY_DOUBLE,
  ENGINE_INTEGRAL_HEAT_SINK_DIVISOR,
  MECH_CONSTRUCTION_MULTIPLIER,
} from './constructionConstants';
import { IEditableMech } from './MechBuilderService';

// Lazy-loaded BV engine — avoids pulling Node.js `fs` into browser bundle
// (equipmentBVResolver.ts reads equipment JSON from filesystem)
type CalculateTotalBVFn = (config: BVCalculationConfig) => number;
let _calculateTotalBV: CalculateTotalBVFn | null = null;
void import('@/utils/construction/battleValueCalculations').then((mod) => {
  _calculateTotalBV = mod.calculateTotalBV;
});

function calculateTotalBV(config: BVCalculationConfig): number {
  if (_calculateTotalBV) {
    return _calculateTotalBV(config);
  }
  return 0;
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

    const armorPoints = calculateTotalArmorPoints(mech);
    const maxArmorPoints = calculateMaxArmorPoints(mech.tonnage);

    const usedSlots = mech.equipment.length;
    const totalSlots = 78;

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
   * Calculate Battle Value using the validated BV 2.0 engine.
   *
   * Delegates to calculateTotalBV() from battleValueCalculations.ts which
   * implements the full MegaMek-accurate BV2 formula with heat tracking,
   * explosive penalties, and cockpit modifiers.
   *
   * @spec openspec/specs/battle-value-system/spec.md
   */
  calculateBattleValue(mech: IEditableMech): number {
    const movement = this.calculateMovement(mech);
    const heatSinkCapacity = isDoubleHeatSink(mech.heatSinkType)
      ? HEAT_SINK_CAPACITY_DOUBLE
      : HEAT_SINK_CAPACITY_SINGLE;

    const config: BVCalculationConfig = {
      totalArmorPoints: calculateTotalArmorPoints(mech),
      totalStructurePoints: calculateTotalStructurePoints(mech),
      tonnage: mech.tonnage,
      heatSinkCapacity: mech.heatSinkCount * heatSinkCapacity,
      walkMP: movement.walkMP,
      runMP: movement.runMP,
      jumpMP: movement.jumpMP,
      weapons: this.extractWeapons(mech),
      armorType: normalizeBVType(String(mech.armorType)),
      structureType: normalizeBVType(String(mech.structureType)),
      gyroType: normalizeBVType(String(mech.gyroType)),
      engineType:
        typeof mech.engineType === 'string'
          ? this.mapEngineType(mech.engineType)
          : mech.engineType,
      cockpitType: normalizeBVType(String(mech.cockpitType)) as BVCockpitType,
      heatSinkCount: mech.heatSinkCount,
      isIndustrialMech:
        normalizeBVType(String(mech.structureType)) === 'industrial',
    };

    return calculateTotalBV(config);
  }

  /**
   * Extract weapon entries from mech equipment for BV calculation.
   * Passes all equipment IDs — calculateTotalBV's internal resolver
   * handles filtering weapons vs ammo vs misc.
   */
  private extractWeapons(
    mech: IEditableMech,
  ): Array<{ id: string; rear?: boolean }> {
    return mech.equipment.map((slot) => ({
      id: slot.equipmentId,
      rear: false,
    }));
  }

  /**
   * Calculate C-Bill cost using TechManual formula
   * Total Cost = (Structure + Engine + Gyro + Cockpit + Armor + Equipment) × Tech Multiplier
   */
  calculateCost(mech: IEditableMech): number {
    const structureCost =
      mech.tonnage *
      STRUCTURE_COST_BASE *
      getStructureCostMultiplier(mech.structureType);
    const engineCost =
      mech.engineRating *
      ENGINE_COST_BASE *
      getEngineCostMultiplier(mech.engineType);
    const gyroCost =
      mech.engineRating * GYRO_COST_BASE * getGyroCostMultiplier(mech.gyroType);

    const cockpitCost = getCockpitCost(mech.cockpitType);

    const armorWeight = calculateArmorWeight(mech);
    const armorCost =
      armorWeight * ARMOR_COST_BASE * getArmorCostMultiplier(mech.armorType);

    const registry = getEquipmentRegistry();
    let equipmentCost = 0;
    for (const slot of mech.equipment) {
      const result = registry.lookup(slot.equipmentId);
      if (result.found && result.equipment && 'cost' in result.equipment) {
        equipmentCost += (result.equipment as { cost: number }).cost;
      }
    }

    const integralHeatSinks = Math.floor(
      mech.engineRating / ENGINE_INTEGRAL_HEAT_SINK_DIVISOR,
    );
    const externalHeatSinks = Math.max(
      0,
      mech.heatSinkCount - integralHeatSinks,
    );
    const heatSinkCostPer = isDoubleHeatSink(mech.heatSinkType)
      ? HEAT_SINK_COST_DOUBLE
      : HEAT_SINK_COST_SINGLE;
    const heatSinkCost = externalHeatSinks * heatSinkCostPer;

    const baseCost =
      structureCost +
      engineCost +
      gyroCost +
      cockpitCost +
      armorCost +
      equipmentCost +
      heatSinkCost;

    return Math.round(baseCost * MECH_CONSTRUCTION_MULTIPLIER);
  }

  calculateHeatProfile(mech: IEditableMech): IHeatProfile {
    const heatSinkCapacity = isDoubleHeatSink(mech.heatSinkType)
      ? HEAT_SINK_CAPACITY_DOUBLE
      : HEAT_SINK_CAPACITY_SINGLE;
    const heatDissipated = mech.heatSinkCount * heatSinkCapacity;

    const registry = getEquipmentRegistry();

    if (!registry.isReady()) {
      registry.initialize().catch((error) => {
        logger.error('Failed to initialize equipment registry', error);
      });
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

    const jumpMP = extractJumpMP(mech);

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
    const runMP = Math.floor(walkMP * 1.5);
    const jumpMP = extractJumpMP(mech);

    return {
      walkMP,
      runMP,
      jumpMP,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateComponentWeights(
    mech: IEditableMech,
  ): Record<string, number> {
    return {
      structure: mech.tonnage * 0.1,
      engine: this.getEngineWeight(mech.engineRating, mech.engineType),
      gyro: Math.ceil(mech.engineRating / 100),
      cockpit: 3,
      armor: calculateArmorWeight(mech),
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
}

// Singleton instance with lazy initialization
const calculationServiceFactory: SingletonFactory<CalculationService> =
  createSingleton((): CalculationService => new CalculationService());

export function getCalculationService(): CalculationService {
  return calculationServiceFactory.get();
}

export function resetCalculationService(): void {
  calculationServiceFactory.reset();
}

/** @internal Legacy alias */
export function _resetCalculationService(): void {
  calculationServiceFactory.reset();
}

// Legacy export for backward compatibility
// @deprecated Use getCalculationService() instead
export const calculationService = getCalculationService();
