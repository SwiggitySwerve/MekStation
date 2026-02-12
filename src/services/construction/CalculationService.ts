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

// =============================================================================
// TYPE-SAFE HELPER FUNCTIONS
// Handle both enum values and legacy string values for backward compatibility
// =============================================================================

/**
 * Check if a heat sink type is a double heat sink variant
 */
function isDoubleHeatSink(heatSinkType: HeatSinkType | string): boolean {
  if (
    heatSinkType === HeatSinkType.DOUBLE_IS ||
    heatSinkType === HeatSinkType.DOUBLE_CLAN
  ) {
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
  const typeStr =
    typeof engineType === 'string' ? engineType.toLowerCase() : engineType;

  // Check enum values first
  if (engineType === EngineType.XL_IS || engineType === EngineType.XL_CLAN)
    return 2.0;
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
  if (cockpitType === CockpitType.COMMAND_CONSOLE)
    return COCKPIT_COST_COMMAND_CONSOLE;

  if (typeof cockpitType === 'string') {
    const typeStr = cockpitType.toLowerCase();
    if (typeStr.includes('small')) return COCKPIT_COST_SMALL;
    if (typeStr.includes('command')) return COCKPIT_COST_COMMAND_CONSOLE;
  }

  return COCKPIT_COST_STANDARD;
}

function normalizeBVType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Get structure cost multiplier based on structure type
 */
function getStructureCostMultiplier(
  structureType: InternalStructureType | string,
): number {
  if (
    structureType === InternalStructureType.ENDO_STEEL_IS ||
    structureType === InternalStructureType.ENDO_STEEL_CLAN
  )
    return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  if (structureType === InternalStructureType.ENDO_COMPOSITE)
    return STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE;

  if (typeof structureType === 'string') {
    if (structureType.toLowerCase().includes('endo'))
      return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  }

  return STRUCTURE_COST_MULTIPLIER_STANDARD;
}

/**
 * Get armor cost multiplier based on armor type
 */
function getArmorCostMultiplier(armorType: ArmorTypeEnum | string): number {
  if (
    armorType === ArmorTypeEnum.FERRO_FIBROUS_IS ||
    armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN ||
    armorType === ArmorTypeEnum.LIGHT_FERRO ||
    armorType === ArmorTypeEnum.HEAVY_FERRO
  )
    return ARMOR_COST_MULTIPLIER_FERRO_FIBROUS;
  if (armorType === ArmorTypeEnum.STEALTH) return ARMOR_COST_MULTIPLIER_STEALTH;
  if (armorType === ArmorTypeEnum.REACTIVE)
    return ARMOR_COST_MULTIPLIER_REACTIVE;
  if (armorType === ArmorTypeEnum.REFLECTIVE)
    return ARMOR_COST_MULTIPLIER_REFLECTIVE;

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
      totalArmorPoints: this.calculateTotalArmorPoints(mech),
      totalStructurePoints: this.calculateTotalStructurePoints(mech),
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
   * Calculate total structure points for the mech
   */
  private calculateTotalStructurePoints(mech: IEditableMech): number {
    const locations = [
      'head',
      'centerTorso',
      'leftTorso',
      'rightTorso',
      'leftArm',
      'rightArm',
      'leftLeg',
      'rightLeg',
    ];
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

    const armorWeight = this.calculateArmorWeight(mech);
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

    const jumpJetIds = [
      'jump-jet',
      'jump-jet-light',
      'jump-jet-medium',
      'jump-jet-heavy',
      'improved-jump-jet',
      'improved-jump-jet-light',
      'improved-jump-jet-medium',
      'improved-jump-jet-heavy',
    ];
    const jumpMP = mech.equipment.filter((eq) =>
      jumpJetIds.some((id) =>
        eq.equipmentId.toLowerCase().includes(id.toLowerCase()),
      ),
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
    const jumpJetIds = [
      'jump-jet',
      'jump-jet-light',
      'jump-jet-medium',
      'jump-jet-heavy',
      'improved-jump-jet',
      'improved-jump-jet-light',
      'improved-jump-jet-medium',
      'improved-jump-jet-heavy',
    ];
    const jumpMP = mech.equipment.filter((eq) =>
      jumpJetIds.some((id) =>
        eq.equipmentId.toLowerCase().includes(id.toLowerCase()),
      ),
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

  private calculateComponentWeights(
    mech: IEditableMech,
  ): Record<string, number> {
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
    return Math.ceil((totalPoints / 16) * 2) / 2;
  }

  private calculateTotalArmorPoints(mech: IEditableMech): number {
    const a = mech.armorAllocation;
    return (
      a.head +
      a.centerTorso +
      a.centerTorsoRear +
      a.leftTorso +
      a.leftTorsoRear +
      a.rightTorso +
      a.rightTorsoRear +
      a.leftArm +
      a.rightArm +
      a.leftLeg +
      a.rightLeg
    );
  }

  /**
   * Calculate maximum armor points from internal structure
   * Per TechManual: max armor = 2 × structure points (head = 9)
   */
  private calculateMaxArmorPoints(tonnage: number): number {
    const locations = [
      'head',
      'centerTorso',
      'leftTorso',
      'rightTorso',
      'leftArm',
      'rightArm',
      'leftLeg',
      'rightLeg',
    ];
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
