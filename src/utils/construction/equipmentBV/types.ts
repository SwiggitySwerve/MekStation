/**
 * Equipment BV Resolver - Type Definitions
 *
 * Core types for equipment catalog entries, BV resolution results, and internal data structures.
 */

/**
 * Result of resolving an equipment ID to BV and heat values.
 */
export interface EquipmentBVResult {
  battleValue: number;
  heat: number;
  resolved: boolean;
}

/**
 * A single equipment entry from the catalog.
 * Represents a canonical equipment definition with BV, heat, and metadata.
 */
export interface EquipmentCatalogEntry {
  id: string;
  name: string;
  category: string;
  subType?: string;
  techBase: string;
  heat?: number;
  weight?: number;
  criticalSlots?: number;
  /** Java getIntroductionDate: prototype date, minus 5 when flagged approximate (TechAdvancement.java:731). */
  introductionYear?: number;
  special?: readonly string[];
  /**
   * Unit types the pinned Java registry allows the weapon on (EquipmentFacts.java
   * `allowedUnitTypes`, from F_PROTO_WEAPON and the other weapon flags). Absent
   * for entries the registry did not describe, including all non-weapons.
   */
  allowedUnitTypes?: readonly string[];
  variableEquipmentId?: string;
  battleValue: number;
  damage?: number | string;
  shotsPerTon?: number;
}

/**
 * Result of resolving an ammo ID to BV and weapon type.
 */
export interface AmmoBVResult {
  battleValue: number;
  weaponType: string;
  resolved: boolean;
}

/**
 * Internal: Raw catalog file structure from JSON imports.
 */
export interface RawCatalogFile {
  items?: Array<Record<string, unknown>>;
}

/**
 * Internal: Name mappings source structure (from name-mappings.json).
 */
export interface NameMappingsSource {
  $schema?: string;
  [key: string]: string | undefined;
}
