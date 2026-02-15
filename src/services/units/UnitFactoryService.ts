/**
 * Unit Factory Service
 *
 * Converts ISerializedUnit to runtime IBattleMech objects.
 * Handles equipment resolution, validation, and derived value calculation.
 *
 * @module services/units/UnitFactoryService
 */

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import {
  IBattleMech,
  IUnitMetadata,
  IEngineConfiguration,
  IGyroConfiguration,
  IStructureConfiguration,
  IHeatSinkConfiguration,
  IMovementConfiguration,
  UnitType,
} from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  parseEngineType,
  parseGyroType,
  parseCockpitType,
  parseStructureType,
  parseArmorType,
  parseHeatSinkType,
  parseTechBase,
  parseRulesLevel,
  parseEra,
  parseMechConfiguration,
  getWeightClass,
} from './EnumParserRegistry';
import {
  buildEquipmentList,
  buildCriticalSlots,
} from './UnitFactoryService.builders';
import {
  calculateGyroWeight,
  buildStructurePoints,
  buildArmorAllocation,
  calculateTotalArmor,
  calculateTotalWeight,
} from './UnitFactoryService.calculations';

/**
 * Factory result
 */
export interface IUnitFactoryResult {
  readonly success: boolean;
  readonly unit: IBattleMech | null;
  readonly errors: string[];
  readonly warnings: string[];
}

export class UnitFactoryService {
  constructor() {}

  createFromSerialized(data: ISerializedUnit): IUnitFactoryResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const techBase = parseTechBase(data.techBase);
      const rulesLevel = parseRulesLevel(data.rulesLevel);
      const era = parseEra(data.era);
      const configuration = parseMechConfiguration(data.configuration);
      const weightClass = getWeightClass(data.tonnage);

      const extendedData = data as ISerializedUnit & {
        source?: string;
        role?: string;
        mulId?: number;
      };

      const metadata: IUnitMetadata = {
        chassis: data.chassis,
        model: data.model,
        variant: data.variant,
        source: extendedData.source,
        era,
        year: data.year,
        rulesLevel,
        role: extendedData.role,
        manufacturer: data.fluff?.manufacturer,
        primaryFactory: data.fluff?.primaryFactory,
      };

      const engine: IEngineConfiguration = {
        type: parseEngineType(data.engine.type),
        rating: data.engine.rating,
        integralHeatSinks: Math.floor(data.engine.rating / 25),
      };

      const gyro: IGyroConfiguration = {
        type: parseGyroType(data.gyro.type),
        weight: calculateGyroWeight(
          data.engine.rating,
          parseGyroType(data.gyro.type),
        ),
      };

      const structurePoints = buildStructurePoints(data.tonnage);
      const structure: IStructureConfiguration = {
        type: parseStructureType(data.structure.type),
        points: structurePoints,
      };

      const heatSinks: IHeatSinkConfiguration = {
        type: parseHeatSinkType(data.heatSinks.type),
        total: data.heatSinks.count,
        integrated: engine.integralHeatSinks,
        external: Math.max(0, data.heatSinks.count - engine.integralHeatSinks),
      };

      const movement: IMovementConfiguration = {
        walkMP: data.movement.walk,
        runMP: Math.ceil(data.movement.walk * 1.5),
        jumpMP: data.movement.jump,
        jumpJetType: data.movement.jumpJetType,
        hasMASC: data.movement.enhancements?.includes('MASC') || false,
        hasSupercharger:
          data.movement.enhancements?.includes('Supercharger') || false,
        hasTSM: data.movement.enhancements?.includes('TSM') || false,
      };

      const armorAllocation = buildArmorAllocation(data.armor.allocation);
      const totalArmorPoints = calculateTotalArmor(armorAllocation);

      const equipment = buildEquipmentList(data.equipment);

      const criticalSlots = buildCriticalSlots(data.criticalSlots);

      const totalWeight = calculateTotalWeight(data, engine, gyro, heatSinks);
      const remainingTonnage = data.tonnage - totalWeight;

      // Build the mech
      const mech: IBattleMech = {
        id: data.id,
        name: `${data.chassis} ${data.model}`,
        techBase,
        rulesLevel,
        introductionYear: data.year,
        era,
        unitType: UnitType.BATTLEMECH,
        configuration,
        tonnage: data.tonnage,
        weightClass,
        metadata,
        engine,
        gyro,
        cockpitType: parseCockpitType(data.cockpit),
        structure,
        armorType: parseArmorType(data.armor.type),
        armorAllocation,
        totalArmorPoints,
        heatSinks,
        movement,
        equipment,
        criticalSlots,
        quirks: data.quirks,
        totalWeight,
        remainingTonnage,
        isValid: errors.length === 0 && remainingTonnage >= 0,
        validationErrors: errors,
        cost: 0, // Would need full cost calculation
        battleValue: 0, // Would need full BV calculation
      };

      return {
        success: true,
        unit: mech,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Factory error: ${e}`);
      return {
        success: false,
        unit: null,
        errors,
        warnings,
      };
    }
  }
}

const unitFactoryServiceFactory: SingletonFactory<UnitFactoryService> =
  createSingleton((): UnitFactoryService => new UnitFactoryService());

/**
 * Convenience function to get the factory instance
 */
export function getUnitFactory(): UnitFactoryService {
  return unitFactoryServiceFactory.get();
}

/**
 * Reset the singleton (for testing)
 */
export function resetUnitFactory(): void {
  unitFactoryServiceFactory.reset();
}
