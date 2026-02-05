/**
 * Tech Base Utilities
 *
 * Helper functions for determining tech base properties from string names.
 * Used across unit cards, badges, and displays.
 *
 * @example
 * ```typescript
 * import { getTechBaseBadgeVariant, getTechBaseLabel } from '@/utils/techBase';
 *
 * const variant = getTechBaseBadgeVariant('Inner Sphere'); // 'amber'
 * const label = getTechBaseLabel('Inner Sphere'); // 'IS'
 * ```
 */

/**
 * Badge variant type for tech base colors.
 * Matches the Badge component's variant prop.
 */
export type TechBaseBadgeVariant = 'cyan' | 'amber' | 'slate';

/**
 * Check if a tech base name represents Inner Sphere technology
 */
export function isInnerSphere(techBaseName: string): boolean {
  const normalized = techBaseName.toLowerCase();
  return normalized.includes('inner sphere') || normalized === 'is';
}

/**
 * Check if a tech base name represents Clan technology
 */
export function isClan(techBaseName: string): boolean {
  return techBaseName.toLowerCase().includes('clan');
}

/**
 * Check if a tech base name represents Mixed technology
 */
export function isMixed(techBaseName: string): boolean {
  return techBaseName.toLowerCase().includes('mixed');
}

/**
 * Get the badge variant color for a tech base
 *
 * @param techBaseName - The tech base name (e.g., "Inner Sphere", "Clan", "Mixed")
 * @returns Badge variant: 'cyan' for Clan, 'amber' for IS, 'slate' for others
 */
export function getTechBaseBadgeVariant(
  techBaseName: string,
): TechBaseBadgeVariant {
  if (isClan(techBaseName)) return 'cyan';
  if (isInnerSphere(techBaseName)) return 'amber';
  return 'slate';
}

/**
 * Get a shortened display label for a tech base
 *
 * @param techBaseName - The tech base name (e.g., "Inner Sphere", "Clan", "Mixed")
 * @returns Short label: 'Clan', 'IS', or the original name for others
 */
export function getTechBaseLabel(techBaseName: string): string {
  if (isClan(techBaseName)) return 'Clan';
  if (isInnerSphere(techBaseName)) return 'IS';
  return techBaseName;
}

/**
 * Get both badge variant and label for a tech base
 * Convenience function to avoid duplicate normalization
 *
 * @param techBaseName - The tech base name
 * @returns Object with variant and label
 */
export function getTechBaseDisplay(techBaseName: string): {
  variant: TechBaseBadgeVariant;
  label: string;
} {
  return {
    variant: getTechBaseBadgeVariant(techBaseName),
    label: getTechBaseLabel(techBaseName),
  };
}
