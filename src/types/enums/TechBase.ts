/**
 * TechBase - Technology base enumeration
 * Defines the technology base classification for components and equipment.
 *
 * @spec openspec/specs/core-enumerations/spec.md
 * @spec openspec/specs/validation-rules-master/spec.md (VAL-ENUM-001, VAL-ENUM-004)
 *
 * Per spec: Components MUST have binary tech base (Inner Sphere or Clan).
 * Mixed tech applies only to UNITS via TechBaseMode, not to components.
 */

/**
 * Technology base for components and equipment.
 * Per spec VAL-ENUM-001: Valid values are INNER_SPHERE or CLAN only.
 * Per spec VAL-ENUM-004: Components must have binary tech base, not MIXED.
 */
export enum TechBase {
  /** Inner Sphere technology */
  INNER_SPHERE = 'Inner Sphere',

  /** Clan technology */
  CLAN = 'Clan',
}

/**
 * Array of all valid TechBase values for iteration
 */
export const ALL_TECH_BASES: readonly TechBase[] = Object.freeze([
  TechBase.INNER_SPHERE,
  TechBase.CLAN,
]);

/**
 * Check if a value is a valid TechBase
 */
export function isValidTechBase(value: unknown): value is TechBase {
  return value === TechBase.INNER_SPHERE || value === TechBase.CLAN;
}

/**
 * Parse a string to TechBase, defaulting to INNER_SPHERE for invalid values.
 * Note: "Mixed", "BOTH", etc. from import sources default to INNER_SPHERE
 * because components must have binary tech base per spec VAL-ENUM-004.
 */
export function parseTechBase(value: string | undefined): TechBase {
  if (!value) return TechBase.INNER_SPHERE;

  const normalized = value.toUpperCase().trim();
  switch (normalized) {
    case 'CLAN':
      return TechBase.CLAN;
    case 'INNER_SPHERE':
    case 'IS':
    case 'INNERSPHERE':
    default:
      // Per spec: Components default to IS when source is ambiguous or mixed
      return TechBase.INNER_SPHERE;
  }
}
