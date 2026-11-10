/** Armor export families, not a second armor-name table.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/armor-system/spec.md
 * MegaMek 48fcb2f64: Mek.java:5385-5403 owns mech MTF armor;
 * BLKFile.java:919-975,1060-1061 owns the other families' BLK armor.
 * Family readers: BLKBattleArmorFile.java:141-146,
 * BLKAeroSpaceFighterFile.java:148-164, BLKProtoMekFile.java:123-133,
 * BLKFile.java:493-525 (support-vehicle BAR).
 * The contract test compares every entry with the loader's canonical enum.
 */
type ArmorExportFamily =
  | 'MTF:mech'
  | 'BLK:battle-armor'
  | 'BLK:aerospace'
  | 'BLK:protomech'
  | 'BLK:support-vehicle-BAR';

export const ARMOR_EXPORT_FAMILIES = {
  STANDARD: 'MTF:mech',
  FERRO_FIBROUS: 'MTF:mech',
  FERRO_FIBROUS_CLAN: 'MTF:mech',
  LIGHT_FERRO_FIBROUS: 'MTF:mech',
  HEAVY_FERRO_FIBROUS: 'MTF:mech',
  STEALTH: 'MTF:mech',
  REACTIVE: 'MTF:mech',
  REFLECTIVE: 'MTF:mech',
  HARDENED: 'MTF:mech',
  PRIMITIVE: 'MTF:mech',
  INDUSTRIAL: 'MTF:mech',
  HEAVY_INDUSTRIAL: 'MTF:mech',
  COMMERCIAL: 'MTF:mech',
  IMPACT_RESISTANT: 'MTF:mech',
  FERRO_LAMELLOR: 'MTF:mech',
  FIRE_RESISTANT: 'BLK:battle-armor',
  MIMETIC: 'BLK:battle-armor',
  STEALTH_IMPROVED: 'BLK:battle-armor',
  STEALTH_PROTOTYPE: 'BLK:battle-armor',
  REACTIVE_CLAN: 'MTF:mech',
  REFLECTIVE_CLAN: 'MTF:mech',
  BAR_2: 'BLK:support-vehicle-BAR',
  BAR_4: 'BLK:support-vehicle-BAR',
  BAR_5: 'BLK:support-vehicle-BAR',
  BAR_6: 'BLK:support-vehicle-BAR',
  BAR_7: 'BLK:support-vehicle-BAR',
  BAR_9: 'BLK:support-vehicle-BAR',
  BAR: 'BLK:support-vehicle-BAR',
  AEROSPACE: 'BLK:aerospace',
  PATCHWORK: 'MTF:mech',
  FERRO_ALUMINUM: 'BLK:aerospace',
  HEAVY_FERRO_ALUMINUM: 'BLK:aerospace',
  PRIMITIVE_AERO: 'BLK:aerospace',
  ANTI_PENETRATIVE_ABLATION: 'MTF:mech',
  BALLISTIC_REINFORCED: 'MTF:mech',
  BA_STANDARD_ADVANCED: 'BLK:battle-armor',
  BA_STANDARD_PROTOTYPE: 'BLK:battle-armor',
  BA_STEALTH_BASIC: 'BLK:battle-armor',
  ELECTRIC_DISCHARGE: 'BLK:protomech',
  FERRO_ALUMINUM_PROTO: 'BLK:aerospace',
  FERRO_CARBIDE: 'BLK:aerospace',
  FERRO_FIBROUS_PROTO: 'MTF:mech',
  HEAT_DISSIPATING: 'MTF:mech',
  IMPROVED_FERRO_ALUMINUM: 'BLK:aerospace',
  LAMELLOR_FERRO_CARBIDE: 'BLK:aerospace',
  LIGHT_FERRO_ALUMINUM: 'BLK:aerospace',
  STANDARD_PROTOMEK: 'BLK:protomech',
} as const satisfies Readonly<Record<string, ArmorExportFamily>>;
