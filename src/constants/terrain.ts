/**
 * Terrain Visual Constants
 *
 * Color mappings and visual properties for terrain rendering on hex maps.
 * Uses Tailwind-inspired colors for consistency with the design system.
 *
 * @spec openspec/specs/tactical-map-interface/spec.md
 */

import { TerrainType } from '../types/gameplay/TerrainTypes';

// =============================================================================
// Terrain Colors
// =============================================================================

/**
 * Color palette for terrain types.
 * Uses Tailwind-inspired colors for consistency with hex map styling.
 * Colors are chosen to be visually distinct and accessible.
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.Clear]: '#f0fdf4', // green-50 (very light green)
  [TerrainType.Pavement]: '#9ca3af', // gray-400
  [TerrainType.Road]: '#6b7280', // gray-500
  [TerrainType.LightWoods]: '#86efac', // green-300
  [TerrainType.HeavyWoods]: '#22c55e', // green-500
  [TerrainType.Rough]: '#d6d3d1', // stone-300
  [TerrainType.Rubble]: '#a8a29e', // stone-400
  [TerrainType.Water]: '#60a5fa', // blue-400
  [TerrainType.Sand]: '#fcd34d', // amber-300
  [TerrainType.Mud]: '#92400e', // amber-800
  [TerrainType.Snow]: '#f0f9ff', // sky-50
  [TerrainType.Ice]: '#bae6fd', // sky-200
  [TerrainType.Swamp]: '#65a30d', // lime-600
  [TerrainType.Building]: '#78716c', // stone-500
  [TerrainType.Bridge]: '#a1a1aa', // zinc-400
  [TerrainType.Fire]: '#f97316', // orange-500
  [TerrainType.Smoke]: '#737373', // neutral-500
};

// =============================================================================
// Water Depth Colors
// =============================================================================

/**
 * Water depth colors (gradient by depth level).
 * Provides visual feedback for water depth in tactical maps.
 * Deeper water is darker blue.
 */
export const WATER_DEPTH_COLORS: Record<number, string> = {
  0: '#bfdbfe', // blue-200 (shore/shallow)
  1: '#60a5fa', // blue-400 (depth 1)
  2: '#3b82f6', // blue-500 (depth 2)
  3: '#1d4ed8', // blue-700 (depth 3+)
};

// =============================================================================
// Terrain Layer Ordering
// =============================================================================

/**
 * Terrain render order (lower = rendered first, appears below).
 * Controls visual layering so water appears under woods, fire on top, etc.
 *
 * Layering strategy:
 * - 0: Water (base layer)
 * - 1: Base terrain (clear, sand, snow, ice)
 * - 2: Paved surfaces (pavement, roads)
 * - 3: Bridges (over water)
 * - 4-6: Difficult terrain (mud, swamp, rough, rubble)
 * - 7-8: Woods (light then heavy)
 * - 9: Buildings (structures)
 * - 10: Smoke (obscuring)
 * - 11: Fire (hazard, top layer)
 */
export const TERRAIN_LAYER_ORDER: Record<TerrainType, number> = {
  [TerrainType.Water]: 0,
  [TerrainType.Clear]: 1,
  [TerrainType.Sand]: 1,
  [TerrainType.Snow]: 1,
  [TerrainType.Ice]: 1,
  [TerrainType.Pavement]: 2,
  [TerrainType.Road]: 3,
  [TerrainType.Bridge]: 4,
  [TerrainType.Mud]: 5,
  [TerrainType.Swamp]: 5,
  [TerrainType.Rough]: 6,
  [TerrainType.Rubble]: 6,
  [TerrainType.LightWoods]: 7,
  [TerrainType.HeavyWoods]: 8,
  [TerrainType.Building]: 9,
  [TerrainType.Smoke]: 10,
  [TerrainType.Fire]: 11,
};

// =============================================================================
// Terrain Pattern Identifiers
// =============================================================================

/**
 * Terrain pattern identifiers for SVG pattern fills.
 * These correspond to SVG <pattern> definitions in the hex map renderer.
 * Only terrain types that benefit from visual patterns are included.
 *
 * Pattern usage:
 * - Woods: Diagonal lines or tree symbols
 * - Rough/Rubble: Scattered rocks or debris
 * - Buildings: Grid or brick pattern
 *
 * Terrain without patterns (e.g., water, clear) use solid colors only.
 */
export const TERRAIN_PATTERNS: Partial<Record<TerrainType, string>> = {
  [TerrainType.LightWoods]: 'pattern-light-woods',
  [TerrainType.HeavyWoods]: 'pattern-heavy-woods',
  [TerrainType.Rough]: 'pattern-rough',
  [TerrainType.Rubble]: 'pattern-rubble',
  [TerrainType.Building]: 'pattern-building',
};
