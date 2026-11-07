import { BlkParserService } from '@/services/conversion/BlkParserService';
import { RULES_LEVEL_TAGS } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { importMTFDefinition } from './importMTFDefinition';

import { createProtoMechHandler } from './handlers/ProtoMechUnitHandler';
import { loadUnitDefinition } from './unitLoaderService/loadUnitDefinition';
import { PROTO_ARMOR_CODES } from './unitLoaderService/smallUnitDefinitionMapper';

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
  if (document.mappedUnitType !== UnitType.PROTOMECH)
    return fail(
      `Unsupported BLK unit type ${document.unitType}; only protomechs are supported`,
    );
  const handler = createProtoMechHandler();
  const result = handler.parse(document);
  if (!result.success)
    return fail('ProtoMech source loading failed', result.error.errors, [
      ...parsed.data.warnings,
      ...result.error.warnings,
    ]);
  const { unit } = result.data;
  const warnings = [...parsed.data.warnings, ...result.data.warnings];
  const diagnostics = handler.validate(unit);
  const definition = {
    ...unit,
    family: 'protomechs',
    chassis: document.name,
    model: document.model,
    year: document.year,
    mulId: document.mulId,
    techBase: Object.entries(TechBase).find(
      ([, value]) => value === unit.techBase,
    )?.[0],
    rulesLevel: RULES_LEVEL_TAGS[unit.rulesLevel],
    armor: {
      type: Object.entries(PROTO_ARMOR_CODES).find(
        ([, code]) => code === unit.armorType,
      )?.[0],
      byLocation: unit.armorByLocation,
    },
    movement: {
      ...unit.movement,
      cruiseMP: unit.cruiseMP,
      jumpMP: unit.jumpMP,
    },
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
    { source: 'custom', family: 'protomechs', id: unit.id },
  );
  if (!loaded.success)
    return fail(
      loaded.error,
      loaded.issues?.map((issue) => `${issue.path}: ${issue.message}`),
      warnings,
    );
  return { success: true, data: { definition: loaded.definition, warnings } };
}
