import { CockpitType } from '@/types/construction/CockpitType';
import { GyroType } from '@/types/construction/GyroType';
import { TechBase } from '@/types/enums/TechBase';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  convertArmorData,
  convertCriticalEntries,
  convertEquipmentItems,
  convertFluffData,
  convertMovementData,
  generateUnitId,
} from './UnitFormatConverterHelpers';
import {
  BatchConversionResult,
  ConversionResult,
  ConversionWarning,
  MegaMekLabUnit,
} from './UnitFormatConverterTypes';
import {
  mapTechBase,
  mapRulesLevel,
  mapEra,
  extractYear,
  mapEngineType,
  mapStructureType,
  mapHeatSinkType,
  mapMechConfiguration,
  isOmniMechConfig,
} from './ValueMappings';

export type {
  BatchConversionResult,
  ConversionResult,
  ConversionWarning,
  MegaMekLabEquipmentItem,
  MegaMekLabFluff,
  MegaMekLabManufacturer,
  MegaMekLabSystemManufacturer,
  MegaMekLabUnit,
} from './UnitFormatConverterTypes';

export class UnitFormatConverter {
  private warnings: ConversionWarning[] = [];
  private errors: string[] = [];

  convert(source: MegaMekLabUnit): ConversionResult {
    this.warnings = [];
    this.errors = [];

    try {
      const unit = this.convertUnit(source);

      return {
        success: true,
        unit,
        warnings: this.warnings,
        errors: this.errors,
      };
    } catch (error) {
      return {
        success: false,
        unit: null,
        warnings: this.warnings,
        errors: [
          ...this.errors,
          error instanceof Error ? error.message : String(error),
        ],
      };
    }
  }

  convertBatch(sources: MegaMekLabUnit[]): BatchConversionResult {
    const results: ConversionResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const source of sources) {
      const result = this.convert(source);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      total: sources.length,
      successful,
      failed,
      results,
    };
  }

  private convertUnit(source: MegaMekLabUnit): ISerializedUnit {
    const id = generateUnitId(source);
    const techBase = mapTechBase(source.tech_base);
    const era = mapEra(source.era);
    const year = extractYear(source.era);
    const rulesLevel = mapRulesLevel(source.rules_level);
    const configuration = mapMechConfiguration(source.config);
    const isOmni =
      isOmniMechConfig(source.config) || source.is_omnimech === true;

    const engine = this.convertEngine(source.engine, techBase);
    const gyro = this.convertGyro(source, techBase);
    const structure = this.convertStructure(source.structure, techBase);
    const armor = convertArmorData(source.armor, techBase);
    const heatSinks = this.convertHeatSinks(
      source.heat_sinks,
      source.engine.rating,
      techBase,
    );
    const movement = convertMovementData(source);
    const equipment = convertEquipmentItems(
      source.weapons_and_equipment,
      techBase,
      (warning) => {
        this.warnings.push(warning);
      },
    );
    const criticalSlots = convertCriticalEntries(source.criticals);
    const fluff = convertFluffData(source);

    return {
      id,
      chassis: source.chassis,
      model: source.model,
      variant: source.clanname || source.omnimech_configuration,
      unitType: isOmni ? 'OmniMech' : 'BattleMech',
      configuration,
      techBase,
      rulesLevel,
      era,
      year,
      tonnage: source.mass,
      engine,
      gyro,
      cockpit: this.convertCockpit(source),
      structure,
      armor,
      heatSinks,
      movement,
      equipment,
      criticalSlots,
      quirks: source.quirks,
      fluff,
    };
  }

  private convertEngine(
    source: { type: string; rating: number; manufacturer?: string },
    techBase: TechBase,
  ): { type: string; rating: number } {
    const engineType = mapEngineType(source.type, techBase);
    return {
      type: engineType,
      rating: source.rating,
    };
  }

  private convertGyro(
    _source: MegaMekLabUnit,
    _techBase: TechBase,
  ): { type: string } {
    return {
      type: GyroType.STANDARD,
    };
  }

  private convertCockpit(_source: MegaMekLabUnit): string {
    return CockpitType.STANDARD;
  }

  private convertStructure(
    source: { type: string; manufacturer?: string | null },
    techBase: TechBase,
  ): { type: string } {
    const structureType = mapStructureType(source.type, techBase);
    return {
      type: structureType,
    };
  }

  private convertHeatSinks(
    source: { type: string; count: number },
    _engineRating: number,
    techBase: TechBase,
  ): { type: string; count: number } {
    const heatSinkType = mapHeatSinkType(source.type, techBase);

    return {
      type: heatSinkType,
      count: source.count,
    };
  }
}

export const unitFormatConverter = new UnitFormatConverter();
