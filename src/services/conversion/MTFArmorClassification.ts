/** Armor export families, not a second armor-name table.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/armor-system/spec.md
 * MegaMek 48fcb2f64: Mek.java:5385-5403 owns mech MTF armor;
 * BLKFile.java:919-975,1060-1061 owns the other families' BLK armor.
 * Family readers: BLKBattleArmorFile.java:141-146,
 * BLKAeroSpaceFighterFile.java:148-164, BLKProtoMekFile.java:123-133,
 * BLKFile.java:493-525 (support-vehicle BAR).
 * The families are owned by the `armor` section of the shared vocabulary file
 * (src/types/formats/ArmorIdentity.ts reads it); this module only exposes them
 * keyed by tag. The contract test compares every entry with the loader's
 * canonical enum, and armorIdentity.test.ts checks the rows themselves.
 */
import {
  ARMOR_IDENTITY_ROWS,
  type ArmorExportFamily,
} from '@/types/formats/ArmorIdentity';

export const ARMOR_EXPORT_FAMILIES: Readonly<
  Record<string, ArmorExportFamily>
> = Object.fromEntries(ARMOR_IDENTITY_ROWS.map((row) => [row.tag, row.family]));
