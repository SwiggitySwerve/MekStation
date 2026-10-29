import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { mapConfiguration } from './MTFParser.mapping';
import {
  generateUnitId,
  mapArmorType,
  mapEngineType,
  mapEraFromYear,
  mapRulesLevel,
  mapStructureType,
  mapTechBase,
  parseArmor,
  parseCriticalSlots,
  parseEngine,
  parseField,
  parseFluff,
  parseHeader,
  parseHeatSinks,
  parseQuirks,
  parseWeaponQuirks,
  parseWeapons,
} from './MTFParserHelpers';

export interface IMTFParsedUnit extends ISerializedUnit {
  readonly mtfSource: {
    readonly text: string;
    readonly configuration: string;
    readonly engine?: string;
    readonly armor?: string;
  };
}

export interface IMTFParseResult {
  readonly success: boolean;
  readonly unit?: IMTFParsedUnit;
  readonly errors: string[];
  readonly warnings: string[];
}

export class MTFParserService {
  parse(mtfContent: string): IMTFParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const lines = mtfContent.split(/\r?\n/);

      const header = parseHeader(lines);
      if (!header.chassis) {
        errors.push('Missing required field: chassis');
        return { success: false, errors, warnings };
      }

      const mass = parseField(lines, 'mass');
      const engine = parseEngine(lines);
      const structure = parseField(lines, 'structure') || 'IS Standard';
      const heatSinks = parseHeatSinks(lines);
      const walkMP = parseInt(parseField(lines, 'walk mp') || '0', 10);
      const jumpMP = parseInt(parseField(lines, 'jump mp') || '0', 10);
      const armor = parseArmor(lines);
      const equipment = parseWeapons(lines);
      const criticalSlots = parseCriticalSlots(lines);
      const quirks = parseQuirks(lines);
      const weaponQuirks = parseWeaponQuirks(lines);
      const fluff = parseFluff(lines);

      const id = generateUnitId(header.chassis, header.model);
      const era = mapEraFromYear(header.year);
      const techBase = mapTechBase(header.techBase);
      const rulesLevel = mapRulesLevel(header.rulesLevel);
      const baseConfig = mapConfiguration(header.config);
      const engineType = mapEngineType(engine.type);
      const armorType = mapArmorType(armor.type);
      if (header.config.includes('FrankenMek')) {
        warnings.push(`Unsupported MTF configuration: ${header.config}`);
      }
      if (engineType.startsWith('UNSUPPORTED_ENGINE:')) {
        warnings.push(`Unsupported MTF engine: ${engine.type}`);
      }
      if (armorType.startsWith('UNSUPPORTED_ARMOR:')) {
        warnings.push(`Unsupported MTF armor: ${armor.type}`);
      }

      const unit: ISerializedUnit = {
        id,
        chassis: header.chassis,
        model: header.model,
        unitType: 'BattleMech',
        configuration: baseConfig,
        techBase,
        rulesLevel,
        era,
        year: header.year,
        tonnage: parseInt(mass || '0', 10),
        engine: {
          type: engineType,
          rating: engine.rating,
        },
        gyro: {
          type: 'STANDARD',
        },
        cockpit: 'STANDARD',
        structure: {
          type: mapStructureType(structure),
        },
        armor: {
          type: armorType,
          allocation: armor.allocation,
        },
        heatSinks: {
          type: heatSinks.type === 'Double' ? 'DOUBLE' : 'SINGLE',
          count: heatSinks.count,
        },
        movement: {
          walk: walkMP,
          jump: jumpMP,
        },
        equipment,
        criticalSlots,
        quirks: quirks.length > 0 ? quirks : undefined,
        weaponQuirks:
          Object.keys(weaponQuirks).length > 0 ? weaponQuirks : undefined,
        fluff: Object.keys(fluff).length > 0 ? fluff : undefined,
        isOmni: header.isOmni || undefined,
        baseChassisHeatSinks: header.baseChassisHeatSinks,
        clanName: header.clanname,
      };

      const extendedUnit = {
        ...unit,
        mtfSource: {
          text: mtfContent,
          configuration: header.config,
          engine: parseField(lines, 'engine'),
          armor: parseField(lines, 'armor'),
        },
        mulId: header.mulId,
        role: header.role,
        source: header.source,
      };

      return {
        success: true,
        unit: extendedUnit,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(`Parse error: ${e}`);
      return { success: false, errors, warnings };
    }
  }
}

const mtfParserServiceFactory: SingletonFactory<MTFParserService> =
  createSingleton((): MTFParserService => new MTFParserService());

export function getMTFParserService(): MTFParserService {
  return mtfParserServiceFactory.get();
}

export function resetMTFParserService(): void {
  mtfParserServiceFactory.reset();
}
