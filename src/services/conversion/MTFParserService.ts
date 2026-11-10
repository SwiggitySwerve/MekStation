import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { isClanSourceChassis } from '@/services/units/handlers/unitHandlerShared';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { parseStructure } from './MTFParser.components';
import { mapConfiguration } from './MTFParser.mapping';
import { appendSourceWeapons } from './MTFParser.sourceEquipment';
import {
  generateUnitId,
  mapArmorType,
  mapCockpitType,
  mapEngineType,
  mapEraFromYear,
  mapGyroType,
  mapHeatSinkType,
  mapRulesLevel,
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

/** Why a source component did not become its own identity. Saved with the
 * unit in `mtfSource.diagnostics`, so the fact survives save and reopen. */
export interface IMTFSourceDiagnostic {
  readonly field: 'gyro' | 'cockpit' | 'heatSinks';
  /** The source text, exactly as declared. */
  readonly raw: string;
  /** What the unit holds instead. */
  readonly applied: string;
  /** `java-default`: the pinned loader substitutes a default for this string.
   * `no-editor-identity`: Java has an identity the editor cannot hold yet.
   * `unsupported`: Java loads a type the contract cannot represent. */
  readonly reason: 'java-default' | 'no-editor-identity' | 'unsupported';
  readonly javaRef: string;
}

export interface IMTFParsedUnit extends ISerializedUnit {
  readonly mtfSource: {
    readonly text: string;
    readonly configuration: string;
    readonly engine?: string;
    readonly armor?: string;
    /** Raw `gyro:`, `cockpit:` and `heat sinks:` values, kept beside the
     * derived identities. Absent when the line is absent or blank. */
    readonly gyro?: string;
    readonly cockpit?: string;
    readonly heatSinks?: string;
    /** Present only when the loader had to default or stand in for a value. */
    readonly diagnostics?: readonly IMTFSourceDiagnostic[];
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
      const parsedStructure = parseStructure(lines, header.config, structure);
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
      const gyroName = parseField(lines, 'gyro') ?? '';
      const cockpitName = parseField(lines, 'cockpit') ?? '';
      const heatSinkLine = parseField(lines, 'heat sinks') ?? '';
      const diagnostics: IMTFSourceDiagnostic[] = [];
      const cockpitRef = 'MtfFile.java:262-269; Mek.java:4935-4950';
      // mek.isClan() in the pinned loader: Clan, or Mixed with a Clan chassis
      // (MtfFile.java:848-890).
      const clanUnit = isClanSourceChassis(header.techBase.trim());
      const gyro = mapGyroType(gyroName);
      const cockpit = mapCockpitType(cockpitName);
      const heatSink = mapHeatSinkType(heatSinks.type, clanUnit);
      const cockpitType = cockpit.type;
      if (header.config.includes('FrankenMek')) {
        warnings.push(`Unsupported MTF configuration: ${header.config}`);
      }
      if (engineType.startsWith('UNSUPPORTED_ENGINE:')) {
        warnings.push(`Unsupported MTF engine: ${engine.type}`);
      }
      if (armorType.startsWith('UNSUPPORTED_ARMOR:')) {
        warnings.push(`Unsupported MTF armor: ${armor.type}`);
      }
      // The pinned loader substitutes a default for an unrecognised string
      // instead of refusing the file; so does the importer, and it says so in
      // the import result and on the unit itself (mtfSource.diagnostics).
      if (gyro.defaulted) {
        warnings.push(
          `Unsupported MTF gyro "${gyroName}" loaded as Standard (MtfFile.java:252-259)`,
        );
        diagnostics.push({
          field: 'gyro',
          raw: gyroName,
          applied: gyro.type,
          reason: 'java-default',
          javaRef: 'MtfFile.java:252-259',
        });
      }
      if (cockpit.defaulted) {
        warnings.push(
          `Unsupported MTF cockpit "${cockpitName}" loaded as Standard (MtfFile.java:262-269)`,
        );
        diagnostics.push({
          field: 'cockpit',
          raw: cockpitName,
          applied: cockpitType,
          reason: 'java-default',
          javaRef: cockpitRef,
        });
      }
      if (cockpit.degraded) {
        warnings.push(
          `MTF cockpit "${cockpitName}" has no editor identity yet and loads as Standard`,
        );
        diagnostics.push({
          field: 'cockpit',
          raw: cockpitName,
          applied: cockpitType,
          reason: 'no-editor-identity',
          javaRef: cockpitRef,
        });
      }
      if (cockpitType.startsWith('UNSUPPORTED_COCKPIT:')) {
        warnings.push(`Unsupported MTF cockpit: ${cockpitName}`);
        diagnostics.push({
          field: 'cockpit',
          raw: cockpitName,
          applied: cockpitType,
          reason: 'unsupported',
          javaRef: cockpitRef,
        });
      }
      if (heatSink.defaulted) {
        warnings.push(
          `Unsupported MTF heat sink "${heatSinks.type}" loaded as Single (MtfFile.java:566-598)`,
        );
        diagnostics.push({
          field: 'heatSinks',
          raw: heatSinkLine,
          applied: heatSink.type,
          reason: 'java-default',
          javaRef: 'MtfFile.java:566-598',
        });
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
          type: gyro.type,
        },
        cockpit: cockpitType,
        structure: parsedStructure,
        armor: {
          type: armorType,
          allocation: armor.allocation,
        },
        heatSinks: {
          type: heatSink.type,
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
        equipment: appendSourceWeapons(unit, warnings),
        mtfSource: {
          text: mtfContent,
          configuration: header.config,
          engine: parseField(lines, 'engine'),
          armor: parseField(lines, 'armor'),
          ...(gyroName ? { gyro: gyroName } : {}),
          ...(cockpitName ? { cockpit: cockpitName } : {}),
          ...(heatSinkLine ? { heatSinks: heatSinkLine } : {}),
          ...(diagnostics.length ? { diagnostics } : {}),
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
