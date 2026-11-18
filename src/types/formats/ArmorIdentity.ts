/**
 * Armor identity: the one owner is the `armor` section of
 * `mtf-component-vocabulary.json`, which the Python converter reads too
 * (`enum_mapping_tables.py`). One row per unit-contract `armor.type` tag:
 * the tag, the `ArmorTypeEnum` member key (null for a tag with no editor type),
 * the export family, and for `MTF:mech` rows the MTF names (`write`, the TS
 * `parse` key, and the exact `spellings` Python accepts).
 *
 * This module only reads the rows; it imports no enum, so the construction
 * types can read it without a cycle. Consumers derive from it or are
 * equality-tested against it (`__tests__/armorIdentity.test.ts`).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/armor-system/spec.md
 */
import vocabulary from './mtf-component-vocabulary.json';

export type ArmorExportFamily =
  | 'MTF:mech'
  | 'BLK:battle-armor'
  | 'BLK:aerospace'
  | 'BLK:protomech'
  | 'BLK:support-vehicle-BAR';

export interface IArmorIdentityRow {
  /** The unit-contract `armor.type` value. */
  readonly tag: string;
  /** The `ArmorTypeEnum` member KEY, or null when the tag has no editor type. */
  readonly enum: string | null;
  readonly family: ArmorExportFamily;
  /** Free text for a reader of the data (for example a deliberately empty `spellings`). */
  readonly note?: string;
  /** Present exactly on `MTF:mech` rows. */
  readonly mtf?: {
    /** The name the pinned writer emits (Mek.java:5385-5403). */
    readonly write: string;
    /** The normalised key the TypeScript parser accepts; null for a Clan variant reached by rule. */
    readonly parse: string | null;
    /** The exact strings the Python converter accepts. */
    readonly spellings: readonly string[];
  };
}

export const ARMOR_IDENTITY_ROWS: readonly IArmorIdentityRow[] = (
  vocabulary as unknown as { armor: IArmorIdentityRow[] }
).armor;

/** The contract tag of an `ArmorTypeEnum` member, by member KEY (not value). */
export function armorTagForEnumKey(key: string): string {
  const row = ARMOR_IDENTITY_ROWS.find((candidate) => candidate.enum === key);
  if (!row) throw new Error(`No armor identity row for enum member ${key}`);
  return row.tag;
}
