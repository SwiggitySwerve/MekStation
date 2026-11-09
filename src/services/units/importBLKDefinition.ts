import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import type { IUnitTypeHandler } from '@/types/unit/UnitTypeHandler';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { RULES_LEVEL_TAGS } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import armorCodes from '@/types/formats/blk-armor-codes.json';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { resolveBlkAerospaceHeatSinkType } from '@/utils/construction/aerospace/aerospaceBVUnitAdapter';

import type { importMTFDefinition } from './importMTFDefinition';

import { createAerospaceHandler } from './handlers/AerospaceUnitHandler';
import { createConventionalFighterHandler } from './handlers/ConventionalFighterUnitHandler';
import { FixedWingSupportUnitHandler } from './handlers/FixedWingSupportUnitHandler';
import { createProtoMechHandler } from './handlers/ProtoMechUnitHandler';
import { createSmallCraftHandler } from './handlers/SmallCraftUnitHandler';
import { createSupportVehicleHandler } from './handlers/SupportVehicleUnitHandler';
import { createVehicleHandler } from './handlers/VehicleUnitHandler';
import { createVTOLHandler } from './handlers/VTOLUnitHandler';
import { UNIT_DEFINITION_FAMILIES } from './unitLoaderService/definitionTypes';
import { loadUnitDefinition } from './unitLoaderService/loadUnitDefinition';
import { PROTO_ARMOR_CODES } from './unitLoaderService/smallUnitDefinitionMapper';

function parseWithDiagnostics<T extends IBaseUnit>(
  document: IBlkDocument,
  handler: IUnitTypeHandler<T>,
) {
  const result = handler.parse(document);
  return result.success
    ? {
        success: true as const,
        data: {
          ...result.data,
          diagnostics: handler.validate(result.data.unit),
        },
      }
    : result;
}

function parseSupportedDocument(document: IBlkDocument) {
  switch (document.mappedUnitType) {
    case UnitType.PROTOMECH:
      return parseWithDiagnostics(document, createProtoMechHandler());
    case UnitType.VEHICLE:
      return parseWithDiagnostics(document, createVehicleHandler());
    case UnitType.VTOL:
      return parseWithDiagnostics(document, createVTOLHandler());
    case UnitType.SUPPORT_VEHICLE:
      return parseWithDiagnostics(document, createSupportVehicleHandler());
    case UnitType.AEROSPACE:
      return parseWithDiagnostics(document, createAerospaceHandler());
    case UnitType.CONVENTIONAL_FIGHTER: {
      const fixedWingSupport = new FixedWingSupportUnitHandler();
      return parseWithDiagnostics(
        document,
        fixedWingSupport.canHandle(document)
          ? fixedWingSupport
          : createConventionalFighterHandler(),
      );
    }
    case UnitType.SMALL_CRAFT:
      return parseWithDiagnostics(document, createSmallCraftHandler());
    default:
      return undefined;
  }
}

/** Source/handler snapshots retain facts absent from the shared definition shape. */
export async function importBLKDefinition(
  sourceText: unknown,
): ReturnType<typeof importMTFDefinition> {
  const fail = (
    message: string,
    validationErrors: readonly string[] = [],
    warnings: readonly string[] = [],
  ) => ({
    success: false as const,
    error: { message, validationErrors, warnings },
  });
  if (typeof sourceText !== 'string' || !sourceText.trim())
    return fail('Missing or invalid field: sourceText');
  const parsed = new BlkParserService().parse(sourceText);
  if (!parsed.success)
    return fail(
      'BLK source parsing failed',
      parsed.error.errors,
      parsed.error.warnings,
    );
  const { document } = parsed.data;
  const result = parseSupportedDocument(document);
  if (!result)
    return fail(
      `Unsupported BLK unit type ${document.unitType}; only protomechs, vehicles and aerospace are supported`,
    );
  if (!result.success)
    return fail(
      `${document.unitType} source loading failed`,
      result.error.errors,
      [...parsed.data.warnings, ...result.error.warnings],
    );
  const { unit, diagnostics } = result.data;
  const isProtoMech = unit.unitType === UnitType.PROTOMECH;
  const isAerospace = UNIT_DEFINITION_FAMILIES.aerospace.unitTypes.some(
    (type) => type === unit.unitType,
  );
  const family = isProtoMech
    ? 'protomechs'
    : isAerospace
      ? 'aerospace'
      : 'vehicles';
  const warnings = [...parsed.data.warnings, ...result.data.warnings];
  const armorType = isProtoMech
    ? Object.entries(PROTO_ARMOR_CODES).find(
        ([, code]) => code === unit.armorType,
      )?.[0]
    : Object.entries(armorCodes).find(
        ([code]) => Number(code) === unit.armorType,
      )?.[1];
  const definition = {
    ...unit,
    family,
    chassis: document.name,
    model: document.model,
    year: document.year,
    mulId: document.mulId,
    techBase: Object.entries(TechBase).find(
      ([, value]) => value === unit.techBase,
    )?.[0],
    rulesLevel: RULES_LEVEL_TAGS[unit.rulesLevel],
    ...('heatSinks' in unit
      ? {
          heatSinks: {
            type: resolveBlkAerospaceHeatSinkType(unit.heatSinkType),
            count: unit.heatSinks,
          },
        }
      : {}),
    armor: {
      type: armorType,
      ...('armorByArc' in unit
        ? { byArc: unit.armorByArc }
        : { byLocation: unit.armorByLocation }),
      ...(armorType === 'BAR' && 'barRating' in unit
        ? { barRating: unit.barRating }
        : {}),
    },
    movement: isProtoMech
      ? {
          ...unit.movement,
          cruiseMP: unit.cruiseMP,
          jumpMP: unit.jumpMP,
        }
      : unit.movement,
    equipment: unit.equipment.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: mount.location,
    })),
    quirks: document.quirks,
    weaponQuirks: document.weaponQuirks,
    blkSource: {
      text: sourceText,
      document,
      handlerUnit: unit,
      diagnostics,
      warnings,
    },
  };
  const loaded = await loadUnitDefinition(
    { read: async () => definition },
    { source: 'custom', family, id: unit.id },
  );
  if (!loaded.success)
    return fail(
      loaded.error,
      loaded.issues?.map((issue) => `${issue.path}: ${issue.message}`),
      warnings,
    );
  return { success: true, data: { definition: loaded.definition, warnings } };
}
