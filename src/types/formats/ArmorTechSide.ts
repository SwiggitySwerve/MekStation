/**
 * Armor technology level -> side. `mtf-component-vocabulary.json`
 * (`clanTechLevels`) is the one owner, read here and by the Python converter
 * (`enum_mapping_tables.CLAN_TECH_LEVELS`).
 *
 * MegaMek 48fcb2f64: `ArmorType.forEntity` (ArmorType.java:96-101) weighs the
 * Clan ArmorType when `TechConstants.isClan` (TechConstants.java:394-399)
 * holds for the location's armor technology level.
 */
import vocabulary from './mtf-component-vocabulary.json';

const CLAN_TECH_LEVELS: ReadonlySet<number> = new Set(
  vocabulary.clanTechLevels.levels,
);

export function isClanTechLevel(level: number): boolean {
  return CLAN_TECH_LEVELS.has(level);
}
