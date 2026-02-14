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
  battleValue: number;
  damage?: number | string;
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
