import { z } from 'zod';

import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { UnitContract } from '@/types/contracts';
import {
  CURRENT_UNIT_SCHEMA_VERSION,
  unitSchemaVersionOf,
} from '@/types/contracts/generated/unit.zod';
import {
  isUnitFamily,
  parseUnitReference,
  type UnitFamily,
} from '@/types/unit/UnitIndex';
import { toCanonicalJson } from '@/utils/events/hashUtils';

import { ARMOR_TYPE } from './CustomUnitSerializer.tags';

export type PortableUnitReference =
  | string
  | { readonly id: string; readonly family?: UnitFamily };

const record = z.record(z.string(), z.unknown());
type Document = z.infer<typeof record>;
const versionSchema = UnitContract.options[0].shape.schemaVersion;

function contractArmorType(value: unknown): unknown {
  const display = z.enum(ArmorTypeEnum).safeParse(value);
  return display.success ? ARMOR_TYPE[display.data] : value;
}

function assignFact(target: Document, key: string, value: unknown): void {
  if (value === undefined) return;
  if (
    target[key] !== undefined &&
    toCanonicalJson(target[key]) !== toCanonicalJson(value)
  )
    throw new Error(`Conflicting legacy ${key}`);
  target[key] = value;
}

/** Transport normalization only: never recalculate construction or cached BV. */
function migrateLegacy(input: Document, family: UnitFamily): Document {
  const result = { ...input };
  const allocationKey =
    family === 'vehicles' || family === 'protomechs'
      ? 'byLocation'
      : family === 'aerospace' || family === 'capital'
        ? 'byArc'
        : 'allocation';
  if (input.armor !== undefined || input.armorAllocation !== undefined) {
    const oldArmor = input.armor === undefined ? {} : record.parse(input.armor);
    const armor: Document =
      oldArmor.type === undefined &&
      input.armor !== undefined &&
      !['allocation', 'byLocation', 'byArc', 'perTrooper'].some(
        (key) => key in oldArmor,
      )
        ? { type: input.armorType ?? 'STANDARD', [allocationKey]: oldArmor }
        : { ...oldArmor, type: oldArmor.type ?? input.armorType ?? 'STANDARD' };
    armor.type = contractArmorType(armor.type);
    if (input.armorType !== undefined)
      assignFact(armor, 'type', contractArmorType(input.armorType));
    assignFact(armor, allocationKey, input.armorAllocation);
    if (allocationKey !== 'allocation' && armor.allocation !== undefined) {
      assignFact(armor, allocationKey, armor.allocation);
      delete armor.allocation;
    }
    if (family === 'vehicles' || family === 'aerospace') {
      const encoded =
        typeof armor.type === 'string'
          ? /^BAR_([0-9]+)$/.exec(armor.type)
          : null;
      if (encoded) {
        assignFact(armor, 'barRating', Number(encoded[1]));
        armor.type = 'BAR';
      }
      if (armor.type === 'BAR') {
        if (input.barRating !== null)
          assignFact(armor, 'barRating', input.barRating);
        const editor =
          family === 'vehicles' ? input.vehicleEditor : input.aerospaceEditor;
        if (editor !== undefined) {
          const rating = record.parse(editor).barRating;
          if (rating !== null) assignFact(armor, 'barRating', rating);
        }
        delete result.barRating;
      }
    }
    result.armor = armor;
    delete result.armorAllocation;
    delete result.armorType;
  }
  if (family === 'vehicles') {
    const retire = (value: Document) => {
      const copy = { ...value };
      for (const key of ['turret', 'secondaryTurret']) {
        if (copy[key] === undefined || copy[key] === null) continue;
        const turret = record.parse(copy[key]);
        delete turret.currentWeight;
        delete turret.maxWeight;
        copy[key] = turret;
      }
      return copy;
    };
    if (result.vehicleEditor !== undefined)
      result.vehicleEditor = retire(record.parse(result.vehicleEditor));
    return retire(result);
  }
  return result;
}

const migrations: Readonly<Record<string, typeof migrateLegacy>> = {
  unversioned: migrateLegacy,
  [CURRENT_UNIT_SCHEMA_VERSION]: migrateLegacy,
};

/** Explicit migration boundary; ordinary loader reads remain backward compatible. */
export function migratePortableUnitDocument(
  input: unknown,
  reference: PortableUnitReference,
) {
  const source = record.parse(input);
  const version = unitSchemaVersionOf({
    schemaVersion: versionSchema.parse(source.schemaVersion),
  });
  const ref =
    typeof reference === 'string' ? parseUnitReference(reference) : reference;
  const family = ref.family ?? 'battlemechs';
  if (
    !isUnitFamily(family) ||
    (source.family !== undefined && source.family !== family)
  )
    throw new Error('Unit reference family conflicts with document family');
  if (source.id !== ref.id)
    throw new Error('Unit reference identity conflicts with document id');
  const step =
    migrations[source.schemaVersion === undefined ? 'unversioned' : version];
  const migrated = step ? step(source, family) : source;
  const result = UnitContract.parse({
    ...migrated,
    schemaVersion: version,
    family,
  });
  if (!isDefinitionForFamily(family, result))
    throw new Error('Unit type conflicts with reference family');
  return result;
}

export function serializePortableUnitDocument(
  input: unknown,
  reference: PortableUnitReference,
): string {
  const migrated = migratePortableUnitDocument(input, reference);
  const current = migratePortableUnitDocument(
    { ...migrated, schemaVersion: CURRENT_UNIT_SCHEMA_VERSION },
    reference,
  );
  return JSON.stringify(current, null, 2) + '\n';
}
