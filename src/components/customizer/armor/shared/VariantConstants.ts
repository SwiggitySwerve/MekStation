/**
 * Armor Diagram Variant Constants
 *
 * Centralized constants for variant IDs and display names.
 * Using constants prevents typos and ensures consistency across the codebase.
 */

import { ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

/**
 * Variant IDs - internal identifiers used in code and storage
 */
export const VARIANT_IDS = {
  STANDARD: 'clean-tech' as const,
  GLOW: 'neon-operator' as const,
  HUD: 'tactical-hud' as const,
  CHROMATIC: 'premium-material' as const,
  MEGAMEK: 'megamek' as const,
} satisfies Record<string, ArmorDiagramVariant>;

/**
 * Variant display names - shown to users in the UI
 */
export const VARIANT_NAMES: Record<ArmorDiagramVariant, string> = {
  'clean-tech': 'Standard',
  'neon-operator': 'Glow',
  'tactical-hud': 'HUD',
  'premium-material': 'Chromatic',
  'megamek': 'MegaMek',
};

/**
 * Variant descriptions - brief description for each style
 */
export const VARIANT_DESCRIPTIONS: Record<ArmorDiagramVariant, string> = {
  'clean-tech': 'Clean design with solid colors',
  'neon-operator': 'Sci-fi aesthetic with neon lighting',
  'tactical-hud': 'Military-style LED readouts',
  'premium-material': 'Chrome textures with 3D depth',
  'megamek': 'Authentic record sheet style',
};

/**
 * All available variants in display order
 */
export const ALL_VARIANTS: ArmorDiagramVariant[] = [
  VARIANT_IDS.STANDARD,
  VARIANT_IDS.GLOW,
  VARIANT_IDS.HUD,
  VARIANT_IDS.CHROMATIC,
  VARIANT_IDS.MEGAMEK,
];

/**
 * Default variant to use when none is specified
 */
export const DEFAULT_VARIANT: ArmorDiagramVariant = VARIANT_IDS.STANDARD;

/**
 * Get the display name for a variant
 */
export function getVariantName(variant: ArmorDiagramVariant): string {
  return VARIANT_NAMES[variant] ?? VARIANT_NAMES[DEFAULT_VARIANT];
}

/**
 * Get the description for a variant
 */
export function getVariantDescription(variant: ArmorDiagramVariant): string {
  return VARIANT_DESCRIPTIONS[variant] ?? VARIANT_DESCRIPTIONS[DEFAULT_VARIANT];
}
